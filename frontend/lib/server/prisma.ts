import { PrismaClient } from "@/app/generated/prisma/client";

declare global {
    var __perfoPrisma: PrismaClient | undefined;
}

const normalizedDatabaseUrl = process.env.DATABASE_URL?.trim() ?? "";

export const hasDatabaseUrl = normalizedDatabaseUrl.length > 0;

const createPrismaClient = () => {
    if (!hasDatabaseUrl) {
        return null;
    }

    try {
        return globalThis.__perfoPrisma ?? new PrismaClient();
    } catch {
        return null;
    }
};

export const prisma = createPrismaClient();

if (prisma && process.env.NODE_ENV !== "production") {
    globalThis.__perfoPrisma = prisma;
}
