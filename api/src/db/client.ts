import { PrismaClient } from '../generated/prisma/client';

// Singleton pattern for Prisma client
const globalForPrisma = globalThis as unknown as { prisma: PrismaClient };

export const prisma = globalForPrisma.prisma;

export default prisma;
