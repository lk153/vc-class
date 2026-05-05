import fs from "node:fs";
import path from "node:path";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { seedE2eWorkspace } from "../src/lib/e2e/seed";

// Load .env.local (same pattern as prisma/seed.ts)
const envPath = path.join(__dirname, "../.env.local");
if (fs.existsSync(envPath)) {
  for (const line of fs.readFileSync(envPath, "utf-8").split("\n")) {
    const match = line.match(/^([^#=]+)=(.*)$/);
    if (match) {
      const key = match[1].trim();
      const value = match[2].trim().replace(/^["']|["']$/g, "");
      if (!process.env[key]) process.env[key] = value;
    }
  }
}

if (process.env.E2E_ALLOW !== "yes") {
  console.error(
    "✗ Refusing to run E2E seed: E2E_ALLOW=yes is required.\n" +
      "  Production must never set this variable. Run with:\n" +
      "    E2E_ALLOW=yes make e2e-seed"
  );
  process.exit(1);
}

const rawUrl = process.env.DIRECT_URL || process.env.DATABASE_URL || "";
const needsSsl = rawUrl.includes("sslmode=") || rawUrl.includes("supabase.com");
const connectionString = rawUrl
  .replace(/[?&]sslmode=[^&]*/g, "")
  .replace(/\?&/, "?")
  .replace(/\?$/, "");

const adapter = new PrismaPg({
  connectionString,
  ...(needsSsl && { ssl: { rejectUnauthorized: false } }),
});
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log("Seeding E2E workspace (idempotent upsert)…\n");
  const result = await seedE2eWorkspace(prisma);
  console.log("✓ Teacher:", result.teacherId);
  console.log("✓ Student:", result.studentId);
  console.log("✓ Class:  ", result.classId);
  console.log("✓ Topics: ", result.topicIds.join(", "));
  console.log("✓ Tests:  ", result.testIds.join(", "));
  console.log("\n✅ E2E seed complete");
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
