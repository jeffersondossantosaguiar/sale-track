import { itemMatchKey, linkItems } from "@/lib/xml/link";
import { describe, expect, it } from "vitest";

describe("T017 — vínculo por chave de canal via product_codes", () => {
  const code = (code: string, channel: string | null, variantId: number, costCents = 0) => ({
    code,
    channel,
    variant: { id: variantId, costCents },
  });

  it("casa código específico do canal", () => {
    const linked = linkItems([{ cProd: "SKU" }, { cProd: "OUTRO" }], "shopee", [
      code("SKU", "shopee", 1, 1000),
      code("OUTRO", "shopee", 2, 777),
    ]);
    expect(linked).toEqual([
      { cProd: "SKU", variantId: 1, frozenCostCents: 1000 },
      { cProd: "OUTRO", variantId: 2, frozenCostCents: 777 },
    ]);
  });

  it("fallback para código geral quando não há código do canal", () => {
    const linked = linkItems([{ cProd: "SKU" }], "tiktok", [code("SKU", null, 2, 50)]);
    expect(linked[0].variantId).toBe(2);
    expect(linked[0].frozenCostCents).toBe(50);
  });

  it("prefere código do canal sobre o geral", () => {
    const linked = linkItems([{ cProd: "SKU" }], "shopee", [code("SKU", null, 1, 10), code("SKU", "shopee", 2, 20)]);
    expect(linked[0].variantId).toBe(2);
  });

  it("não casa código de outro canal para o canal atual", () => {
    const linked = linkItems([{ cProd: "SKU" }], "shopee", [code("SKU", "tiktok", 9)]);
    expect(linked[0]).toEqual({ cProd: "SKU", variantId: null, frozenCostCents: null });
  });

  it("presencial só casa códigos gerais", () => {
    const linked = linkItems([{ cProd: "SKU" }], "presencial", [code("SKU", "shopee", 9), code("SKU", null, 3, 0)]);
    expect(linked[0].variantId).toBe(3);
    expect(linked[0].frozenCostCents).toBe(0); // custo zero é custo válido
  });

  it("sem match → item sem vínculo (não bloqueia lote)", () => {
    const linked = linkItems([{ cProd: "NOPE" }], "shopee", []);
    expect(linked[0]).toEqual({ cProd: "NOPE", variantId: null, frozenCostCents: null });
  });

  it("itemMatchKey usa descrição no TikTok e cProd nos demais canais", () => {
    expect(itemMatchKey("tiktok", { cProd: "Padrao", description: "Luffy Low Poly" })).toBe("Luffy Low Poly");
    expect(itemMatchKey("tiktok", { cProd: "Padrao" })).toBe("Padrao"); // fallback
    expect(itemMatchKey("shopee", { cProd: "SKU1", description: "ignorada" })).toBe("SKU1");
    expect(itemMatchKey("presencial", { cProd: "BALCAO" })).toBe("BALCAO");
  });

  it("vinca item TikTok pela descrição, não pelo cProd genérico 'Padrao'", () => {
    const linked = linkItems([{ cProd: "Padrao", description: "Luffy Low Poly" }], "tiktok", [
      code("Luffy Low Poly", "tiktok", 5, 900),
    ]);
    expect(linked[0]).toEqual({ cProd: "Padrao", variantId: 5, frozenCostCents: 900 });
  });

  it("vinca item Shopee pelo cProd, ignorando a descrição", () => {
    const linked = linkItems([{ cProd: "SKU1", description: "qualquer" }], "shopee", [
      code("SKU1", "shopee", 3),
      code("qualquer", "shopee", 9),
    ]);
    expect(linked[0].variantId).toBe(3);
  });
});
