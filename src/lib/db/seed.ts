import { DEFAULT_CATEGORIES } from "@/lib/domain/catalog";
import { eq } from "drizzle-orm";
import { getDb } from "./client";
import { runMigrations } from "./migrate";
import { categories } from "./schema";
import { getSetting, setSetting } from "./settings";

/**
 * db:seed — dados iniciais essenciais (idempotente).
 * Constitution §II/V: só os defaults de configuração que o usuário edita depois.
 * Categorias padrão (removíveis na UI) + configurações de teto/taxa.
 */

export const SEED_CONFIG: Record<string, string> = {
  mei_limit_cents: String(81_000 * 100), // R$ 81.000,00 — teto MEI default (constitution)
};

function seedCategories(): void {
  const { db } = getDb();
  const now = new Date();
  for (const name of DEFAULT_CATEGORIES) {
    const exists = db.select({ id: categories.id }).from(categories).where(eq(categories.name, name)).get();
    if (!exists) db.insert(categories).values({ name, createdAt: now, updatedAt: now }).run();
  }
}

export function seedDb(dbPath?: string): void {
  runMigrations(dbPath);
  seedCategories();
  for (const [key, value] of Object.entries(SEED_CONFIG)) {
    if (getSetting(key) === null) setSetting(key, value);
  }
}

if (process.argv[1]?.endsWith("seed.ts")) {
  const path = process.env.DATABASE_URL ? process.env.DATABASE_URL.replace(/^file:/, "") : undefined;
  seedDb(path);
  console.log("\n db:seed — configurações e categorias padrão garantidas ✓");
}
