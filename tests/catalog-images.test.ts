import { existsSync, readFileSync } from "node:fs";
import { basename } from "node:path";
import { CatalogMediaStore } from "@/lib/catalog/media-store";
import { describe, expect, it } from "vitest";
import { IMAGE_FIXTURES_DIR, setupTestDbWithMedia } from "./helpers/db";

describe("CatalogMediaStore", () => {
  it("salva, abre e apaga JPEG/PNG/WebP com chave opaca", async () => {
    const { mediaRoot, cleanup } = setupTestDbWithMedia();
    try {
      const store = new CatalogMediaStore(mediaRoot);
      const jpeg = await store.save(file("tiny.jpg", "image/jpeg"));
      const png = await store.save(file("tiny.png", "image/png"));
      const webp = await store.save(file("tiny.webp", "image/webp"));
      expect([jpeg, png, webp].every((meta) => meta.key === basename(meta.key))).toBe(true);
      expect(existsSync(store.confinedPath(jpeg.key))).toBe(true);
      await expect(store.open(jpeg)).resolves.toMatchObject({ mime: "image/jpeg" });
      await store.delete(jpeg.key);
      await store.delete(jpeg.key);
      expect(existsSync(store.confinedPath(jpeg.key))).toBe(false);
    } finally {
      cleanup();
    }
  });

  it("valida MIME, assinatura, limite de tamanho e path traversal", async () => {
    const { mediaRoot, cleanup } = setupTestDbWithMedia();
    try {
      const store = new CatalogMediaStore(mediaRoot);
      await expect(store.save(file("invalid.jpg", "image/jpeg"))).rejects.toThrow(/assinatura/i);
      await expect(store.save(file("too-large.jpg", "image/jpeg"))).rejects.toThrow(/5 MiB/i);
      await expect(store.save(file("tiny.jpg", "image/gif"))).rejects.toThrow();
      expect(() => store.confinedPath("../sale-track.db")).toThrow(/chave/i);
    } finally {
      cleanup();
    }
  });
});

function file(name: string, mime: string) {
  return { bytes: readFileSync(`${IMAGE_FIXTURES_DIR}/${name}`), mime, originalName: name };
}
