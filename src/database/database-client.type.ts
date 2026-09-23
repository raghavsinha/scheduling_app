import { Prisma, PrismaClient } from '@prisma/client';

export type DatabaseClient = PrismaClient;
export type TransactionClient = Prisma.TransactionClient;
export type DatabaseExecutor = DatabaseClient | TransactionClient;
