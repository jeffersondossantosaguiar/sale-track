import type { CatalogMediaStore } from "@/lib/catalog/media-store";
import { getCatalogImageMetadata } from "@/lib/catalog/service";
import type { Db } from "@/lib/db/client";
import { NextResponse } from "next/server";

type CatalogImageRouteDeps = {
  db: Db;
  mediaStore: CatalogMediaStore;
};

export async function getCatalogImageResponse(
  { ownerType, ownerId }: { ownerType: string; ownerId: string },
  deps: CatalogImageRouteDeps,
) {
  if (ownerType !== "product" && ownerType !== "variant") {
    return NextResponse.json({ error: "ownerType inválido" }, { status: 400 });
  }
  const id = Number(ownerId);
  if (!Number.isInteger(id) || id <= 0) return NextResponse.json({ error: "ownerId inválido" }, { status: 400 });

  const meta = getCatalogImageMetadata(ownerType, id, { db: deps.db });
  if (!meta.ok) return NextResponse.json({ error: meta.error }, { status: 404 });

  try {
    const opened = await deps.mediaStore.open(meta.value);
    return new NextResponse(opened.stream as unknown as BodyInit, {
      headers: {
        "Content-Type": opened.mime,
        "Content-Length": String(opened.bytes),
        "X-Content-Type-Options": "nosniff",
        "Cache-Control": "private, max-age=60",
      },
    });
  } catch {
    return NextResponse.json({ error: "arquivo de imagem não encontrado" }, { status: 404 });
  }
}
