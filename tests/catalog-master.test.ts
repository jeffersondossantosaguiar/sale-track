import { existsSync, readFileSync } from "node:fs";
import { CatalogMediaStore } from "@/lib/catalog/media-store";
import {
  createProduct,
  createProductWithFirstVariant,
  getCatalogImageMetadata,
  listVariants,
  replaceProductImage,
  replaceVariantImage,
} from "@/lib/catalog/service";
import { describe, expect, it } from "vitest";
import { IMAGE_FIXTURES_DIR, setupTestDbWithMedia } from "./helpers/db";

describe("master product catalog", () => {
  it("cadastra produto mestre com primeira variante e SKU informado, sem SKU temporário", () => {
    const { db, cleanup } = setupTestDbWithMedia();
    try {
      const product = createProductWithFirstVariant(
        { name: "Mini Charmander", categoryId: null, primaryColor: "Laranja" },
        {
          sku: "char-001",
          name: "Charmander 12cm",
          printTimeMin: 0,
          manualTimeMin: 0,
          filamentMaterialId: null,
          filamentGrams: 0,
          packagingCents: 0,
          accessoriesCents: 0,
        },
        { db },
      );
      expect(product.ok).toBe(true);
      if (!product.ok) return;
      const variants = listVariants(product.value.id, { db });
      expect(variants).toHaveLength(1);
      expect(variants[0]).toMatchObject({
        id: product.value.variantId,
        sku: "CHAR-001",
        name: "Charmander 12cm",
        effectiveColor: "Laranja",
      });
    } finally {
      cleanup();
    }
  });

  it("cadastra produto mestre, primeira variante e imagem com fallback para variante", async () => {
    const { db, mediaRoot, cleanup } = setupTestDbWithMedia();
    try {
      const product = createProduct({ name: "Mini Squirtle", categoryId: null, primaryColor: "Azul" }, { db });
      expect(product.ok).toBe(true);
      if (!product.ok) return;
      const variant = listVariants(product.value.id, { db })[0];
      expect(variant).toMatchObject({ productName: "Mini Squirtle", effectiveColor: "Azul" });

      const store = new CatalogMediaStore(mediaRoot);
      const image = await replaceProductImage(product.value.id, upload("tiny.jpg", "image/jpeg"), {
        db,
        mediaStore: store,
      });
      expect(image.ok).toBe(true);
      if (!image.ok) return;
      expect(getCatalogImageMetadata("variant", variant.id, { db })).toMatchObject({
        ok: true,
        value: { key: image.value.image?.key, mime: "image/jpeg" },
      });

      const own = await replaceVariantImage(variant.id, upload("tiny.png", "image/png"), { db, mediaStore: store });
      expect(own.ok).toBe(true);
      const effective = getCatalogImageMetadata("variant", variant.id, { db });
      expect(effective.ok && effective.value.mime).toBe("image/png");
    } finally {
      cleanup();
    }
  });

  it("substitui e remove imagem apagando arquivos antigos", async () => {
    const { db, mediaRoot, cleanup } = setupTestDbWithMedia();
    try {
      const product = createProduct({ name: "Mini Psyduck", categoryId: null }, { db });
      expect(product.ok).toBe(true);
      if (!product.ok) return;
      const store = new CatalogMediaStore(mediaRoot);
      const first = await replaceProductImage(product.value.id, upload("tiny.jpg", "image/jpeg"), {
        db,
        mediaStore: store,
      });
      expect(first.ok).toBe(true);
      if (!first.ok || !first.value.image) return;
      const firstPath = store.confinedPath(first.value.image.key);
      expect(existsSync(firstPath)).toBe(true);
      const second = await replaceProductImage(product.value.id, upload("tiny.png", "image/png"), {
        db,
        mediaStore: store,
      });
      expect(second.ok).toBe(true);
      expect(existsSync(firstPath)).toBe(false);
      const removed = await replaceProductImage(product.value.id, null, { db, mediaStore: store });
      expect(removed.ok).toBe(true);
      expect(getCatalogImageMetadata("product", product.value.id, { db }).ok).toBe(false);
    } finally {
      cleanup();
    }
  });
});

function upload(name: string, mime: string) {
  return { bytes: readFileSync(`${IMAGE_FIXTURES_DIR}/${name}`), mime, originalName: name };
}
