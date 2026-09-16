import { type CashEntryRow, createCashEntry, listCashEntries, reverseCashEntry } from "@/lib/cash/service";
import type { Db } from "@/lib/db/client";
import { CASH_CATEGORIES, reversalDescriptionFor } from "@/lib/domain/cash";
import { cashSignOf, ownership, signedOf, summarize, totalOf, typeOf } from "@/lib/domain/cashier";
import { describe, expect, it } from "vitest";
import { setupTestDb } from "./helpers/db";

/**
 * US3 (T032–T034): caixa = entradas/saídas por categoria; estorno é status com
 * data, NUNCA exclusão (D7); ledger de caixa é SEPARADO do faturamento (D5/D8).
 */

const validInput = {
  date: "2026-08-01",
  type: "saida",
  category: "filamento",
  amountCents: 1234,
} as const;

function rowsOf(db: Db): CashEntryRow[] {
  return listCashEntries({ db });
}

describe("domain cashier (T034) — ledger de caixa separado do faturamento", () => {
  it("signedOf: entrada +, saida −; totalOf soma só lançamentos ativos", () => {
    expect(cashSignOf("entrada")).toBe(1);
    expect(cashSignOf("saida")).toBe(-1);
    expect(signedOf(1500, "entrada")).toBe(1500);
    expect(signedOf(800, "saida")).toBe(-800);

    const entries = [
      { type: "entrada", amountCents: 5000, status: "normal" as const, reversalOfId: null },
      { type: "saida", amountCents: 1200, status: "normal" as const, reversalOfId: null },
      { type: "saida", amountCents: 900, status: "estornado" as const, reversalOfId: null },
      { type: "entrada", amountCents: 900, status: "normal" as const, reversalOfId: 3 },
    ] as const;
    expect(totalOf(entries)).toBe(5_000 - 1_200);
  });

  it("typeOf separa entradas e saídas ativas", () => {
    const entries = [
      { type: "entrada", amountCents: 5000, status: "normal" as const, reversalOfId: null },
      { type: "saida", amountCents: 1200, status: "normal" as const, reversalOfId: null },
      { type: "entrada", amountCents: 900, status: "normal" as const, reversalOfId: 3 },
    ] as const;
    const by = typeOf(entries);
    expect(by.entrada).toBe(5_000);
    expect(by.saida).toBe(1_200);
  });

  it("ownership/agregados por categoria só contam lançamentos ativos", () => {
    const entries = [
      { type: "saida", amountCents: 100, status: "normal" as const, reversalOfId: null, category: "taxas" },
      { type: "saida", amountCents: 200, status: "normal" as const, reversalOfId: null, category: "filamento" },
      { type: "saida", amountCents: 100, status: "estornado" as const, reversalOfId: null, category: "taxas" },
      { type: "entrada", amountCents: 100, status: "normal" as const, reversalOfId: 1, category: "taxas" },
    ] as const;
    const byCat = ownership(entries);
    expect(byCat.taxas).toBe(-100);
    expect(byCat.filamento).toBe(-200);
  });

  it("summarize monta o payload da página (total, entradas/saídas, por categoria)", () => {
    const entries = [
      { type: "entrada", amountCents: 5000, status: "normal" as const, reversalOfId: null, category: "venda" },
      { type: "saida", amountCents: 1200, status: "normal" as const, reversalOfId: null, category: "taxas" },
      { type: "saida", amountCents: 900, status: "estornado" as const, reversalOfId: null, category: "taxas" },
      { type: "entrada", amountCents: 900, status: "normal" as const, reversalOfId: 1, category: "taxas" },
    ] as const;
    const summary = summarize(entries);
    expect(summary.total).toBe(5_000 - 1_200);
    expect(summary.entrada).toBe(5_000);
    expect(summary.saida).toBe(1_200);
    expect(summary.byCategory.venda).toBe(5_000);
    expect(summary.byCategory.taxas).toBe(-1_200);
  });
});

describe("domain cash (T033) — estorno explícito com data", () => {
  it("CASH_CATEGORIES é exatamente o vocabulário do banco", () => {
    expect(CASH_CATEGORIES).toEqual(["taxas", "filamento", "energia", "manutencao", "embalagem", "venda", "outros"]);
  });

  it("reversalDescriptionFor gera descrição rastreável", () => {
    expect(reversalDescriptionFor({ description: "", category: "taxas" })).toBe("Estorno de lançamento (taxas)");
    expect(reversalDescriptionFor({ description: "Filamento PLA 1kg", category: "taxas" })).toBe(
      'Estorno de "Filamento PLA 1kg"',
    );
  });
});

describe("service cash (T032) — CRUD via Server Action + zod", () => {
  it("cria entrada/saída válidas e lista por data desc", () => {
    const { db, cleanup } = setupTestDb();
    try {
      const a = createCashEntry(validInput, { db });
      expect(a.ok).toBe(true);
      const b = createCashEntry({ ...validInput, date: "2026-08-02", amountCents: 1500 }, { db });
      expect(b.ok).toBe(true);

      const rows = rowsOf(db);
      expect(rows).toHaveLength(2);
      expect(rows[0]?.date.getDate()).toBe(2); // mais recente primeiro
      expect(rows.every((r) => r.status === "normal")).toBe(true);
    } finally {
      cleanup();
    }
  });

  it("rejeita valores inválidos: tipo/categoria desconhecidos, valor <= 0, data ruim", () => {
    const { db, cleanup } = setupTestDb();
    try {
      // @ts-expect-error tipo inválido de propósito
      expect(createCashEntry({ ...validInput, type: "estorno" }, { db }).ok).toBe(false);
      // @ts-expect-error categoria inválida
      expect(createCashEntry({ ...validInput, category: "nada" }, { db }).ok).toBe(false);
      expect(createCashEntry({ ...validInput, amountCents: 0 }, { db }).ok).toBe(false);
      expect(createCashEntry({ ...validInput, amountCents: -5 }, { db }).ok).toBe(false);
      expect(createCashEntry({ ...validInput, date: "não-data" }, { db }).ok).toBe(false);
    } finally {
      cleanup();
    }
  });

  it("rejeita vínculo a venda inexistente", () => {
    const { db, cleanup } = setupTestDb();
    try {
      const res = createCashEntry({ ...validInput, saleId: 999 }, { db });
      expect(res.ok).toBe(false);
      if (res.ok) return;
      expect(res.error).toMatch(/venda/i);
    } finally {
      cleanup();
    }
  });

  it("estorno: original vira 'estornado' com data, cria reversão e o saldo volta ao anterior", () => {
    const { db, cleanup } = setupTestDb();
    try {
      const created = createCashEntry(validInput, { db });
      if (!created.ok) return;
      const { id } = created.value.entry;

      // saldo antes: -1234 (uma saída lançada)
      const before = totalOf(rowsOf(db));
      expect(before).toBe(-1_234);

      const reversed = reverseCashEntry(id, { date: "2026-08-03" }, { db });
      expect(reversed.ok).toBe(true);
      if (!reversed.ok) return;

      const rows = rowsOf(db);
      const original = rows.find((r) => r.id === id);
      expect(original?.status).toBe("estornado");
      expect(original?.reversedAt).toBeInstanceOf(Date);

      const reversal = rows.find((r) => r.reversalOfId === id);
      expect(reversal?.type).toBe("entrada"); // oposto da saida
      expect(reversal?.amountCents).toBe(1_234);
      expect(reversal?.date.getFullYear()).toBe(2026);
      expect(reversal?.description).toContain("Estorno");

      // original estornado sai do saldo e a reversão (rastro) não conta duas vezes:
      // o saldo volta ao estado anterior à saída (= 0)
      expect(totalOf(rows)).toBe(0);
    } finally {
      cleanup();
    }
  });

  it("estornar duas vezes o mesmo lançamento é erro", () => {
    const { db, cleanup } = setupTestDb();
    try {
      const created = createCashEntry(validInput, { db });
      if (!created.ok) return;
      const { id } = created.value.entry;
      expect(reverseCashEntry(id, { date: "2026-08-03" }, { db }).ok).toBe(true);
      const twice = reverseCashEntry(id, { date: "2026-08-04" }, { db });
      expect(twice.ok).toBe(false);
      if (twice.ok) return;
      expect(twice.error).toMatch(/já (foi )?estornad/i);
    } finally {
      cleanup();
    }
  });

  it("estorno de entrada vira saida", () => {
    const { db, cleanup } = setupTestDb();
    try {
      const created = createCashEntry({ ...validInput, type: "entrada" }, { db });
      if (!created.ok) return;
      const { id } = created.value.entry;
      const reversed = reverseCashEntry(id, { date: "2026-08-03" }, { db });
      expect(reversed.ok).toBe(true);
      const reversal = rowsOf(db).find((r) => r.reversalOfId === id);
      expect(reversal?.type).toBe("saida");
    } finally {
      cleanup();
    }
  });
});
