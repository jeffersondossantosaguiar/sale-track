import { DEFAULT_CATEGORIES } from "@/lib/domain/catalog";
import { DEFAULT_FEE_TIERS } from "@/lib/domain/fees";
import { eq } from "drizzle-orm";
import { getDb } from "./client";
import { runMigrations } from "./migrate";
import { categories, channelFeeTiers } from "./schema";
import { getSetting, setSetting } from "./settings";

/**
 * db:seed — dados iniciais essenciais (idempotente).
 * Constitution §II/V: só os defaults de configuração que o usuário edita depois.
 * Categorias padrão (removíveis na UI) + configurações de teto/taxa.
 */

export const SEED_CONFIG: Record<string, string> = {
  mei_limit_cents: String(81_000 * 100), // R$ 81.000,00 — teto MEI default (constitution)
  // Parâmetros globais do motor de custo (002) — defaults seguros, editáveis na UI.
  kwh_rate_cents: "90", // R$ 0,90/kWh
  hours_per_week: "72", // 12h/dia × 6 dias
  labor_cost_per_hour_cents: "0", // R$/h de mão de obra — dono define
  channel_fee_fixed_cents_shopee: "0",
  channel_fee_fixed_cents_tiktok: "0",
};

function seedCategories(): void {
  const { db } = getDb();
  const now = new Date();
  for (const name of DEFAULT_CATEGORIES) {
    const exists = db.select({ id: categories.id }).from(categories).where(eq(categories.name, name)).get();
    if (!exists) db.insert(categories).values({ name, createdAt: now, updatedAt: now }).run();
  }
}

/** Faixas de taxa padrão por canal (005) — idempotente, substitui o conjunto do canal. */
function seedFeeTiers(): void {
  const { db } = getDb();
  for (const [channel, tiers] of Object.entries(DEFAULT_FEE_TIERS)) {
    db.delete(channelFeeTiers).where(eq(channelFeeTiers.channel, channel)).run();
    const now = new Date();
    for (const tier of tiers) {
      db.insert(channelFeeTiers)
        .values({ channel, ...tier, createdAt: now, updatedAt: now })
        .run();
    }
  }
}

export function seedDb(dbPath?: string): void {
  runMigrations(dbPath);
  seedCategories();
  seedFeeTiers();
  for (const [key, value] of Object.entries(SEED_CONFIG)) {
    if (getSetting(key) === null) setSetting(key, value);
  }
}

if (process.argv[1]?.endsWith("seed.ts")) {
  const path = process.env.DATABASE_URL ? process.env.DATABASE_URL.replace(/^file:/, "") : undefined;
  seedDb(path);
  console.log("\n db:seed — configurações e categorias padrão garantidas ✓");
}
