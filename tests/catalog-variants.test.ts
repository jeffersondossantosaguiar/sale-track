import { readFileSync } from "node:fs";
import { CatalogMediaStore } from "@/lib/catalog/media-store";
import {
  createProduct,
  createVariant,
  deleteVariant,
  listVariants,
  replaceProductImage,
  replaceVariantImage,
  updateProduct,
  updateVariant,
} from "@/lib/catalog/service";
import { describe, expect, it } from "vitest";
import { IMAGE_FIXTURES_DIR, setupTestDbWithMedia } from "./helpers/db";

describe("catalog variants inheritance", () => {
  it("herda atributos do produto e permite sobrescrever/remover override", async () => {
    const { db, mediaRoot, cleanup } = setupTestDbWithMedia();
    try {
      const product = createProduct(
        {
          name: "Mini Gengar",
          categoryId: null,
          primaryColor: "Roxo",
          sizeLabel: "10cm",
          finish: "Fosco",
          internalNotes: "Base preta",
        },
        { db },
      );
      expect(product.ok).toBe(true);
      if (!product.ok) return;
      const inherited = listVariants(product.value.id, { db })[0];
      expect(inherited).toMatchObject({
        effectiveColor: "Roxo",
        effectiveSize: "10cm",
        effectiveFinish: "Fosco",
        effectiveNotes: "Base preta",
      });

      const variant = createVariant(
        product.value.id,
        {
          sku: " gengar shiny ",
          name: "Shiny",
          colorOverride: "Cinza",
          sizeOverride: null,
          finishOverride: "",
          notesOverride: "Olhos vermelhos",
          printTimeMin: 0,
          manualTimeMin: 0,
          filamentMaterialId: null,
          filamentGrams: 0,
          packagingCents: 0,
          accessoriesCents: 0,
        },
        { db },
      );
      expect(variant.ok).toBe(true);
      if (!variant.ok) return;
      expect(listVariants(product.value.id, { db }).find((row) => row.id === variant.value.id)).toMatchObject({
        sku: "GENGAR SHINY",
        effectiveColor: "Cinza",
        effectiveSize: "10cm",
        effectiveFinish: "Fosco",
        effectiveNotes: "Olhos vermelhos",
      });

      expect(updateProduct(product.value.id, { primaryColor: "Lilás", finish: "Brilho" }, { db }).ok).toBe(true);
      expect(updateVariant(variant.value.id, { colorOverride: "", notesOverride: "" }, { db }).ok).toBe(true);
      expect(listVariants(product.value.id, { db }).find((row) => row.id === variant.value.id)).toMatchObject({
        effectiveColor: "Lilás",
        effectiveFinish: "Brilho",
        effectiveNotes: "Base preta",
      });

      const store = new CatalogMediaStore(mediaRoot);
      await replaceProductImage(product.value.id, upload("tiny.jpg", "image/jpeg"), { db, mediaStore: store });
      const withProductImage = listVariants(product.value.id, { db }).find((row) => row.id === variant.value.id);
      expect(withProductImage?.effectiveImageMime).toBe("image/jpeg");
      await replaceVariantImage(variant.value.id, upload("tiny.png", "image/png"), { db, mediaStore: store });
      expect(
        listVariants(product.value.id, { db }).find((row) => row.id === variant.value.id)?.effectiveImageMime,
      ).toBe("image/png");
    } finally {
      cleanup();
    }
  });

  it("protege SKU único normalizado e a última variante do produto", () => {
    const { db, cleanup } = setupTestDbWithMedia();
    try {
      const product = createProduct({ name: "Mini Lapras", categoryId: null }, { db });
      expect(product.ok).toBe(true);
      if (!product.ok) return;
      expect(createVariant(product.value.id, baseVariant("LAPRAS AZUL"), { db }).ok).toBe(true);
      expect(createVariant(product.value.id, baseVariant(" lapras   azul "), { db }).ok).toBe(false);
      const rows = listVariants(product.value.id, { db });
      expect(deleteVariant(rows[1].id, { db }).ok).toBe(true);
      expect(deleteVariant(rows[0].id, { db }).ok).toBe(false);
    } finally {
      cleanup();
    }
  });
});

function baseVariant(sku: string) {
  return {
    sku,
    name: sku,
    printTimeMin: 0,
    manualTimeMin: 0,
    filamentMaterialId: null,
    filamentGrams: 0,
    packagingCents: 0,
    accessoriesCents: 0,
  };
}

function upload(name: string, mime: string) {
  return { bytes: readFileSync(`${IMAGE_FIXTURES_DIR}/${name}`), mime, originalName: name };
}
