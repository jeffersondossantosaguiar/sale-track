import { reverseCashEntry } from "@/lib/cash/service";
import { type ProductRow, createProduct, createProductCode, listProducts } from "@/lib/catalog/service";
import { buildExtratoCsv } from "@/lib/dashboard/extrato";
import { buildDashboardStats, currentMonth, monthFromParam, monthToParam } from "@/lib/dashboard/service";
import type { Db } from "@/lib/db/client";
import { cashEntries, sales } from "@/lib/db/schema";
import { setNumberSetting } from "@/lib/db/settings";
import { usedRatioBps } from "@/lib/domain/meieto";
import { createPresentialSale, setSaleFee } from "@/lib/sales/service";
import { importNfeToDb } from "@/lib/xml/importer";
import { eq } from "drizzle-orm";
import { describe, expect, it } from "vitest";
import { setupTestDb } from "./helpers/db";

/**
 * US6 (T042–T044): dashboard mensal/anual com % do teto MEI e extrato exportável.
 * T044 — integridade composicional: todo número exibido traça até os registros do
 * banco (os totais aqui são re-derivados por soma independente das linhas brutas).
 */

const MONTH = { year: 2026, month: 8 };

function mkProduct(db: Db, name: string, price: number, cost: number): ProductRow {
  const result = createProduct({ name, categoryId: null, salePriceCents: price, estimatedCostCents: cost }, { db });
  if (!result.ok) throw new Error(result.error);
  const product = listProducts({ db }).find((row) => row.name === name);
  if (!product) throw new Error("produto não criado");
  return product;
}

function importNf(db: Db, invoiceNumber: string, cProd: string, grossCents: number) {
  return importNfeToDb(
    {
      invoiceNumber,
      serie: "1",
      issueDate: new Date("2026-08-10T00:00:00"),
      grossCents,
      items: [
        { nItem: 1, cProd, description: "Item", quantity: 1, unitPriceCents: grossCents, totalCents: grossCents },
      ],
      warnings: [],
    },
    "shopee",
    `nf-${invoiceNumber}.xml`,
    { db },
  );
}

/** Semente completa de um mês: NF Shopee com taxa + venda presencial + gastos. */
function seedMonth(db: Db): { presentialSaleId: number; cashOutId: number } {
  const product = mkProduct(db, "Busto Eiffel", 10_000, 4_000);
  const code = createProductCode(product.id, { code: "X1", channel: "shopee" }, { db });
  if (!code.ok) throw new Error(code.error);

  setNumberSetting("channel_fee_bps_shopee", 1200, { db }); // 12% — nasce a taxa
  const imported = importNf(db, "000300", "X1", 10_000);
  if (!imported.ok) throw new Error(imported.reason);
  setSaleFee(imported.saleId, 1200, { db });

  const presential = createPresentialSale(
    {
      saleDate: "2026-08-15",
      receivedCents: 5_000,
      items: [{ productId: product.id, quantity: 1 }],
    },
    { db },
  );
  if (!presential.ok) throw new Error(presential.error);

  const cashOut = db
    .insert(cashEntries)
    .values({
      date: new Date("2026-08-16T00:00:00"),
      type: "saida",
      category: "filamento",
      amountCents: 800,
      description: "filamento PLA 1kg",
      status: "normal",
      createdAt: new Date(),
    })
    .run();

  return { presentialSaleId: presential.value.saleId, cashOutId: Number(cashOut.lastInsertRowid) };
}

describe("dashboard — resumo do mês (T042)", () => {
  it("faturamento, vendas por canal, caixa e % do teto MEI boram dos dados (FR-012/FR-013)", () => {
    const { db, cleanup } = setupTestDb();
    try {
      seedMonth(db);
      const stats = buildDashboardStats(MONTH, { db });

      expect(stats.monthLabel).toBe("08/2026");
      expect(stats.monthGross).toBe(15_000); // NF 10.000 + presencial 5.000
      expect(stats.sales).toHaveLength(2);

      const shopee = stats.byChannel.find((row) => row.channel === "shopee");
      const presencial = stats.byChannel.find((row) => row.channel === "presencial");
      expect(shopee).toMatchObject({ count: 1, grossCents: 10_000, feeCents: 1_200, netCents: 8_800 });
      expect(presencial).toMatchObject({ count: 1, grossCents: 5_000, feeCents: 0, netCents: 5_000 });

      // caixa do mês: entrada da venda presencial 5.000; gasto 800 (filamento)
      expect(stats.cash.total).toBe(4_200);
      expect(stats.cash.entrada).toBe(5_000);
      expect(stats.cash.saida).toBe(800);
      expect(stats.cash.byCategory.venda).toBe(5_000);
      expect(stats.cash.byCategory.filamento).toBe(-800);

      expect(stats.monthGross).toBe(stats.yearGross); // mesmo ano: tudo aconteceu no mês 08
      expect(stats.meiLimitCents).toBe(81_000 * 100);
      expect(stats.meiUsedBps).toBe(usedRatioBps(stats.yearGross, stats.meiLimitCents));
    } finally {
      cleanup();
    }
  });

  it("T044 — totais do dashboard re-derivam das linhas brutas do banco (sem inventar número)", () => {
    const { db, cleanup } = setupTestDb();
    try {
      seedMonth(db);

      const rawSales = db.select().from(sales).all();
      const rawCash = db.select().from(cashEntries).all();
      const start = new Date(2026, 7, 1);
      const end = new Date(2026, 8, 1);

      const bruteMonthGross = rawSales
        .filter((row) => row.status === "normal" && row.saleDate >= start && row.saleDate < end)
        .reduce((sum, row) => sum + row.grossCents, 0);
      const bruteCash = rawCash
        .filter((row) => row.status === "normal" && row.reversalOfId === null && row.date >= start && row.date < end)
        .reduce((sum, row) => sum + (row.type === "entrada" ? row.amountCents : -row.amountCents), 0);

      const stats = buildDashboardStats(MONTH, { db });
      expect(stats.monthGross).toBe(bruteMonthGross);
      expect(stats.cash.total).toBe(bruteCash);
      expect(stats.yearGross).toBe(bruteMonthGross); // mesmo ano, tudo no mês 08
    } finally {
      cleanup();
    }
  });

  it("caixa estornado zera seu efeito no saldo (reembolso aparece, não duplica)", () => {
    const { db, cleanup } = setupTestDb();
    try {
      const { cashOutId } = seedMonth(db);
      const before = buildDashboardStats(MONTH, { db });
      expect(before.cash.total).toBe(4_200);

      const reversed = reverseCashEntry(cashOutId, { date: "2026-08-17" }, { db });
      expect(reversed.ok).toBe(true);

      const after = buildDashboardStats(MONTH, { db });
      expect(after.cash.total).toBe(5_000); // gasto estornado sai do saldo
    } finally {
      cleanup();
    }
  });
});

describe("dashboard — venda estornada sai do faturamento (US6.3)", () => {
  it("venda com status refunded não conta no mês/ano e some do resumo por canal", () => {
    const { db, cleanup } = setupTestDb();
    try {
      const { presentialSaleId } = seedMonth(db);
      const before = buildDashboardStats(MONTH, { db });
      expect(before.monthGross).toBe(15_000);

      db.update(sales).set({ status: "refunded", refundDate: new Date() }).where(eq(sales.id, presentialSaleId)).run();

      const after = buildDashboardStats(MONTH, { db });
      expect(after.monthGross).toBe(10_000); // só a NF Shopee
      expect(after.byChannel.find((row) => row.channel === "presencial")).toBeUndefined();
      expect(after.sales.find((row) => row.id === presentialSaleId)?.status).toBe("refunded");
    } finally {
      cleanup();
    }
  });
});

describe("dashboard — mês por parâmetro (T042)", () => {
  it("monthFromParam aceita YYYY-MM e cai no mês atual quando inválido/ausente", () => {
    const now = currentMonth();
    expect(monthFromParam("2026-08")).toEqual({ year: 2026, month: 8 });
    expect(monthFromParam("2026-13")).toEqual({ year: now.year, month: now.month });
    expect(monthFromParam("bom dia")).toEqual({ year: now.year, month: now.month });
    expect(monthFromParam(null)).toEqual({ year: now.year, month: now.month });
    expect(monthToParam({ year: 2026, month: 8 })).toBe("2026-08");
  });
});

describe("extrato mensal (T043)", () => {
  it("CSV traz vendas do mês, totais, por canal e caixa — base p/ DASN (FR-014)", () => {
    const { db, cleanup } = setupTestDb();
    try {
      seedMonth(db);
      const csv = buildExtratoCsv(buildDashboardStats(MONTH, { db }));

      expect(csv).toContain("faturamento_bruto_cents");
      expect(csv).toContain(";15000;15000;8100000;");
      expect(csv).toContain("vendas;data;canal;nf;bruto_cents;taxa_cents;liquido_cents");
      expect(csv).toContain(";shopee;000300;10000;1200;8800");
      expect(csv).toContain(";presencial;;5000;0;5000");
      expect(csv).toContain("totais_do_mes;;;;15000;1200;13800");
      expect(csv).toContain("por_canal;vendas;bruto_cents;taxa_cents;liquido_cents");
      expect(csv).toContain("shopee;1;10000;1200;8800");
      expect(csv).toContain("caixa_do_mes;entrada_cents;saida_cents;saldo_cents");
      expect(csv).toContain(";5000;800;4200");
      expect(csv).toContain("caixa_por_categoria;liquido_cents");
      expect(csv).toContain("venda;5000");
      expect(csv).toContain("filamento;-800");
    } finally {
      cleanup();
    }
  });
});
