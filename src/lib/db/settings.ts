import { eq } from "drizzle-orm";
import { type Db, getDb } from "./client";
import { settings } from "./schema";

/**
 * Leitura/escrita das configurações em `settings` (teto MEI, taxas padrão por canal).
 * Constitution §III/§V: configurável pelo usuário, nunca constante fixa (teto).
 * Valores guardados como texto serializado; números usam `getNumberSetting`.
 */

export type Settings = Record<string, string>;

function dbOf(opts?: { db?: Db }): Db {
  return opts?.db ?? getDb().db;
}

/** Lê uma chave; null quando ausente (fallback fica no chamador). */
export function getSetting(key: string, opts?: { db?: Db }): string | null {
  const db = dbOf(opts);
  const row = db.select({ value: settings.value }).from(settings).where(eq(settings.key, key)).get();
  return row?.value ?? null;
}

/** Grava (upsert) uma chave, atualizando updatedAt. */
export function setSetting(key: string, value: string | number, opts?: { db?: Db }): void {
  const db = dbOf(opts);
  const raw = String(value);
  db.insert(settings)
    .values({ key, value: raw })
    .onConflictDoUpdate({
      target: settings.key,
      set: { value: raw, updatedAt: new Date() },
    })
    .run();
}

/** Lê uma chave numérica com fallback (default da constitution quando ausente). */
export function getNumberSetting(key: string, fallback: number, opts?: { db?: Db }): number {
  const raw = getSetting(key, opts);
  if (raw === null || raw === "") return fallback;
  const value = Number(raw);
  return Number.isSafeInteger(value) ? value : fallback;
}

/** Grava uma chave numérica (int); util para testes e actions. */
export function setNumberSetting(key: string, value: number, opts?: { db?: Db }): void {
  setSetting(key, Number.isInteger(value) ? value : Math.round(value), opts);
}
