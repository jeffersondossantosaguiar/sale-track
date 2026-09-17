import { recalcAllCosts } from "@/lib/catalog/service";
import { createDb, getDb } from "./client";

/**
 * 004-US4 — Recálculo inicial das variantes após a correção do motor de custo
 * (mão de obra só manual; energia/máquina separadas) e dos dados de produção
 * (kwh=88, labor=1289). Atualiza `costCents` e `suggestedPriceCents`; o
 * `practicedPriceCents` permanece congelado (FR-011). Idempotente.
 *
 * Uso: `pnpm tsx src/lib/db/recalc-costs.ts`
 */
export function recalcCosts(dbPath?: string): number {
  const { db, sqlite } = dbPath ? createDb({ url: dbPath }) : getDb();
  recalcAllCosts(db);
  const row = sqlite.prepare("SELECT count(*) AS n FROM variants").get() as { n: number } | undefined;
  const total = row?.n ?? 0;
  if (dbPath) sqlite.close();
  return total;
}

if (process.argv[1]?.endsWith("recalc-costs.ts")) {
  const path = process.env.DATABASE_URL ? process.env.DATABASE_URL.replace(/^file:/, "") : undefined;
  const n = recalcCosts(path);
  console.log(`\n recalc-costs — ${n} variante(s) recalculada(s) ✓`);
}
