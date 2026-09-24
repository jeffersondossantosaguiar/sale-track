import { randomUUID } from "node:crypto";
import { createReadStream } from "node:fs";
import { mkdir, readFile, rename, rm, stat, writeFile } from "node:fs/promises";
import { basename, join, resolve } from "node:path";
import { DATA_DIR } from "@/lib/db/client";
import { type CatalogImageMetadata, type CatalogImageMime, catalogImageMimeSchema } from "@/lib/domain/catalog";

export const CATALOG_IMAGE_MAX_BYTES = 5 * 1024 * 1024;
export const DEFAULT_CATALOG_MEDIA_ROOT = join(DATA_DIR, "catalog-media");

type SaveInput = {
  bytes: Buffer;
  mime: string;
  originalName: string;
};

export type OpenedCatalogImage = CatalogImageMetadata & {
  path: string;
  stream: NodeJS.ReadableStream;
};

export class CatalogMediaStore {
  readonly root: string;

  constructor(root = process.env.CATALOG_MEDIA_DIR ?? DEFAULT_CATALOG_MEDIA_ROOT) {
    this.root = resolve(root);
  }

  async save(input: SaveInput): Promise<CatalogImageMetadata> {
    const mime = catalogImageMimeSchema.parse(input.mime);
    if (input.bytes.length > CATALOG_IMAGE_MAX_BYTES) throw new Error("imagem excede 5 MiB");
    assertSignature(input.bytes, mime);
    await mkdir(this.root, { recursive: true });
    const ext = extensionFor(mime);
    const key = `${new Date().toISOString().slice(0, 10)}-${randomUUID()}${ext}`;
    const tmp = this.confinedPath(`${key}.tmp`);
    const finalPath = this.confinedPath(key);
    await writeFile(tmp, input.bytes, { flag: "wx" });
    await rename(tmp, finalPath);
    return { key, mime, originalName: basename(input.originalName || key), bytes: input.bytes.length };
  }

  async open(meta: CatalogImageMetadata): Promise<OpenedCatalogImage> {
    const path = this.confinedPath(meta.key);
    await stat(path);
    return { ...meta, path, stream: createReadStream(path) };
  }

  async read(meta: CatalogImageMetadata): Promise<Buffer> {
    return readFile(this.confinedPath(meta.key));
  }

  async delete(key: string | null | undefined): Promise<void> {
    if (!key) return;
    await rm(this.confinedPath(key), { force: true });
  }

  confinedPath(key: string): string {
    if (key.includes("/") || key.includes("\\") || key.includes("..")) throw new Error("chave de imagem inválida");
    const full = resolve(this.root, key);
    if (!full.startsWith(`${this.root}/`)) throw new Error("chave de imagem inválida");
    return full;
  }
}

function extensionFor(mime: CatalogImageMime): string {
  if (mime === "image/jpeg") return ".jpg";
  if (mime === "image/png") return ".png";
  return ".webp";
}

function assertSignature(bytes: Buffer, mime: CatalogImageMime): void {
  const ok =
    (mime === "image/jpeg" && bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) ||
    (mime === "image/png" &&
      bytes.length >= 8 &&
      bytes[0] === 0x89 &&
      bytes[1] === 0x50 &&
      bytes[2] === 0x4e &&
      bytes[3] === 0x47 &&
      bytes[4] === 0x0d &&
      bytes[5] === 0x0a &&
      bytes[6] === 0x1a &&
      bytes[7] === 0x0a) ||
    (mime === "image/webp" &&
      bytes.length >= 12 &&
      bytes.subarray(0, 4).toString("ascii") === "RIFF" &&
      bytes.subarray(8, 12).toString("ascii") === "WEBP");
  if (!ok) throw new Error("assinatura de imagem incompatível com MIME");
}
