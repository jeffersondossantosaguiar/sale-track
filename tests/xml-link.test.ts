import { linkItems } from "@/lib/xml/link";
import { describe, expect, it } from "vitest";

describe("T017 — vínculo cProd → produto via product_codes", () => {
  const code = (code: string, channel: string | null, productId: number, estimatedCostCents = 0) => ({
    code,
    channel,
    product: { id: productId, estimatedCostCents },
  });

  it("casa código específico do canal", () => {
    const linked = linkItems([{ cProd: "SKU" }, { cProd: "OUTRO" }], "shopee", [
      code("SKU", "shopee", 1, 1000),
      code("OUTRO", "shopee", 2, 777),
    ]);
    expect(linked).toEqual([
      { cProd: "SKU", productId: 1, frozenCostCents: 1000 },
      { cProd: "OUTRO", productId: 2, frozenCostCents: 777 },
    ]);
  });

  it("fallback para código geral quando não há código do canal", () => {
    const linked = linkItems([{ cProd: "SKU" }], "tiktok", [code("SKU", null, 2, 50)]);
    expect(linked[0].productId).toBe(2);
    expect(linked[0].frozenCostCents).toBe(50);
  });

  it("prefere código do canal sobre o geral", () => {
    const linked = linkItems([{ cProd: "SKU" }], "shopee", [code("SKU", null, 1, 10), code("SKU", "shopee", 2, 20)]);
    expect(linked[0].productId).toBe(2);
  });

  it("não casa código de outro canal para o canal atual", () => {
    const linked = linkItems([{ cProd: "SKU" }], "shopee", [code("SKU", "tiktok", 9)]);
    expect(linked[0]).toEqual({ cProd: "SKU", productId: null, frozenCostCents: null });
  });

  it("presencial só casa códigos gerais", () => {
    const linked = linkItems([{ cProd: "SKU" }], "presencial", [code("SKU", "shopee", 9), code("SKU", null, 3, 0)]);
    expect(linked[0].productId).toBe(3);
    expect(linked[0].frozenCostCents).toBe(0); // custo zero é custo válido
  });

  it("sem match → item sem vínculo (não bloqueia lote)", () => {
    const linked = linkItems([{ cProd: "NOPE" }], "shopee", []);
    expect(linked[0]).toEqual({ cProd: "NOPE", productId: null, frozenCostCents: null });
  });
});
