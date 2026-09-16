import { readFileSync } from "node:fs";
import { join } from "node:path";
import { migrate } from "drizzle-orm/better-sqlite3/migrator";
import { createDb } from "./client";

/**
 * db:migrate — aplica as migrações versionadas (src/lib/db/migrations) via
 * drizzle-orm migrator oficial. Idempotente: drizzle registra em __drizzle_migrations.
 * Challenge: única forma de evoluir schema (Constitution §V). NUNCA drizzle-kit push.
 */
export function runMigrations(dbPath?: string): void {
  const { db, sqlite } = createDb({
    url:
      dbPath ??
      `file:${process.env.DATABASE_URL ? process.env.DATABASE_URL.replace(/^file:/, "") : "data/sale-track.db"}`,
  });
  migrate(db, { migrationsFolder: join(process.cwd(), "src/lib/db/migrations") });
  void readFileSync;
  sqlite.close();
}

if (process.argv[1]?.endsWith("migrate.ts")) {
  const path = process.env.DATABASE_URL ?? "file:data/sale-track.db";
  runMigrations(path.replace(/^file:/, ""));
  console.log("\n db:migrate — schema em dia (migrações versionadas aplicadas) ✓");
}
