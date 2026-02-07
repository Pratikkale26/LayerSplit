import { Router } from 'express';
import type { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import prisma from '../db/client.js';
import type { ApiResponse, BillResponse, PtbResponse, SplitType } from '../types/index.js';
import { AppError } from '../middleware/error.js';
import {
    buildCreateEqualSplitPtb,
    buildCreateCustomSplitPtb,
    getRegistryObjectId,
} from '../services/sui.js';

const router = Router();

// Validation schemas
const createBillSchema = z.object({
    groupId: z.string().optional(),
    title: z.string().min(1).max(100),
    description: z.string().max(500).optional(),
    totalAmount: z.string().regex(/^\d+$/, 'Must be a valid amount'),
    splitType: z.enum(['EQUAL', 'CUSTOM', 'DUTCH']),
    creatorTelegramId: z.string(),
    debtors: z.array(z.object({
        telegramId: z.string(),
        amount: z.string().optional(),
    })).min(1).max(20),
});

// POST /api/bills - Create new bill (returns PTB)
router.post('/', async (req: Request, res: Response<ApiResponse<PtbResponse>>, next: NextFunction) => {
    try {
        const body = createBillSchema.parse(req.body);

        // Find creator
        const creator = await prisma.user.findUnique({
            where: { telegramId: BigInt(body.creatorTelegramId) },
        });

        if (!creator) {
            throw new AppError('Creator not found. Link wallet first.', 400);
        }

        // Find all debtors
        const debtorAddresses: string[] = [];
        const debtorAmounts: bigint[] = [];
        const debtorUsers: { id: string; walletAddress: string }[] = [];

        for (const debtor of body.debtors) {
            const user = await prisma.user.findUnique({
                where: { telegramId: BigInt(debtor.telegramId) },
            });

            if (!user) {
                throw new AppError(`Debtor ${debtor.telegramId} not found. They must link wallet first.`, 400);
            }

            debtorAddresses.push(user.walletAddress);
            debtorUsers.push({ id: user.id, walletAddress: user.walletAddress });

            if (body.splitType === 'CUSTOM' && debtor.amount) {
                debtorAmounts.push(BigInt(debtor.amount));
            }
        }

        // Get registry object ID
        let registryId: string;
        try {
            registryId = await getRegistryObjectId();
        } catch {
            // Use a placeholder if registry not found
            registryId = '0x0'; // Will fail on-chain but allows PTB construction
        }

        // Build PTB based on split type
        let ptbBytes: string;
        const totalAmount = BigInt(body.totalAmount);

        if (body.splitType === 'EQUAL') {
            ptbBytes = buildCreateEqualSplitPtb({
                registryId,
                title: body.title,
                description: body.description || '',
                totalAmount,
                debtors: debtorAddresses,
            });
        } else if (body.splitType === 'CUSTOM') {
            if (debtorAmounts.length !== debtorAddresses.length) {
                throw new AppError('Custom split requires amount for each debtor', 400);
            }
            ptbBytes = buildCreateCustomSplitPtb({
                registryId,
                title: body.title,
                description: body.description || '',
                totalAmount,
                debtors: debtorAddresses,
                amounts: debtorAmounts,
            });
        } else {
            throw new AppError('Dutch split not yet implemented in API', 400);
        }

        // Create bill in database (pending on-chain confirmation)
        const bill = await prisma.bill.create({
            data: {
                groupId: body.groupId || null,
                creatorId: creator.id,
                title: body.title,
                totalAmount,
                splitType: body.splitType,
                isSettled: false,
            },
        });

        // Create debt records
        const shareAmount = body.splitType === 'EQUAL'
            ? totalAmount / BigInt(debtorUsers.length)
            : 0n;

        for (let i = 0; i < debtorUsers.length; i++) {
            const amount = body.splitType === 'CUSTOM'
                ? debtorAmounts[i]
                : shareAmount;

            await prisma.debt.create({
                data: {
                    billId: bill.id,
                    debtorId: debtorUsers[i].id,
                    creditorId: creator.id,
                    principalAmount: amount,
                },
            });
        }

        res.json({
            success: true,
            data: {
                transactionBytes: ptbBytes,
                message: `Bill created. Sign the transaction to confirm on-chain. Bill ID: ${bill.id}`,
            },
        });
    } catch (error) {
        next(error);
    }
});

// GET /api/bills/:billId - Get bill details
router.get('/:billId', async (req: Request, res: Response<ApiResponse<BillResponse>>, next: NextFunction) => {
    try {
        const billId = req.params.billId;
        if (!billId) throw new AppError('Bill ID required', 400);

        const bill = await prisma.bill.findUnique({
            where: { id: billId },
            include: {
                creator: true,
                debts: {
                    include: {
                        debtor: true,
                        creditor: true,
                    },
                },
            },
        });

        if (!bill) {
            throw new AppError('Bill not found', 404);
        }

        res.json({
            success: true,
            data: {
                id: bill.id,
                suiObjectId: bill.suiObjectId || undefined,
                title: bill.title,
                totalAmount: bill.totalAmount.toString(),
                splitType: bill.splitType as SplitType,
                isSettled: bill.isSettled,
                createdAt: bill.createdAt,
                debts: bill.debts.map((d: any) => ({
                    id: d.id,
                    suiObjectId: d.suiObjectId || undefined,
                    principalAmount: d.principalAmount.toString(),
                    amountPaid: d.amountPaid.toString(),
                    isSettled: d.isSettled,
                    debtor: {
                        id: d.debtor.id,
                        telegramId: d.debtor.telegramId.toString(),
                        username: d.debtor.username || undefined,
                    },
                    creditor: {
                        id: d.creditor.id,
                        telegramId: d.creditor.telegramId.toString(),
                        username: d.creditor.username || undefined,
                    },
                })),
            },
        });
    } catch (error) {
        next(error);
    }
});

// GET /api/bills/group/:groupId - Get all bills in a group
router.get('/group/:groupId', async (req: Request, res: Response<ApiResponse>, next: NextFunction) => {
    try {
        const groupId = req.params.groupId;
        if (!groupId) throw new AppError('Group ID required', 400);

        const bills = await prisma.bill.findMany({
            where: { groupId },
            include: {
                creator: true,
                debts: {
                    include: {
                        debtor: true,
                        creditor: true,
                    },
                },
            },
            orderBy: { createdAt: 'desc' },
        });

        res.json({
            success: true,
            data: bills.map((bill: any) => ({
                id: bill.id,
                suiObjectId: bill.suiObjectId,
                title: bill.title,
                totalAmount: bill.totalAmount.toString(),
                splitType: bill.splitType,
                isSettled: bill.isSettled,
                createdAt: bill.createdAt,
                creator: {
                    id: bill.creator.id,
                    telegramId: bill.creator.telegramId.toString(),
                    username: bill.creator.username,
                },
                debtCount: bill.debts.length,
            })),
        });
    } catch (error) {
        next(error);
    }
});

// PUT /api/bills/:billId - Update bill (only if not settled)
router.put('/:billId', async (req: Request, res: Response<ApiResponse>, next: NextFunction) => {
    try {
        const billId = req.params.billId;
        if (!billId) throw new AppError('Bill ID required', 400);

        const { title } = req.body;

        const bill = await prisma.bill.findUnique({
            where: { id: billId },
        });

        if (!bill) {
            throw new AppError('Bill not found', 404);
        }

        if (bill.suiObjectId) {
            throw new AppError('Cannot update confirmed on-chain bill', 400);
        }

        const updated = await prisma.bill.update({
            where: { id: billId },
            data: { title },
        });

        res.json({
            success: true,
            data: {
                id: updated.id,
                title: updated.title,
                message: 'Bill updated',
            },
        });
    } catch (error) {
        next(error);
    }
});

// DELETE /api/bills/:billId - Cancel bill
router.delete('/:billId', async (req: Request, res: Response<ApiResponse>, next: NextFunction) => {
    try {
        const billId = req.params.billId;
        if (!billId) throw new AppError('Bill ID required', 400);

        const bill = await prisma.bill.findUnique({
            where: { id: billId },
            include: { debts: true },
        });

        if (!bill) {
            throw new AppError('Bill not found', 404);
        }

        // Check if any payments made
        const hasPaid = bill.debts.some((d: any) => d.amountPaid > 0);
        if (hasPaid) {
            throw new AppError('Cannot delete bill with payments', 400);
        }

        await prisma.bill.delete({
            where: { id: billId },
        });

        res.json({
            success: true,
            data: { message: 'Bill deleted' },
        });
    } catch (error) {
        next(error);
    }
});

export default router;
