import {
  type ProductCodeRow,
  createProduct,
  createProductCode,
  deleteProductCode,
  listProductCodes,
  listVariants,
} from "@/lib/catalog/service";
import type { Db } from "@/lib/db/client";
import { linkCProd } from "@/lib/xml/link";
import { describe, expect, it } from "vitest";
import { setupTestDb } from "./helpers/db";

/**
 * T029 [US2] — gestão de product_codes (multi-código por canal) na granularidade
 * de VARIANTE. Canal "geral" = null (vale para qualquer canal); vínculo alimenta o import.
 */

function defaultVariantId(db: Db, productId: number): number {
  const variants = listVariants(productId, { db });
  const variant = variants[0];
  if (!variant) throw new Error("produto sem variante default");
  return variant.id;
}

function makeProduct(db: Db): number {
  const product = createProduct({ name: "Mini Pikachu", categoryId: null }, { db });
  if (!product.ok) throw new Error(product.error);
  return product.value.id;
}

describe("catalog codes", () => {
  it("cria código específico (shopee) e geral; lista por variante", () => {
    const { db, cleanup } = setupTestDb();
    try {
      const productId = makeProduct(db);
      const variantId = defaultVariantId(db, productId);

      const shopee = createProductCode(variantId, { code: "P001", channel: "shopee" }, { db });
      expect(shopee.ok).toBe(true);
      const geral = createProductCode(variantId, { code: "PQ001", channel: "geral" }, { db });
      expect(geral.ok).toBe(true);

      const codes = listProductCodes(variantId, { db });
      expect(codes).toHaveLength(2);
      const channels = codes.map((c) => c.channel).sort();
      expect(channels).toEqual([null, "shopee"]);
    } finally {
      cleanup();
    }
  });

  it("rejeita código duplicado no MESMO canal (específico e geral)", () => {
    const { db, cleanup } = setupTestDb();
    try {
      const variantId = defaultVariantId(db, makeProduct(db));
      createProductCode(variantId, { code: "P001", channel: "shopee" }, { db });

      const dupSpecific = createProductCode(variantId, { code: "p001  ", channel: "shopee" }, { db });
      expect(dupSpecific.ok).toBe(false);
      if (dupSpecific.ok) return;
      expect(dupSpecific.error).toMatch(/já/i);

      createProductCode(variantId, { code: "PQ001", channel: "geral" }, { db });
      const dupGeral = createProductCode(variantId, { code: "PQ001", channel: "geral" }, { db });
      expect(dupGeral.ok).toBe(false);
    } finally {
      cleanup();
    }
  });

  it("permite o mesmo código em canais diferentes (shopee vs tiktok)", () => {
    const { db, cleanup } = setupTestDb();
    try {
      const variantId = defaultVariantId(db, makeProduct(db));
      expect(createProductCode(variantId, { code: "X1", channel: "shopee" }, { db }).ok).toBe(true);
      expect(createProductCode(variantId, { code: "X1", channel: "tiktok" }, { db }).ok).toBe(true);
      expect(listProductCodes(variantId, { db })).toHaveLength(2);
    } finally {
      cleanup();
    }
  });

  it("valida canal inexistente e código vazio", () => {
    const { db, cleanup } = setupTestDb();
    try {
      const variantId = defaultVariantId(db, makeProduct(db));
      // @ts-expect-error canal inválido (simula input não-válido)
      const bad = createProductCode(variantId, { code: "X", channel: "nubank" }, { db });
      expect(bad.ok).toBe(false);
      const empty = createProductCode(variantId, { code: "   ", channel: "shopee" }, { db });
      expect(empty.ok).toBe(false);
    } finally {
      cleanup();
    }
  });

  it("rejeita código para variante inexistente", () => {
    const { db, cleanup } = setupTestDb();
    try {
      const res = createProductCode(999, { code: "X1", channel: "shopee" }, { db });
      expect(res.ok).toBe(false);
      if (res.ok) return;
      expect(res.error).toMatch(/variante/i);
    } finally {
      cleanup();
    }
  });

  it("deleta código e atualiza a lista", () => {
    const { db, cleanup } = setupTestDb();
    try {
      const variantId = defaultVariantId(db, makeProduct(db));
      const created = createProductCode(variantId, { code: "P001", channel: "tiktok" }, { db });
      expect(created.ok).toBe(true);
      if (!created.ok) return;

      expect(deleteProductCode(created.value.code.id, { db }).ok).toBe(true);
      expect(listProductCodes(variantId, { db })).toHaveLength(0);
    } finally {
      cleanup();
    }
  });

  it("código cadastrado já casa cProd no vínculo (gancho do import)", () => {
    const { db, cleanup } = setupTestDb();
    try {
      const variantId = defaultVariantId(db, makeProduct(db));
      createProductCode(variantId, { code: "P001", channel: "shopee" }, { db });

      const codes = listProductCodes(variantId, { db }) as (ProductCodeRow & { channel: string | null })[];
      const lookup = codes.map((c) => ({
        code: c.code,
        channel: c.channel,
        variant: { id: variantId, costCents: 500 },
      }));
      const linked = linkCProd("P001", "shopee", lookup);

      expect(linked.variantId).toBe(variantId);
      expect(linked.frozenCostCents).toBe(500);
    } finally {
      cleanup();
    }
  });
});
