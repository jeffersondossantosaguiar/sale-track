import { readFileSync } from "node:fs";
import { join } from "node:path";
import { migrate } from "drizzle-orm/better-sqlite3/migrator";
import { type Db, createDb } from "../../src/lib/db/client";

/**
 * Helper de testes — DB SQLite em memória migrado (mesmo schema de produção).
 * Cada chamada devolve um banco isolado; feche com cleanup().
 */

export const FIXTURES_DIR = join(process.cwd(), "tests", "fixtures", "xml");

export function readFixture(name: string): string {
  return readFileSync(join(FIXTURES_DIR, name), "utf8");
}

export function setupTestDb(): { db: Db; cleanup: () => void } {
  const created = createDb({ url: ":memory:" });
  migrate(created.db, { migrationsFolder: join(process.cwd(), "src/lib/db/migrations") });
  return {
    db: created.db,
    cleanup: () => created.sqlite.close(),
  };
}

/** Nome do fixture Shopee de 1 item (válido). */
export const FIXTURE_SHOPEE_1 = "260712NNN_invoice_file_1783889608_fixture1.xml";
/** Nome do fixture Shopee multi-item (4 itens). */
export const FIXTURE_SHOPEE_4 = "260717TTT_invoice_file_1784296401_fixture2.xml";
/** Duplicata do 1º (mesmo nNF/serie/dhEmi). */
export const FIXTURE_SHOPEE_DUP = "260712DUP_invoice_file_1783889608_fixture3.xml";
export const FIXTURE_TIKTOK = "1783889877430.xml";
export const FIXTURE_SEM_PADRAO = "sem_padrao_pedido_xyz.xml";
export const FIXTURE_MALFORMED = "_malformed.xml";
export const FIXTURE_NOT_XML = "nota_foto.jpg";
