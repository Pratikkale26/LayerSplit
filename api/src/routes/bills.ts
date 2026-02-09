import { Router } from "express";
import type { Request, Response, NextFunction } from "express";
import { z } from "zod";
import { prisma } from "../db/client.js";
import type { ApiResponse, BillResponse, PtbResponse, SplitType } from "../types/index.js";
import { AppError } from "../middleware/error.js";
import { buildCreateEqualSplitPtb, buildCreateCustomSplitPtb } from "../services/sui";

const router = Router();

// Validation schemas
const createBillSchema = z.object({
    groupId: z.string().optional(),
    title: z.string().min(1).max(100),
    description: z.string().max(500).optional(),
    totalAmount: z.string().regex(/^\d+$/, "Must be a valid amount"),
    splitType: z.enum(["EQUAL", "CUSTOM", "DUTCH"]),
    creatorTelegramId: z.string(),
    debtors: z
        .array(
            z.object({
                telegramId: z.string(),
                amount: z.string().optional(),
            })
        )
        .min(1)
        .max(20),
});

// POST /api/bills - Create new bill (returns PTB)
router.post(
    "/",
    async (
        req: Request,
        res: Response<ApiResponse<PtbResponse>>,
        next: NextFunction
    ) => {
        try {
            const body = createBillSchema.parse(req.body);

            // Find creator
            const creator = await prisma.user.findUnique({
                where: { telegramId: BigInt(body.creatorTelegramId) },
            });

            if (!creator) {
                throw new AppError("Creator not found. Link wallet first.", 400);
            }

            // Find all debtors
            const debtorAddresses: string[] = [];
            const debtorAmounts: bigint[] = [];
            const debtorUsers: { id: string; walletAddress: string }[] = [];

            for (const debtor of body.debtors) {
                let user;

                // If telegramId looks like a number, look up by telegramId
                // Otherwise, look up by username
                if (debtor.telegramId && /^\d+$/.test(debtor.telegramId)) {
                    user = await prisma.user.findUnique({
                        where: { telegramId: BigInt(debtor.telegramId) },
                    });
                } else if (debtor.telegramId) {
                    // It's a username, look up by username
                    user = await prisma.user.findFirst({
                        where: { username: debtor.telegramId.replace('@', '') },
                    });
                }

                if (!user) {
                    throw new AppError(
                        `User "${debtor.telegramId}" not found. They must link their wallet first.`,
                        400
                    );
                }

                debtorAddresses.push(user.walletAddress);
                debtorUsers.push({ id: user.id, walletAddress: user.walletAddress });

                if (body.splitType === "CUSTOM" && debtor.amount) {
                    debtorAmounts.push(BigInt(debtor.amount));
                }
            }

            // Build PTB
            const totalAmount = BigInt(body.totalAmount);
            let ptbBytes: string;

            if (body.splitType === "EQUAL") {
                console.log("Building Equal Split PTB with:", {
                    title: body.title,
                    description: body.description,
                    totalAmount,
                    debtors: debtorAddresses,
                    packageId: process.env.PACKAGE_ID
                });
                ptbBytes = await buildCreateEqualSplitPtb({
                    title: body.title,
                    description: body.description ?? "",
                    totalAmount,
                    debtors: debtorAddresses,
                });
            } else if (body.splitType === "CUSTOM") {
                if (debtorAmounts.length !== debtorAddresses.length) {
                    throw new AppError("Custom split requires amount for each debtor", 400);
                }
                ptbBytes = await buildCreateCustomSplitPtb({
                    title: body.title,
                    description: body.description ?? "",
                    totalAmount,
                    debtors: debtorAddresses,
                    amounts: debtorAmounts,
                });
            } else {
                throw new AppError("Dutch split not yet implemented", 400);
            }

            // Create bill in database
            const bill = await prisma.bill.create({
                data: {
                    groupId: body.groupId ?? null,
                    creatorId: creator.id,
                    title: body.title,
                    totalAmount,
                    splitType: body.splitType,
                    isSettled: false,
                },
            });

            // Create debt records
            const shareAmount =
                body.splitType === "EQUAL"
                    ? totalAmount / BigInt(debtorUsers.length)
                    : BigInt(0);

            for (let i = 0; i < debtorUsers.length; i++) {
                const amount =
                    body.splitType === "CUSTOM" ? debtorAmounts[i] : shareAmount;

                await prisma.debt.create({
                    data: {
                        billId: bill.id,
                        debtorId: debtorUsers[i]!.id,
                        creditorId: creator.id,
                        principalAmount: amount!,
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
    }
);

// GET /api/bills/:billId - Get bill details
router.get(
    "/:billId",
    async (
        req: Request,
        res: Response<ApiResponse<BillResponse>>,
        next: NextFunction
    ) => {
        try {
            const billId = req.params.billId as string;
            if (!billId) throw new AppError("Bill ID required", 400);

            const bill = await prisma.bill.findUnique({
                where: { id: billId },
                include: {
                    creator: true,
                    debts: { include: { debtor: true, creditor: true } },
                },
            }) as any;

            if (!bill) {
                throw new AppError("Bill not found", 404);
            }

            res.json({
                success: true,
                data: {
                    id: bill.id,
                    suiObjectId: bill.suiObjectId ?? undefined,
                    title: bill.title,
                    totalAmount: bill.totalAmount.toString(),
                    splitType: bill.splitType as SplitType,
                    isSettled: bill.isSettled,
                    createdAt: bill.createdAt,
                    debts: bill.debts.map((d: any) => ({
                        id: d.id,
                        suiObjectId: d.suiObjectId ?? undefined,
                        principalAmount: d.principalAmount.toString(),
                        amountPaid: d.amountPaid.toString(),
                        isSettled: d.isSettled,
                        debtor: {
                            id: d.debtor.id,
                            telegramId: d.debtor.telegramId.toString(),
                            username: d.debtor.username ?? undefined,
                        },
                        creditor: {
                            id: d.creditor.id,
                            telegramId: d.creditor.telegramId.toString(),
                            username: d.creditor.username ?? undefined,
                        },
                    })),
                },
            });
        } catch (error) {
            next(error);
        }
    }
);

// GET /api/bills/group/:groupId - Get all bills in a group
router.get(
    "/group/:groupId",
    async (req: Request, res: Response<ApiResponse>, next: NextFunction) => {
        try {
            const groupId = req.params.groupId as string;
            if (!groupId) throw new AppError("Group ID required", 400);

            const bills = await prisma.bill.findMany({
                where: { groupId },
                include: { creator: true, debts: true },
                orderBy: { createdAt: "desc" },
            }) as any[];

            res.json({
                success: true,
                data: bills.map((bill) => ({
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
    }
);

// PUT /api/bills/:billId - Update bill title
router.put(
    "/:billId",
    async (req: Request, res: Response<ApiResponse>, next: NextFunction) => {
        try {
            const billId = req.params.billId as string;
            if (!billId) throw new AppError("Bill ID required", 400);

            const { title } = req.body;

            const bill = await prisma.bill.findUnique({ where: { id: billId } });

            if (!bill) {
                throw new AppError("Bill not found", 404);
            }

            if (bill.suiObjectId) {
                throw new AppError("Cannot update confirmed on-chain bill", 400);
            }

            const updated = await prisma.bill.update({
                where: { id: billId },
                data: { title },
            });

            res.json({
                success: true,
                data: { id: updated.id, title: updated.title, message: "Bill updated" },
            });
        } catch (error) {
            next(error);
        }
    }
);

// DELETE /api/bills/:billId - Delete bill
router.delete(
    "/:billId",
    async (req: Request, res: Response<ApiResponse>, next: NextFunction) => {
        try {
            const billId = req.params.billId as string;
            if (!billId) throw new AppError("Bill ID required", 400);

            const bill = await prisma.bill.findUnique({
                where: { id: billId },
                include: { debts: true },
            }) as any;

            if (!bill) {
                throw new AppError("Bill not found", 404);
            }

            const hasPaid = bill.debts.some((d: any) => d.amountPaid > 0);
            if (hasPaid) {
                throw new AppError("Cannot delete bill with payments", 400);
            }

            await prisma.bill.delete({ where: { id: billId } });

            res.json({
                success: true,
                data: { message: "Bill deleted" },
            });
        } catch (error) {
            next(error);
        }
    }
);

// GET /api/bills/:billId/sign - Get bill details for signing
router.get(
    "/:billId/sign",
    async (req: Request, res: Response<ApiResponse>, next: NextFunction) => {
        try {
            const billId = req.params.billId as string;
            if (!billId) throw new AppError("Bill ID required", 400);

            const bill = await prisma.bill.findUnique({
                where: { id: billId },
                include: {
                    creator: true,
                    debts: { include: { debtor: true } },
                },
            }) as any;

            if (!bill) {
                throw new AppError("Bill not found", 404);
            }

            if (bill.suiObjectId) {
                throw new AppError("Bill already confirmed on-chain", 400);
            }

            // Build PTB based on split type
            const debtorAddresses = bill.debts.map((d: any) => d.debtor.walletAddress);
            const debtorAmounts = bill.debts.map((d: any) => d.principalAmount);

            // Validate addresses
            if (debtorAddresses.length === 0) {
                console.error("No linked debtors found for bill:", billId);
                throw new AppError("No linked debtors found. Everyone must link their wallet first.", 400);
            }

            if (debtorAddresses.some((addr: string) => !addr || !addr.startsWith("0x") || addr.length < 60)) {
                console.error("Invalid debtor addresses found:", debtorAddresses);
                throw new AppError("Some debtors have not linked their wallets or have invalid addresses", 400);
            }

            console.log("Building PTB with valid debtor addresses:", debtorAddresses);

            let ptbBytes: string;
            if (bill.splitType === "EQUAL") {
                ptbBytes = await buildCreateEqualSplitPtb({
                    title: bill.title,
                    description: "",
                    totalAmount: bill.totalAmount,
                    debtors: debtorAddresses,
                });
            } else {
                ptbBytes = await buildCreateCustomSplitPtb({
                    title: bill.title,
                    description: "",
                    totalAmount: bill.totalAmount,
                    debtors: debtorAddresses,
                    amounts: debtorAmounts,
                });
            }

            res.json({
                success: true,
                data: {
                    id: bill.id,
                    title: bill.title,
                    totalAmount: bill.totalAmount.toString(),
                    splitType: bill.splitType,
                    creator: {
                        id: bill.creator.id,
                        telegramId: bill.creator.telegramId.toString(),
                        username: bill.creator.username,
                        walletAddress: bill.creator.walletAddress,
                    },
                    debts: bill.debts.map((d: any) => ({
                        id: d.id,
                        principalAmount: d.principalAmount.toString(),
                        debtor: {
                            id: d.debtor.id,
                            telegramId: d.debtor.telegramId.toString(),
                            username: d.debtor.username,
                            walletAddress: d.debtor.walletAddress,
                        },
                    })),
                    transactionBytes: ptbBytes,
                },
            });
        } catch (error) {
            next(error);
        }
    }
);

// POST /api/bills/:billId/confirm - Confirm on-chain bill creation
const confirmBillSchema = z.object({
    transactionDigest: z.string(),
    suiObjectId: z.string().optional(),
});

router.post(
    "/:billId/confirm",
    async (req: Request, res: Response<ApiResponse>, next: NextFunction) => {
        try {
            const billId = req.params.billId as string;
            if (!billId) throw new AppError("Bill ID required", 400);

            const body = confirmBillSchema.parse(req.body);

            const bill = await prisma.bill.findUnique({
                where: { id: billId },
                include: {
                    creator: true,
                    debts: {
                        include: { debtor: true },
                    },
                },
            });

            if (!bill) {
                throw new AppError("Bill not found", 404);
            }

            if (bill.suiObjectId) {
                throw new AppError("Bill already confirmed", 400);
            }

            // Update bill with on-chain data
            const updated = await prisma.bill.update({
                where: { id: billId },
                data: {
                    suiObjectId: body.suiObjectId || body.transactionDigest,
                    transactionDigest: body.transactionDigest,
                },
            });

            // Send Telegram notifications
            const { bot } = await import("../bot/telegram.js");
            const txnHash = body.transactionDigest;
            const explorerUrl = `https://suiscan.xyz/testnet/tx/${txnHash}`;
            const totalSui = Number(bill.totalAmount) / 1_000_000_000;

            const successMessage =
                `✅ *Bill Signed On-Chain!*\n\n` +
                `📄 *${bill.title}*\n` +
                `💵 Amount: ${totalSui.toFixed(2)} SUI\n` +
                `👥 Debtors: ${bill.debts.length}\n\n` +
                `🔗 [View on Suiscan](${explorerUrl})\n` +
                `📝 \`${txnHash.slice(0, 20)}...\``;

            // Send to group chat (if exists)
            if (bill.telegramChatId) {
                try {
                    await bot.telegram.sendMessage(
                        bill.telegramChatId.toString(),
                        successMessage,
                        { parse_mode: "Markdown", link_preview_options: { is_disabled: true } }
                    );
                } catch (e) {
                    console.error("Failed to send group notification:", e);
                }
            }

            // Send DM to creator
            try {
                await bot.telegram.sendMessage(
                    bill.creator.telegramId.toString(),
                    successMessage,
                    { parse_mode: "Markdown", link_preview_options: { is_disabled: true } }
                );
            } catch (e) {
                console.error("Failed to send DM notification:", e);
            }

            res.json({
                success: true,
                data: {
                    id: updated.id,
                    suiObjectId: updated.suiObjectId,
                    transactionDigest: updated.transactionDigest,
                    message: "Bill confirmed on-chain",
                },
            });
        } catch (error) {
            next(error);
        }
    }
);

export default router;

