import { Router } from "express";
import type { Request, Response, NextFunction } from "express";
import { z } from "zod";
import { prisma } from "../db/client.js";
import type { ApiResponse, PtbResponse, InterestInfo } from "../types/index.js";
import { AppError } from "../middleware/error.js";
import { buildPayDebtPtb, calculateInterest } from "../services/sui";

const router = Router();

// Validation schemas
const payDebtSchema = z.object({
    debtId: z.string(),
    payerTelegramId: z.string(),
    coinId: z.string(),
});

const confirmPaymentSchema = z.object({
    debtId: z.string(),
    txDigest: z.string(),
    amountPaid: z.string(),
});

// GET /api/payments/interest/:debtId - Calculate interest
router.get(
    "/interest/:debtId",
    async (
        req: Request,
        res: Response<ApiResponse<InterestInfo>>,
        next: NextFunction
    ) => {
        try {
            const { debtId } = req.params;
            if (!debtId) throw new AppError("Debt ID required", 400);

            const debt = await prisma.debt.findUnique({
                where: { id: String(debtId) },
                include: { bill: true },
            });

            if (!debt) {
                throw new AppError("Debt not found", 404);
            }

            const interestInfo = calculateInterest(
                debt.principalAmount,
                debt.amountPaid,
                debt.createdAt
            );

            res.json({
                success: true,
                data: interestInfo,
            });
        } catch (error) {
            next(error);
        }
    }
);

// POST /api/payments/pay - Create payment PTB
router.post(
    "/pay",
    async (
        req: Request,
        res: Response<ApiResponse<PtbResponse>>,
        next: NextFunction
    ) => {
        try {
            const body = payDebtSchema.parse(req.body);

            // Get debt
            const debt = await prisma.debt.findUnique({
                where: { id: body.debtId },
                include: { creditor: true, debtor: true },
            });

            if (!debt) {
                throw new AppError("Debt not found", 404);
            }

            if (debt.isSettled) {
                throw new AppError("Debt already settled", 400);
            }

            // Calculate amount with interest
            const interestInfo = calculateInterest(
                debt.principalAmount,
                debt.amountPaid,
                debt.createdAt
            );

            // Build PTB
            const ptbBytes = buildPayDebtPtb({
                debtObjectId: debt.suiObjectId ?? "",
                coinId: body.coinId,
                amount: BigInt(interestInfo.total),
                creditorAddress: debt.creditor.walletAddress,
            });

            res.json({
                success: true,
                data: {
                    transactionBytes: ptbBytes,
                    message: `Pay ${interestInfo.total} MIST (${interestInfo.principal} principal + ${interestInfo.interest} interest)`,
                },
            });
        } catch (error) {
            next(error);
        }
    }
);

// POST /api/payments/confirm - Confirm payment (after on-chain tx)
router.post(
    "/confirm",
    async (req: Request, res: Response<ApiResponse>, next: NextFunction) => {
        try {
            const body = confirmPaymentSchema.parse(req.body);

            const debt = await prisma.debt.findUnique({
                where: { id: body.debtId },
            });

            if (!debt) {
                throw new AppError("Debt not found", 404);
            }

            const newAmountPaid = debt.amountPaid + BigInt(body.amountPaid);
            const isSettled = newAmountPaid >= debt.principalAmount;

            await prisma.debt.update({
                where: { id: body.debtId },
                data: {
                    amountPaid: newAmountPaid,
                    isSettled,
                },
            });

            // Check if all debts in bill are settled
            const bill = await prisma.bill.findUnique({
                where: { id: debt.billId },
                include: { debts: true },
            });

            if (bill) {
                const allSettled = bill.debts.every(
                    (d) => d.id === debt.id ? isSettled : d.isSettled
                );
                if (allSettled) {
                    await prisma.bill.update({
                        where: { id: bill.id },
                        data: { isSettled: true },
                    });
                }
            }

            res.json({
                success: true,
                data: {
                    message: isSettled ? "Debt fully settled!" : "Payment recorded",
                    amountPaid: newAmountPaid.toString(),
                    isSettled,
                },
            });
        } catch (error) {
            next(error);
        }
    }
);

// GET /api/payments/history/:telegramId - Get payment history
router.get(
    "/history/:telegramId",
    async (req: Request, res: Response<ApiResponse>, next: NextFunction) => {
        try {
            const { telegramId } = req.params;
            if (!telegramId) throw new AppError("Telegram ID required", 400);

            const user = await prisma.user.findUnique({
                where: { telegramId: BigInt(Number(telegramId)) },
            });

            if (!user) {
                throw new AppError("User not found", 404);
            }

            // Get settled debts
            const paidDebts = await prisma.debt.findMany({
                where: { debtorId: user.id, isSettled: true },
                include: { creditor: true, bill: true },
                orderBy: { createdAt: "desc" },
                take: 50,
            });

            const receivedDebts = await prisma.debt.findMany({
                where: { creditorId: user.id, isSettled: true },
                include: { debtor: true, bill: true },
                orderBy: { createdAt: "desc" },
                take: 50,
            });

            res.json({
                success: true,
                data: {
                    paid: paidDebts.map((d) => ({
                        id: d.id,
                        amount: d.amountPaid.toString(),
                        to: d.creditor.username ?? d.creditor.telegramId.toString(),
                        billTitle: d.bill.title,
                        date: d.createdAt,
                    })),
                    received: receivedDebts.map((d) => ({
                        id: d.id,
                        amount: d.amountPaid.toString(),
                        from: d.debtor.username ?? d.debtor.telegramId.toString(),
                        billTitle: d.bill.title,
                        date: d.createdAt,
                    })),
                },
            });
        } catch (error) {
            next(error);
        }
    }
);

export default router;
