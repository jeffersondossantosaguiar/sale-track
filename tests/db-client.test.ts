import { join } from "node:path";
import { DATA_DIR, DEFAULT_DB_PATH, resolveDbPath } from "@/lib/db/client";
import { describe, expect, it } from "vitest";

/**
 * T—: resolveDbPath — caminho do DB SEMPRE sob <root>/data (raiz estática,
 * fora do public); padrões usados por migrate/seed/drizzle são preservados.
 */

describe("resolveDbPath", () => {
  it("retorna :memory: para memória", () => {
    expect(resolveDbPath(":memory:")).toBe(":memory:");
    expect(resolveDbPath("")).toBe(DEFAULT_DB_PATH);
    expect(resolveDbPath(undefined)).toBe(DEFAULT_DB_PATH);
  });

  it("acata file:./data/... e data/... como antes", () => {
    expect(resolveDbPath("file:./data/sale-track.db")).toBe(join(DATA_DIR, "sale-track.db"));
    expect(resolveDbPath("file:data/sale-track.db")).toBe(join(DATA_DIR, "sale-track.db"));
    expect(resolveDbPath("./data/test.db")).toBe(join(DATA_DIR, "test.db"));
    expect(resolveDbPath("data/test.db")).toBe(join(DATA_DIR, "test.db"));
  });

  it("nomes sem prefixo vão para data/ (raiz única de dados)", () => {
    expect(resolveDbPath("sale-track.db")).toBe(join(DATA_DIR, "sale-track.db"));
  });

  it("desconsidera query string e preserva caminho absoluto", () => {
    expect(resolveDbPath("file:data/a.db?mode=ro")).toBe(join(DATA_DIR, "a.db"));
    expect(resolveDbPath("/tmp/outro.db")).toBe("/tmp/outro.db");
  });
});
