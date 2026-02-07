import { Router } from "express";
import type { Request, Response, NextFunction } from "express";
import { z } from "zod";
import { prisma } from "../db/client.js";
import type { ApiResponse, GroupResponse } from "../types/index.js";
import { AppError } from "../middleware/error.js";

const router = Router();

// Validation schemas
const createGroupSchema = z.object({
    telegramGroupId: z.string(),
    name: z.string().min(1).max(100),
    creatorTelegramId: z.string(),
});

const addMemberSchema = z.object({
    telegramId: z.string(),
    isAdmin: z.boolean().optional(),
});

// POST /api/groups - Create or update group
router.post(
    "/",
    async (
        req: Request,
        res: Response<ApiResponse<GroupResponse>>,
        next: NextFunction
    ) => {
        try {
            const body = createGroupSchema.parse(req.body);

            // Find creator
            const creator = await prisma.user.findUnique({
                where: { telegramId: BigInt(body.creatorTelegramId) },
            });

            if (!creator) {
                throw new AppError("Creator not found. Link wallet first.", 400);
            }

            // Upsert group
            const group = await prisma.group.upsert({
                where: { telegramGroupId: BigInt(body.telegramGroupId) },
                update: { name: body.name },
                create: {
                    telegramGroupId: BigInt(body.telegramGroupId),
                    name: body.name,
                },
            });

            // Add creator as admin
            await prisma.groupMember.upsert({
                where: { groupId_userId: { groupId: group.id, userId: creator.id } },
                update: { isAdmin: true },
                create: { groupId: group.id, userId: creator.id, isAdmin: true },
            });

            const memberCount = await prisma.groupMember.count({
                where: { groupId: group.id },
            });

            res.json({
                success: true,
                data: {
                    id: group.id,
                    telegramGroupId: group.telegramGroupId.toString(),
                    name: group.name,
                    createdAt: group.createdAt,
                    memberCount,
                },
            });
        } catch (error) {
            next(error);
        }
    }
);

// GET /api/groups/:telegramGroupId - Get group details
router.get(
    "/:telegramGroupId",
    async (
        req: Request,
        res: Response<ApiResponse<GroupResponse>>,
        next: NextFunction
    ) => {
        try {
            const { telegramGroupId } = req.params;
            if (!telegramGroupId) throw new AppError("Group ID required", 400);

            const group = await prisma.group.findUnique({
                where: { telegramGroupId: BigInt(Number(telegramGroupId)) },
                include: { members: true },
            });

            if (!group) {
                throw new AppError("Group not found", 404);
            }

            res.json({
                success: true,
                data: {
                    id: group.id,
                    telegramGroupId: group.telegramGroupId.toString(),
                    name: group.name,
                    createdAt: group.createdAt,
                    memberCount: group.members.length,
                },
            });
        } catch (error) {
            next(error);
        }
    }
);

// POST /api/groups/:groupId/members - Add member to group
router.post(
    "/:groupId/members",
    async (req: Request, res: Response<ApiResponse>, next: NextFunction) => {
        try {
            const groupId = req.params.groupId as string;
            if (!groupId) throw new AppError("Group ID required", 400);

            const body = addMemberSchema.parse(req.body);

            const user = await prisma.user.findUnique({
                where: { telegramId: BigInt(body.telegramId) },
            });

            if (!user) {
                throw new AppError("User not found. They must link wallet first.", 400);
            }

            await prisma.groupMember.upsert({
                where: { groupId_userId: { groupId, userId: user.id } },
                update: { isAdmin: body.isAdmin ?? false },
                create: {
                    groupId,
                    userId: user.id,
                    isAdmin: body.isAdmin ?? false,
                },
            });

            res.json({
                success: true,
                data: { message: "Member added" },
            });
        } catch (error) {
            next(error);
        }
    }
);

// GET /api/groups/:groupId/members - Get group members
router.get(
    "/:groupId/members",
    async (req: Request, res: Response<ApiResponse>, next: NextFunction) => {
        try {
            const groupId = req.params.groupId as string;
            if (!groupId) throw new AppError("Group ID required", 400);

            const members = await prisma.groupMember.findMany({
                where: { groupId },
                include: { user: true },
            });

            res.json({
                success: true,
                data: members.map((m: any) => ({
                    id: m.user.id,
                    telegramId: m.user.telegramId.toString(),
                    username: m.user.username ?? undefined,
                    isAdmin: m.isAdmin,
                })),
            });
        } catch (error) {
            next(error);
        }
    }
);

export default router;
