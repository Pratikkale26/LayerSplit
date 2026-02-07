import { Router } from 'express';
import type { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import prisma from '../db/client.js';
import type { ApiResponse } from '../types/index.js';
import { AppError } from '../middleware/error.js';

const router = Router();

// Validation schemas
const createGroupSchema = z.object({
    telegramGroupId: z.string(),
    name: z.string().min(1).max(100),
    adminTelegramId: z.string(),
});

const addMemberSchema = z.object({
    telegramId: z.string(),
});

// POST /api/groups - Create or register group
router.post('/', async (req: Request, res: Response<ApiResponse>, next: NextFunction) => {
    try {
        const body = createGroupSchema.parse(req.body);

        // Find admin user
        const admin = await prisma.user.findUnique({
            where: { telegramId: BigInt(body.adminTelegramId) },
        });

        if (!admin) {
            throw new AppError('Admin user not found. Link wallet first.', 400);
        }

        // Create or update group
        const group = await prisma.group.upsert({
            where: { telegramGroupId: BigInt(body.telegramGroupId) },
            update: { name: body.name },
            create: {
                telegramGroupId: BigInt(body.telegramGroupId),
                name: body.name,
                members: {
                    create: {
                        userId: admin.id,
                        isAdmin: true,
                    },
                },
            },
            include: {
                members: {
                    include: { user: true },
                },
            },
        });

        res.json({
            success: true,
            data: {
                id: group.id,
                telegramGroupId: group.telegramGroupId.toString(),
                name: group.name,
                createdAt: group.createdAt,
                members: group.members.map((m: any) => ({
                    id: m.user.id,
                    telegramId: m.user.telegramId.toString(),
                    username: m.user.username,
                    isAdmin: m.isAdmin,
                })),
            },
        });
    } catch (error) {
        next(error);
    }
});

// GET /api/groups/:groupId - Get group details
router.get('/:groupId', async (req: Request, res: Response<ApiResponse>, next: NextFunction) => {
    try {
        const groupId = req.params.groupId;
        if (!groupId) throw new AppError('Group ID required', 400);

        const group = await prisma.group.findUnique({
            where: { id: groupId },
            include: {
                members: {
                    include: { user: true },
                },
                bills: {
                    take: 10,
                    orderBy: { createdAt: 'desc' },
                },
            },
        });

        if (!group) {
            throw new AppError('Group not found', 404);
        }

        res.json({
            success: true,
            data: {
                id: group.id,
                telegramGroupId: group.telegramGroupId.toString(),
                name: group.name,
                createdAt: group.createdAt,
                members: group.members.map((m: any) => ({
                    id: m.user.id,
                    telegramId: m.user.telegramId.toString(),
                    username: m.user.username,
                    isAdmin: m.isAdmin,
                })),
                recentBills: group.bills.map((b: any) => ({
                    id: b.id,
                    title: b.title,
                    totalAmount: b.totalAmount.toString(),
                    isSettled: b.isSettled,
                })),
            },
        });
    } catch (error) {
        next(error);
    }
});

// POST /api/groups/:groupId/members - Add member to group
router.post('/:groupId/members', async (req: Request, res: Response<ApiResponse>, next: NextFunction) => {
    try {
        const groupId = req.params.groupId;
        if (!groupId) throw new AppError('Group ID required', 400);

        const body = addMemberSchema.parse(req.body);

        // Find user
        const user = await prisma.user.findUnique({
            where: { telegramId: BigInt(body.telegramId) },
        });

        if (!user) {
            throw new AppError('User not found. Link wallet first.', 400);
        }

        // Check group exists
        const group = await prisma.group.findUnique({
            where: { id: groupId },
        });

        if (!group) {
            throw new AppError('Group not found', 404);
        }

        // Add member (upsert to handle duplicates)
        await prisma.groupMember.upsert({
            where: {
                groupId_userId: {
                    groupId: groupId,
                    userId: user.id,
                },
            },
            update: {},
            create: {
                groupId: groupId,
                userId: user.id,
                isAdmin: false,
            },
        });

        res.json({
            success: true,
            data: { message: 'Member added successfully' },
        });
    } catch (error) {
        next(error);
    }
});

// DELETE /api/groups/:groupId/members/:telegramId - Remove member
router.delete('/:groupId/members/:telegramId', async (req: Request, res: Response<ApiResponse>, next: NextFunction) => {
    try {
        const { groupId, telegramId } = req.params;
        if (!groupId || !telegramId) throw new AppError('Group ID and Telegram ID required', 400);

        const user = await prisma.user.findUnique({
            where: { telegramId: BigInt(Number(telegramId)) },
        });

        if (!user) {
            throw new AppError('User not found', 404);
        }

        await prisma.groupMember.delete({
            where: {
                groupId_userId: {
                    groupId: groupId,
                    userId: user.id,
                },
            },
        });

        res.json({
            success: true,
            data: { message: 'Member removed successfully' },
        });
    } catch (error) {
        next(error);
    }
});

export default router;
