import { Router } from 'express';
import type { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import prisma from '../db/client.js';
import type { ApiResponse, PtbResponse } from '../types/index.js';
import { AppError } from '../middleware/error.js';
import {
    buildPayDebtFullPtb,
    buildPayDebtPartialPtb,
    calculateInterest,
} from '../services/sui.js';
import { CONTRACT } from '../config/env.js';

const router = Router();

// Validation schemas
const payDebtSchema = z.object({
    debtId: z.string(),
    suiDebtObjectId: z.string(),
    suiBillObjectId: z.string(),
    paymentCoinId: z.string(),
    payFull: z.boolean().default(true),
});

const confirmPaymentSchema = z.object({
    debtId: z.string(),
    transactionDigest: z.string(),
    amountPaid: z.string(),
    suiDebtObjectId: z.string().optional(),
});

// POST /api/payments/pay - Generate PTB for single payment
router.post('/pay', async (req: Request, res: Response<ApiResponse<PtbResponse>>, next: NextFunction) => {
    try {
        const body = payDebtSchema.parse(req.body);

        // Verify debt exists
        const debt = await prisma.debt.findUnique({
            where: { id: body.debtId },
            include: { bill: true },
        });

        if (!debt) {
            throw new AppError('Debt not found', 404);
        }

        if (debt.isSettled) {
            throw new AppError('Debt already settled', 400);
        }

        // Build PTB
        const ptbBytes = body.payFull
            ? buildPayDebtFullPtb({
                debtId: body.suiDebtObjectId,
                billId: body.suiBillObjectId,
                paymentCoinId: body.paymentCoinId,
            })
            : buildPayDebtPartialPtb({
                debtId: body.suiDebtObjectId,
                billId: body.suiBillObjectId,
                paymentCoinId: body.paymentCoinId,
            });

        res.json({
            success: true,
            data: {
                transactionBytes: ptbBytes,
                message: body.payFull
                    ? 'Full payment transaction ready. Sign to complete.'
                    : 'Partial payment transaction ready. Sign to complete.',
            },
        });
    } catch (error) {
        next(error);
    }
});

// POST /api/payments/pay-all - Generate PTB for batch payment
router.post('/pay-all', async (req: Request, res: Response<ApiResponse<PtbResponse>>, next: NextFunction) => {
    try {
        const { telegramId } = req.body;

        // Find user
        const user = await prisma.user.findUnique({
            where: { telegramId: BigInt(telegramId) },
        });

        if (!user) {
            throw new AppError('User not found', 404);
        }

        // Get all unsettled debts
        const debts = await prisma.debt.findMany({
            where: {
                debtorId: user.id,
                isSettled: false,
                suiObjectId: { not: null },
            },
            include: { bill: true },
        });

        if (debts.length === 0) {
            throw new AppError('No outstanding debts to pay', 400);
        }

        // Note: For batch payments, we'd need to build a more complex PTB
        res.json({
            success: true,
            data: {
                transactionBytes: '',
                message: `Found ${debts.length} debts to pay. Batch payment PTB not yet implemented - pay individually.`,
            },
        });
    } catch (error) {
        next(error);
    }
});

// POST /api/payments/confirm - Confirm payment was made on-chain
router.post('/confirm', async (req: Request, res: Response<ApiResponse>, next: NextFunction) => {
    try {
        const body = confirmPaymentSchema.parse(req.body);

        const debt = await prisma.debt.findUnique({
            where: { id: body.debtId },
        });

        if (!debt) {
            throw new AppError('Debt not found', 404);
        }

        const amountPaid = BigInt(body.amountPaid);
        const newAmountPaid = debt.amountPaid + amountPaid;
        const isSettled = newAmountPaid >= debt.principalAmount;

        // Update debt record
        await prisma.debt.update({
            where: { id: body.debtId },
            data: {
                amountPaid: newAmountPaid,
                isSettled,
                suiObjectId: body.suiDebtObjectId || debt.suiObjectId,
            },
        });

        // Check if all debts for bill are settled
        if (isSettled) {
            const bill = await prisma.bill.findUnique({
                where: { id: debt.billId },
                include: { debts: true },
            });

            if (bill) {
                const allSettled = bill.debts.every((d: any) =>
                    d.id === body.debtId ? true : d.isSettled
                );

                if (allSettled) {
                    await prisma.bill.update({
                        where: { id: debt.billId },
                        data: { isSettled: true },
                    });
                }
            }
        }

        res.json({
            success: true,
            data: {
                debtId: body.debtId,
                amountPaid: amountPaid.toString(),
                totalPaid: newAmountPaid.toString(),
                isSettled,
                transactionDigest: body.transactionDigest,
            },
        });
    } catch (error) {
        next(error);
    }
});

// GET /api/payments/interest/:debtId - Calculate current interest
router.get('/interest/:debtId', async (req: Request, res: Response<ApiResponse>, next: NextFunction) => {
    try {
        const debtId = req.params.debtId;
        if (!debtId) throw new AppError('Debt ID required', 400);

        const debt = await prisma.debt.findUnique({
            where: { id: debtId },
            include: { bill: true },
        });

        if (!debt) {
            throw new AppError('Debt not found', 404);
        }

        // If we have Sui object IDs, calculate on-chain
        if (debt.suiObjectId && debt.bill.suiObjectId) {
            try {
                const result = await calculateInterest({
                    debtId: debt.suiObjectId,
                    billId: debt.bill.suiObjectId,
                });

                return res.json({
                    success: true,
                    data: {
                        interest: result.interest.toString(),
                        totalDue: result.totalDue.toString(),
                        source: 'on-chain',
                    },
                });
            } catch {
                // Fall through to off-chain calculation
            }
        }

        // Off-chain calculation
        const now = Date.now();
        const gracePeriodEnd = debt.bill.createdAt.getTime() + CONTRACT.GRACE_PERIOD_MS;

        let interest = 0n;
        if (now > gracePeriodEnd) {
            const daysElapsed = Math.floor((now - gracePeriodEnd) / (24 * 60 * 60 * 1000));
            // 1% per day = principal * days / 100
            interest = (debt.principalAmount * BigInt(daysElapsed)) / 100n;
        }

        const totalDue = debt.principalAmount + interest - debt.amountPaid;

        res.json({
            success: true,
            data: {
                principal: debt.principalAmount.toString(),
                amountPaid: debt.amountPaid.toString(),
                interest: interest.toString(),
                totalDue: totalDue.toString(),
                gracePeriodEnd: new Date(gracePeriodEnd).toISOString(),
                inGracePeriod: now <= gracePeriodEnd,
                source: 'calculated',
            },
        });
    } catch (error) {
        next(error);
    }
});

export default router;
