import { Router } from "express";
import type { Request, Response, NextFunction } from "express";
import { z } from "zod";
import { prisma } from "../db/client.js";
import type { ApiResponse, UserProfile, DebtResponse } from "../types/index.js";
import { AppError } from "../middleware/error.js";

const router = Router();

// Validation schemas
const linkWalletSchema = z.object({
    telegramId: z.string(),
    walletAddress: z.string().regex(/^0x[a-fA-F0-9]{64}$/, "Invalid Sui address"),
    username: z.string().optional(),
});

// POST /api/users/link - Link wallet to Telegram ID
router.post(
    "/link",
    async (
        req: Request,
        res: Response<ApiResponse<UserProfile>>,
        next: NextFunction
    ) => {
        try {
            const body = linkWalletSchema.parse(req.body);

            const user = await prisma.user.upsert({
                where: { telegramId: BigInt(body.telegramId) },
                update: {
                    walletAddress: body.walletAddress,
                    username: body.username,
                },
                create: {
                    telegramId: BigInt(body.telegramId),
                    walletAddress: body.walletAddress,
                    username: body.username,
                },
            });

            res.json({
                success: true,
                data: {
                    id: user.id,
                    telegramId: user.telegramId.toString(),
                    walletAddress: user.walletAddress,
                    username: user.username ?? undefined,
                    createdAt: user.createdAt,
                },
            });
        } catch (error) {
            next(error);
        }
    }
);

// GET /api/users/:telegramId - Get user profile
router.get(
    "/:telegramId",
    async (
        req: Request,
        res: Response<ApiResponse<UserProfile>>,
        next: NextFunction
    ) => {
        try {
            const { telegramId } = req.params;
            if (!telegramId) throw new AppError("Telegram ID required", 400);

            const user = await prisma.user.findUnique({
                where: { telegramId: BigInt(Number(telegramId)) },
            });

            if (!user) {
                throw new AppError("User not found", 404);
            }

            res.json({
                success: true,
                data: {
                    id: user.id,
                    telegramId: user.telegramId.toString(),
                    walletAddress: user.walletAddress,
                    username: user.username ?? undefined,
                    createdAt: user.createdAt,
                },
            });
        } catch (error) {
            next(error);
        }
    }
);

// GET /api/users/:telegramId/debts - Get debts owed BY user
router.get(
    "/:telegramId/debts",
    async (
        req: Request,
        res: Response<ApiResponse<DebtResponse[]>>,
        next: NextFunction
    ) => {
        try {
            const { telegramId } = req.params;
            if (!telegramId) throw new AppError("Telegram ID required", 400);

            const user = await prisma.user.findUnique({
                where: { telegramId: BigInt(Number(telegramId)) },
            });

            if (!user) {
                throw new AppError("User not found", 404);
            }

            const debts = await prisma.debt.findMany({
                where: { debtorId: user.id, isSettled: false },
                include: { debtor: true, creditor: true, bill: true },
                orderBy: { createdAt: "desc" },
            });

            res.json({
                success: true,
                data: debts.map((d) => ({
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
            });
        } catch (error) {
            next(error);
        }
    }
);

// GET /api/users/:telegramId/receivables - Get debts owed TO user
router.get(
    "/:telegramId/receivables",
    async (
        req: Request,
        res: Response<ApiResponse<DebtResponse[]>>,
        next: NextFunction
    ) => {
        try {
            const { telegramId } = req.params;
            if (!telegramId) throw new AppError("Telegram ID required", 400);

            const user = await prisma.user.findUnique({
                where: { telegramId: BigInt(Number(telegramId)) },
            });

            if (!user) {
                throw new AppError("User not found", 404);
            }

            const debts = await prisma.debt.findMany({
                where: { creditorId: user.id, isSettled: false },
                include: { debtor: true, creditor: true, bill: true },
                orderBy: { createdAt: "desc" },
            });

            res.json({
                success: true,
                data: debts.map((d) => ({
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
            });
        } catch (error) {
            next(error);
        }
    }
);

export default router;
