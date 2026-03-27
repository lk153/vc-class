import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

function createPrismaClient() {
  // Strip sslmode from connection string — pg v8+ treats sslmode=require
  // as verify-full which rejects Supabase's certificate.
  // We handle SSL via the ssl config option instead.
  const connectionString = (process.env.DATABASE_URL || "")
    .replace(/[?&]sslmode=[^&]*/g, "")
    .replace(/\?&/, "?")
    .replace(/\?$/, "");

  const adapter = new PrismaPg({
    connectionString,
    ssl: { rejectUnauthorized: false },
  });
  return new PrismaClient({ adapter });
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
