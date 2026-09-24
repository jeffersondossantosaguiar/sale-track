import {
  normalizeCode,
  normalizeSku,
  productCodeInputSchema,
  productInputSchema,
  variantInputSchema,
} from "@/lib/domain/catalog";
import { describe, expect, it } from "vitest";

describe("catalog domain normalization", () => {
  it("normaliza SKU e código externo para uppercase com espaços colapsados", () => {
    expect(normalizeSku(" ab\t12  cd ")).toBe("AB 12 CD");
    expect(normalizeCode("  tiktok desc  ")).toBe("TIKTOK DESC");
  });

  it("valida campos opcionais do produto e converte vazio para null", () => {
    const parsed = productInputSchema.parse({
      name: "  Mini   Charmander ",
      productType: "",
      theme: " Pokemon ",
      primaryColor: " Laranja ",
      sizeLabel: " 10cm ",
      finish: " Fosco ",
      internalNotes: " obs ",
    });
    expect(parsed).toMatchObject({
      name: "Mini Charmander",
      productType: null,
      theme: "Pokemon",
      primaryColor: "Laranja",
      sizeLabel: "10cm",
      finish: "Fosco",
      internalNotes: "obs",
    });
  });

  it("aplica limites do catálogo mestre e overrides da variante", () => {
    expect(productInputSchema.safeParse({ name: "x".repeat(121) }).success).toBe(false);
    expect(productInputSchema.safeParse({ name: "Ok", internalNotes: "x".repeat(2001) }).success).toBe(false);
    expect(variantInputSchema.safeParse(baseVariant({ sku: "x".repeat(61) })).success).toBe(false);
    expect(variantInputSchema.safeParse(baseVariant({ colorOverride: "x".repeat(61) })).success).toBe(false);
    expect(variantInputSchema.safeParse(baseVariant({ notesOverride: "x".repeat(2001) })).success).toBe(false);
  });

  it("rejeita TikTok Padrao", () => {
    expect(productCodeInputSchema.safeParse({ code: "Padrao", channel: "tiktok" }).success).toBe(false);
    expect(productCodeInputSchema.safeParse({ code: "Padrao", channel: "shopee" }).success).toBe(true);
  });
});

function baseVariant(extra: Record<string, unknown> = {}) {
  return {
    sku: " sku 01 ",
    name: "Padrao",
    printTimeMin: 0,
    manualTimeMin: 0,
    filamentMaterialId: null,
    filamentGrams: 0,
    packagingCents: 0,
    accessoriesCents: 0,
    ...extra,
  };
}
