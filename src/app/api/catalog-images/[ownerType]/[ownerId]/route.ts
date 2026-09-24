import { getCatalogImageResponse } from "@/lib/catalog/image-route";
import { CatalogMediaStore } from "@/lib/catalog/media-store";
import { getDb } from "@/lib/db/client";
import type { NextRequest } from "next/server";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ ownerType: string; ownerId: string }> },
) {
  const { ownerType, ownerId } = await params;
  return getCatalogImageResponse({ ownerType, ownerId }, { db: getDb().db, mediaStore: new CatalogMediaStore() });
}
