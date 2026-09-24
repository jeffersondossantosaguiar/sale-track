import { readFileSync, rmSync } from "node:fs";
import { getCatalogImageResponse } from "@/lib/catalog/image-route";
import { CatalogMediaStore } from "@/lib/catalog/media-store";
import { createProduct, listVariants, replaceProductImage, replaceVariantImage } from "@/lib/catalog/service";
import { describe, expect, it } from "vitest";
import { IMAGE_FIXTURES_DIR, setupTestDbWithMedia } from "./helpers/db";

describe("GET /api/catalog-images/{ownerType}/{ownerId}", () => {
  it("retorna imagem do produto com headers seguros", async () => {
    const { db, mediaRoot, cleanup } = setupTestDbWithMedia();
    try {
      const store = new CatalogMediaStore(mediaRoot);
      const product = createProduct({ name: "Mini Bulbasaur", categoryId: null }, { db });
      expect(product.ok).toBe(true);
      if (!product.ok) return;
      const saved = await replaceProductImage(product.value.id, upload("tiny.jpg", "image/jpeg"), {
        db,
        mediaStore: store,
      });
      expect(saved.ok).toBe(true);

      const response = await getCatalogImageResponse(
        { ownerType: "product", ownerId: String(product.value.id) },
        { db, mediaStore: store },
      );
      expect(response.status).toBe(200);
      expect(response.headers.get("content-type")).toBe("image/jpeg");
      expect(response.headers.get("x-content-type-options")).toBe("nosniff");
      expect(response.headers.get("cache-control")).toBe("private, no-cache");
      expect(response.headers.get("content-disposition")).toBe('inline; filename="tiny.jpg"');
      expect(response.headers.get("content-length")).toBe(String(upload("tiny.jpg", "image/jpeg").bytes.length));
      expect(Buffer.from(await response.arrayBuffer()).length).toBeGreaterThan(0);
    } finally {
      cleanup();
    }
  });

  it("usa fallback da variante para a imagem do produto e prioriza imagem propria", async () => {
    const { db, mediaRoot, cleanup } = setupTestDbWithMedia();
    try {
      const store = new CatalogMediaStore(mediaRoot);
      const product = createProduct({ name: "Mini Squirtle", categoryId: null }, { db });
      expect(product.ok).toBe(true);
      if (!product.ok) return;
      const variant = listVariants(product.value.id, { db })[0];
      await replaceProductImage(product.value.id, upload("tiny.jpg", "image/jpeg"), { db, mediaStore: store });

      const fallback = await getCatalogImageResponse(
        { ownerType: "variant", ownerId: String(variant.id) },
        { db, mediaStore: store },
      );
      expect(fallback.status).toBe(200);
      expect(fallback.headers.get("content-type")).toBe("image/jpeg");
      await fallback.arrayBuffer();

      await replaceVariantImage(variant.id, upload("tiny.png", "image/png"), { db, mediaStore: store });
      const own = await getCatalogImageResponse(
        { ownerType: "variant", ownerId: String(variant.id) },
        { db, mediaStore: store },
      );
      expect(own.status).toBe(200);
      expect(own.headers.get("content-type")).toBe("image/png");
      await own.arrayBuffer();
    } finally {
      cleanup();
    }
  });

  it("retorna 400 para ownerType ou ownerId invalidos", async () => {
    const { db, mediaRoot, cleanup } = setupTestDbWithMedia();
    try {
      const store = new CatalogMediaStore(mediaRoot);
      expect(
        (await getCatalogImageResponse({ ownerType: "sale", ownerId: "1" }, { db, mediaStore: store })).status,
      ).toBe(400);
      expect(
        (await getCatalogImageResponse({ ownerType: "product", ownerId: "abc" }, { db, mediaStore: store })).status,
      ).toBe(400);
    } finally {
      cleanup();
    }
  });

  it("retorna 404 para registro sem imagem, inexistente ou arquivo ausente", async () => {
    const { db, mediaRoot, cleanup } = setupTestDbWithMedia();
    try {
      const store = new CatalogMediaStore(mediaRoot);
      const product = createProduct({ name: "Mini Eevee", categoryId: null }, { db });
      expect(product.ok).toBe(true);
      if (!product.ok) return;
      expect(
        (
          await getCatalogImageResponse(
            { ownerType: "product", ownerId: String(product.value.id) },
            { db, mediaStore: store },
          )
        ).status,
      ).toBe(404);
      expect(
        (await getCatalogImageResponse({ ownerType: "product", ownerId: "999999" }, { db, mediaStore: store })).status,
      ).toBe(404);

      const saved = await replaceProductImage(product.value.id, upload("tiny.webp", "image/webp"), {
        db,
        mediaStore: store,
      });
      expect(saved.ok).toBe(true);
      if (!saved.ok || !saved.value.image) return;
      rmSync(store.confinedPath(saved.value.image.key), { force: true });
      expect(
        (
          await getCatalogImageResponse(
            { ownerType: "product", ownerId: String(product.value.id) },
            { db, mediaStore: store },
          )
        ).status,
      ).toBe(404);
    } finally {
      cleanup();
    }
  });
});

function upload(name: string, mime: string) {
  return { bytes: readFileSync(`${IMAGE_FIXTURES_DIR}/${name}`), mime, originalName: name };
}
