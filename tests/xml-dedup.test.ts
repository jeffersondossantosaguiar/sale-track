import { sales } from "@/lib/db/schema";
import { importNfeToDb } from "@/lib/xml/importer";
import { parseXmlInvoice } from "@/lib/xml/parser";
import { describe, expect, it } from "vitest";
import { FIXTURE_SHOPEE_1, FIXTURE_SHOPEE_4, FIXTURE_SHOPEE_DUP, readFixture, setupTestDb } from "./helpers/db";

describe("T015 — dedup por (nNF, serie, dhEmi) — D4/FR-002", () => {
  it("mesma NFe importada 2x não cria duplicata", () => {
    const { db, cleanup } = setupTestDb();
    try {
      const invoice = parseXmlInvoice(readFixture(FIXTURE_SHOPEE_1));
      expect(invoice.ok).toBe(true);
      if (!invoice.ok) return;

      const first = importNfeToDb(invoice.invoice, "shopee", FIXTURE_SHOPEE_1, { db });
      expect(first).toMatchObject({ ok: true });

      const second = importNfeToDb(invoice.invoice, "shopee", FIXTURE_SHOPEE_DUP, { db });
      expect(second).toMatchObject({ ok: false, reason: "duplicate" });

      const count = db.select({ id: sales.id }).from(sales).all();
      expect(count).toHaveLength(1);
    } finally {
      cleanup();
    }
  });

  it("nota diferente (mesmo número, outro dhEmi) escapa do dedup", () => {
    const { db, cleanup } = setupTestDb();
    try {
      const a = parseXmlInvoice(readFixture(FIXTURE_SHOPEE_1));
      const b = parseXmlInvoice(readFixture(FIXTURE_SHOPEE_4));
      expect(a.ok && b.ok).toBe(true);
      if (!a.ok || !b.ok) return;

      expect(importNfeToDb(a.invoice, "shopee", FIXTURE_SHOPEE_1, { db })).toMatchObject({ ok: true });

      // b tem nNF 804 (≠ 772) → não é duplicata
      expect(importNfeToDb(b.invoice, "shopee", FIXTURE_SHOPEE_4, { db })).toMatchObject({ ok: true });

      const rows = db.select({ id: sales.id, invoiceNumber: sales.invoiceNumber }).from(sales).all();
      expect(rows).toHaveLength(2);
    } finally {
      cleanup();
    }
  });

  it("dedup também detecta no banco persistido (reimport pós-restart)", () => {
    const { db, cleanup } = setupTestDb();
    try {
      const duplicated = parseXmlInvoice(readFixture(FIXTURE_SHOPEE_DUP));
      expect(duplicated.ok).toBe(true);
      if (!duplicated.ok) return;

      const outcome = importNfeToDb(duplicated.invoice, "shopee", FIXTURE_SHOPEE_DUP, { db });
      expect(outcome).toMatchObject({ ok: true });

      // Mesma chave vinda de outro arquivo do lote
      const again = importNfeToDb(duplicated.invoice, "shopee", FIXTURE_SHOPEE_1, { db });
      expect(again).toMatchObject({ ok: false, reason: "duplicate" });
    } finally {
      cleanup();
    }
  });
});
