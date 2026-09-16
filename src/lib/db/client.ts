import { mkdirSync } from "node:fs";
import { dirname, isAbsolute, join, resolve } from "node:path";
import Database from "better-sqlite3";
import { type BetterSQLite3Database, drizzle } from "drizzle-orm/better-sqlite3";
import * as schema from "./schema";

/**
 * Cliente SQLite (better-sqlite3 + Drizzle) — fonte única da conexão.
 * Constitution §V/§VI: WAL + foreign_keys ON; single-user local síncrono.
 * Caminho via DATABASE_URL ("file:...") ou default `data/sale-track.db`.
 * Todos os arquivos de dados (DB + XMLs arquivados) vivem sob `data/` — raiz
 * estática, fora do `public`, mantida fora do tracing de deploy (Turbopack).
 */

export const DATA_DIR = resolve(process.cwd(), "data");
export const DEFAULT_DB_PATH = join(DATA_DIR, "sale-track.db");

export function resolveDbPath(url: string | undefined): string {
  if (!url || url === ":memory:") return url ? ":memory:" : DEFAULT_DB_PATH;
  const cleaned = url.replace(/^file:/, "").split("?")[0];
  if (isAbsolute(cleaned)) return cleaned;
  return join(DATA_DIR, cleaned.replace(/^([.]?[\\/]+)?data([\\/]|$)/i, ""));
}

export type Db = BetterSQLite3Database<typeof schema>;

export function createDb(options: { url?: string } = {}): {
  db: Db;
  sqlite: Database.Database;
} {
  const target = resolveDbPath(options.url ?? process.env.DATABASE_URL);
  if (target !== ":memory:") mkdirSync(dirname(target), { recursive: true });
  const sqlite = new Database(target);
  sqlite.pragma("journal_mode = WAL");
  sqlite.pragma("foreign_keys = ON");
  sqlite.pragma("busy_timeout = 5000");
  const db = drizzle(sqlite, { schema });
  return { db, sqlite };
}

let cached: { db: Db; sqlite: Database.Database } | null = null;

export function getDb(): { db: Db; sqlite: Database.Database } {
  if (!cached) cached = createDb();
  return cached;
}
