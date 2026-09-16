import { eq } from "drizzle-orm";
import { getDb } from "./client";
import { settings } from "./schema";

/**
 * Leitura/escrita das configurações em `settings` (teto MEI, taxas padrão por canal).
 * Constitution §III/§V: configurável pelo usuário, nunca constante fixa (teto).
 * Valores guardados como texto serializado; números usam `getNumberSetting`.
 */

export type Settings = Record<string, string>;

/** Lê uma chave; null quando ausente (fallback fica no chamador). */
export function getSetting(key: string): string | null {
  const row = getDb().db.select({ value: settings.value }).from(settings).where(eq(settings.key, key)).get();
  return row?.value ?? null;
}

/** Grava (upsert) uma chave, atualizando updatedAt. */
export function setSetting(key: string, value: string | number): void {
  const raw = String(value);
  getDb()
    .db.insert(settings)
    .values({ key, value: raw })
    .onConflictDoUpdate({
      target: settings.key,
      set: { value: raw, updatedAt: new Date() },
    })
    .run();
}

/** Lê uma chave numérica com fallback (default da constitution quando ausente). */
export function getNumberSetting(key: string, fallback: number): number {
  const raw = getSetting(key);
  if (raw === null || raw === "") return fallback;
  const value = Number(raw);
  return Number.isSafeInteger(value) ? value : fallback;
}
