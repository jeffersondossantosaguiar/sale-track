import { createProduct, createProductCode, listVariants } from "@/lib/catalog/service";
import type { Db } from "@/lib/db/client";
import { sales, variants } from "@/lib/db/schema";
import { getNumberSetting, setNumberSetting } from "@/lib/db/settings";
import { feeFromBps, marginOf, netOf } from "@/lib/domain/cxmoney";
import { parseFeeTiersText, percentToBps } from "@/lib/domain/fees";
import { byChannelSummary, getChannelFeeBps, setReceived, setSaleFee } from "@/lib/sales/service";
import { importNfeToDb } from "@/lib/xml/importer";
import { eq } from "drizzle-orm";
import { describe, expect, it } from "vitest";
import { setupTestDb } from "./helpers/db";

/**
 * US5 (T039–T040): taxa por venda — default = % padrão do canal (configurável),
 * editável por venda; líquido = bruto − taxa. O BRUTO (faturamento da NFe) NUNCA
 * muda; só taxa → líquido → margem são recalculados (T040).
 */

function mkVariant(db: Db, name: string, cost: number): number {
  const result = createProduct({ name, categoryId: null }, { db });
  if (!result.ok) throw new Error(result.error);
  const rows = listVariants(result.value.id, { db });
  const variant = rows[0];
  if (!variant) throw new Error("produto sem variante default");
  db.update(variants).set({ costCents: cost }).where(eq(variants.id, variant.id)).run();
  return variant.id;
}

/** Importa uma NF de canal com um item vinculado (tracka custo congelado). */
function importNf(db: Db, invoiceNumber: string, cProd: string, grossCents: number, channel: "shopee" | "tiktok") {
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
    channel,
    `nf-${invoiceNumber}.xml`,
    { db },
  );
}

describe("fees.domain — percentual → bps (004/US3)", () => {
  it("20% → 2000bps; 16% → 1600bps", () => {
    expect(percentToBps(20)).toBe(2000);
    expect(percentToBps(16)).toBe(1600);
  });

  it("fraciona e limita a 0..100%", () => {
    expect(percentToBps(0.5)).toBe(50);
    expect(percentToBps(0)).toBe(0);
    expect(percentToBps(150)).toBe(10000);
    expect(percentToBps(-5)).toBe(0);
  });
});

describe("fees.domain — parse de faixas de texto (005/US2)", () => {
  it("converte regras do editor em faixas ordenadas em centavos/bps", () => {
    const tiers = parseFeeTiersText("<= 79,99 = 20% + 4\n80,00 - 99,99 = 14% + 4\n>= 500,00 = 14% + 26");
    expect(tiers).toEqual([
      { minCents: 0, maxCents: 7999, commissionBps: 2000, fixedCents: 400 },
      { minCents: 8000, maxCents: 9999, commissionBps: 1400, fixedCents: 400 },
      { minCents: 50000, maxCents: null, commissionBps: 1400, fixedCents: 2600 },
    ]);
  });

  it("rejeita formato inválido, faixa invertida e sobreposição", () => {
    expect(() => parseFeeTiersText("79,99 = 20% + 4")).toThrow(/faixa inválida/i);
    expect(() => parseFeeTiersText("<= 99,99 = 10% + 1\n>= 50,00 = 20% + 4")).toThrow(/sobrep/i);
    expect(() => parseFeeTiersText("")).toThrow(/ao menos uma faixa/i);
  });
});

describe("service sales — taxas por venda (T040)", () => {
  it("setSaleFee recalcula taxa/líquido/margem sem mutar o bruto do faturamento", () => {
    const { db, cleanup } = setupTestDb();
    try {
      const variantId = mkVariant(db, "Busto Eiffel", 4_000);
      const code = createProductCode(variantId, { code: "X1", channel: "shopee" }, { db });
      expect(code.ok).toBe(true);
      const imported = importNf(db, "000200", "X1", 10_000, "shopee");
      expect(imported.ok).toBe(true);
      if (!imported.ok) return;

      const before = getChannelFeeBps("shopee", { db });
      expect(before).toBe(0); // sem configurar, importa SEM taxa

      const result = setSaleFee(imported.saleId, 1200, { db });
      expect(result.ok).toBe(true);
      if (!result.ok) return;

      const sale = result.value.sale;
      expect(sale.grossCents).toBe(10_000); // faturamento imutável
      expect(sale.feeCents).toBe(feeFromBps(10_000, 1200)); // 12% = R$ 120
      expect(sale.netCents).toBe(netOf(10_000, 1_200));
      expect(sale.liquidCents).toBe(marginOf(10_000, 1_200, 4_000)); // margem após taxa
      expect(sale.itemCount).toBe(1);
    } finally {
      cleanup();
    }
  });

  it("setSaleFee com 0 zera a taxa; rejeita fora da faixa e venda inexistente", () => {
    const { db, cleanup } = setupTestDb();
    try {
      const imported = importNf(db, "000201", "SEMVINCULO", 5_000, "shopee");
      expect(imported.ok).toBe(true);
      if (!imported.ok) return;

      expect(setSaleFee(imported.saleId, 0, { db }).ok).toBe(true);
      expect(setSaleFee(imported.saleId, -1, { db }).ok).toBe(false);
      expect(setSaleFee(imported.saleId, 10_001, { db }).ok).toBe(false);
      expect(setSaleFee(999, 1000, { db }).ok).toBe(false);
    } finally {
      cleanup();
    }
  });

  it("importação NÃO pré-preenche taxa (005): recebido pendente → lucro pendente", () => {
    const { db, cleanup } = setupTestDb();
    try {
      const variantId = mkVariant(db, "Busto Eiffel", 4_000);
      const code = createProductCode(variantId, { code: "X1", channel: "shopee" }, { db });
      expect(code.ok).toBe(true);

      // Mesmo com % de canal configurado, a taxa não é pré-preenchida (a verdade é o recebido).
      setNumberSetting("channel_fee_bps_shopee", 1200, { db });
      const importado = importNf(db, "000202", "X1", 10_000, "shopee");
      expect(importado.ok).toBe(true);
      if (!importado.ok) return;

      const imported = db.select().from(sales).where(eq(sales.id, importado.saleId)).get();
      expect(imported?.receivedCents).toBeNull();
      expect(imported?.feeCents).toBe(0);
      expect(imported?.liquidCents).toBe(0);
      expect(imported?.netCents).toBe(10_000);
    } finally {
      cleanup();
    }
  });

  it("setReceived deriva taxa/líquido/lucro a partir do recebido (005)", () => {
    const { db, cleanup } = setupTestDb();
    try {
      const variantId = mkVariant(db, "Busto Eiffel", 4_000);
      const code = createProductCode(variantId, { code: "X1", channel: "shopee" }, { db });
      expect(code.ok).toBe(true);
      const imported = importNf(db, "000204", "X1", 10_000, "shopee");
      expect(imported.ok).toBe(true);
      if (!imported.ok) return;

      const result = setReceived(imported.saleId, 8_800, { db });
      expect(result.ok).toBe(true);
      if (!result.ok) return;

      const sale = result.value.sale;
      expect(sale.grossCents).toBe(10_000); // faturamento imutável
      expect(sale.receivedCents).toBe(8_800);
      expect(sale.feeCents).toBe(1_200); // = (bruto − frete) − recebido
      expect(sale.netCents).toBe(8_800);
      expect(sale.liquidCents).toBe(8_800 - 4_000); // lucro = recebido − custo

      // Limpar recebido → volta a pendente.
      const cleared = setReceived(imported.saleId, null, { db });
      expect(cleared.ok).toBe(true);
      if (!cleared.ok) return;
      expect(cleared.value.sale.receivedCents).toBeNull();
      expect(cleared.value.sale.liquidCents).toBe(0);
    } finally {
      cleanup();
    }
  });

  it("resumo por canal: bruto, taxas derivadas e líquido (cenário US5.3)", () => {
    const { db, cleanup } = setupTestDb();
    try {
      const variantId = mkVariant(db, "Busto Eiffel", 4_000);
      const shopeeCode = createProductCode(variantId, { code: "X1", channel: "shopee" }, { db });
      const tiktokCode = createProductCode(variantId, { code: "X2", channel: "tiktok" }, { db });
      expect(shopeeCode.ok && tiktokCode.ok).toBe(true);

      const shopeeSale = importNf(db, "000204", "X1", 10_000, "shopee");
      expect(shopeeSale.ok).toBe(true);
      const tiktokSale = importNf(db, "000205", "X2", 5_000, "tiktok");
      expect(tiktokSale.ok).toBe(true);
      if (!shopeeSale.ok || !tiktokSale.ok) return;

      // Informa os recebidos → taxas derivadas.
      expect(setReceived(shopeeSale.saleId, 8_800, { db }).ok).toBe(true);
      expect(setReceived(tiktokSale.saleId, 5_000, { db }).ok).toBe(true);

      const summary = byChannelSummary({ db });
      const shopee = summary.find((row) => row.channel === "shopee");
      const tiktok = summary.find((row) => row.channel === "tiktok");
      expect(shopee).toMatchObject({
        channel: "shopee",
        count: 1,
        grossCents: 10_000,
        feeCents: 1_200,
        netCents: 8_800,
      });
      expect(tiktok).toMatchObject({ channel: "tiktok", count: 1, grossCents: 5_000, feeCents: 0, netCents: 5_000 });
    } finally {
      cleanup();
    }
  });
});
