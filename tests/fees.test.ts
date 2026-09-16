import { type ProductRow, createProduct, createProductCode, listProducts } from "@/lib/catalog/service";
import type { Db } from "@/lib/db/client";
import { getNumberSetting, setNumberSetting } from "@/lib/db/settings";
import { feeFromBps, marginOf, netOf } from "@/lib/domain/cxmoney";
import { byChannelSummary, getChannelFeeBps, setSaleFee } from "@/lib/sales/service";
import { importNfeToDb } from "@/lib/xml/importer";
import { describe, expect, it } from "vitest";
import { setupTestDb } from "./helpers/db";

/**
 * US5 (T039–T040): taxa por venda — default = % padrão do canal (configurável),
 * editável por venda; líquido = bruto − taxa. O BRUTO (faturamento da NFe) NUNCA
 * muda; só taxa → líquido → margem são recalculados (T040).
 */

function mkProduct(db: Db, name: string, price: number, cost: number): ProductRow {
  const result = createProduct({ name, categoryId: null, salePriceCents: price, estimatedCostCents: cost }, { db });
  if (!result.ok) throw new Error(result.error);
  const product = listProducts({ db }).find((row) => row.name === name);
  if (!product) throw new Error("produto não criado");
  return product;
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

describe("service sales — taxas por venda (T040)", () => {
  it("setSaleFee recalcula taxa/líquido/margem sem mutar o bruto do faturamento", () => {
    const { db, cleanup } = setupTestDb();
    try {
      const product = mkProduct(db, "Busto Eiffel", 10_000, 4_000);
      const code = createProductCode(product.id, { code: "X1", channel: "shopee" }, { db });
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

  it("importação pré-preenche taxa com o % padrão configurado do canal (cenário US5.1)", () => {
    const { db, cleanup } = setupTestDb();
    try {
      const product = mkProduct(db, "Busto Eiffel", 10_000, 4_000);
      const code = createProductCode(product.id, { code: "X1", channel: "shopee" }, { db });
      expect(code.ok).toBe(true);

      setNumberSetting("channel_fee_bps_shopee", 1200, { db });
      const importado = importNf(db, "000202", "X1", 10_000, "shopee");
      expect(importado.ok).toBe(true);
      const configurado = byChannelSummary({ db }).find((row) => row.channel === "shopee");
      expect(configurado?.feeCents).toBe(feeFromBps(10_000, 1200));
      expect(configurado?.netCents).toBe(netOf(10_000, 1_200));

      // sem configurar (ou 0), a taxa nasce 0
      setNumberSetting("channel_fee_bps_shopee", 0, { db });
      const semTaxa = importNf(db, "000203", "X1", 10_000, "shopee");
      expect(semTaxa.ok).toBe(true);
      expect(getNumberSetting("channel_fee_bps_shopee", 0, { db })).toBe(0);
    } finally {
      cleanup();
    }
  });

  it("resumo por canal: bruto, total de taxas e líquido (cenário US5.3)", () => {
    const { db, cleanup } = setupTestDb();
    try {
      const product = mkProduct(db, "Busto Eiffel", 10_000, 4_000);
      const shopeeCode = createProductCode(product.id, { code: "X1", channel: "shopee" }, { db });
      const tiktokCode = createProductCode(product.id, { code: "X2", channel: "tiktok" }, { db });
      expect(shopeeCode.ok && tiktokCode.ok).toBe(true);

      setNumberSetting("channel_fee_bps_shopee", 1200, { db });
      expect(importNf(db, "000204", "X1", 10_000, "shopee").ok).toBe(true);
      expect(importNf(db, "000205", "X2", 5_000, "tiktok").ok).toBe(true);

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
