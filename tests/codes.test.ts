import {
  type ProductCodeRow,
  createProduct,
  createProductCode,
  deleteProductCode,
  listProductCodes,
} from "@/lib/catalog/service";
import { linkCProd } from "@/lib/xml/link";
import { describe, expect, it } from "vitest";
import { setupTestDb } from "./helpers/db";

/**
 * T029 [US2] — gestão de product_codes (multi-código por canal).
 * Canal "geral" = null (vale para qualquer canal); vínculo alimenta o import.
 */

const PIKACHU = { name: "Mini Pikachu", categoryId: null, salePriceCents: 1990, estimatedCostCents: 500 };

describe("catalog codes", () => {
  it("cria código específico (shopee) e geral; lista por produto", () => {
    const { db, cleanup } = setupTestDb();
    try {
      const product = createProduct(PIKACHU, { db });
      if (!product.ok) return;

      const shopee = createProductCode(product.value.id, { code: "P001", channel: "shopee" }, { db });
      expect(shopee.ok).toBe(true);
      const geral = createProductCode(product.value.id, { code: "PQ001", channel: "geral" }, { db });
      expect(geral.ok).toBe(true);

      const codes = listProductCodes(product.value.id, { db });
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
      const product = createProduct(PIKACHU, { db });
      if (!product.ok) return;
      createProductCode(product.value.id, { code: "P001", channel: "shopee" }, { db });

      const dupSpecific = createProductCode(product.value.id, { code: "p001  ", channel: "shopee" }, { db });
      expect(dupSpecific.ok).toBe(false);
      if (dupSpecific.ok) return;
      expect(dupSpecific.error).toMatch(/já/i);

      createProductCode(product.value.id, { code: "PQ001", channel: "geral" }, { db });
      const dupGeral = createProductCode(product.value.id, { code: "PQ001", channel: "geral" }, { db });
      expect(dupGeral.ok).toBe(false);
    } finally {
      cleanup();
    }
  });

  it("permite o mesmo código em canais diferentes (shopee vs tiktok)", () => {
    const { db, cleanup } = setupTestDb();
    try {
      const product = createProduct(PIKACHU, { db });
      if (!product.ok) return;
      expect(createProductCode(product.value.id, { code: "X1", channel: "shopee" }, { db }).ok).toBe(true);
      expect(createProductCode(product.value.id, { code: "X1", channel: "tiktok" }, { db }).ok).toBe(true);
      expect(listProductCodes(product.value.id, { db })).toHaveLength(2);
    } finally {
      cleanup();
    }
  });

  it("valida canal inexistente e código vazio", () => {
    const { db, cleanup } = setupTestDb();
    try {
      const product = createProduct(PIKACHU, { db });
      if (!product.ok) return;
      // @ts-expect-error canal inválido (simula input não-válido)
      const bad = createProductCode(product.value.id, { code: "X", channel: "nubank" }, { db });
      expect(bad.ok).toBe(false);
      const empty = createProductCode(product.value.id, { code: "   ", channel: "shopee" }, { db });
      expect(empty.ok).toBe(false);
    } finally {
      cleanup();
    }
  });

  it("rejeita código para produto inexistente", () => {
    const { db, cleanup } = setupTestDb();
    try {
      const res = createProductCode(999, { code: "X1", channel: "shopee" }, { db });
      expect(res.ok).toBe(false);
      if (res.ok) return;
      expect(res.error).toMatch(/produto/i);
    } finally {
      cleanup();
    }
  });

  it("deleta código e atualiza a lista", () => {
    const { db, cleanup } = setupTestDb();
    try {
      const product = createProduct(PIKACHU, { db });
      if (!product.ok) return;
      const created = createProductCode(product.value.id, { code: "P001", channel: "tiktok" }, { db });
      expect(created.ok).toBe(true);
      if (!created.ok) return;

      expect(deleteProductCode(created.value.code.id, { db }).ok).toBe(true);
      expect(listProductCodes(product.value.id, { db })).toHaveLength(0);
    } finally {
      cleanup();
    }
  });

  it("código cadastrado já casa cProd no vínculo (gancho do import)", () => {
    const { db, cleanup } = setupTestDb();
    try {
      const product = createProduct(PIKACHU, { db });
      if (!product.ok) return;
      createProductCode(product.value.id, { code: "P001", channel: "shopee" }, { db });

      const codes = listProductCodes(product.value.id, { db }) as (ProductCodeRow & {
        channel: string | null;
      })[];
      const lookup = codes.map((c) => ({ code: c.code, channel: c.channel, product: product.value.id }));
      const linked = linkCProd(
        "P001",
        "shopee",
        [...lookup].map((row) => ({
          code: row.code,
          channel: row.channel,
          product: { id: row.product, estimatedCostCents: 500 },
        })),
      );

      expect(linked.productId).toBe(product.value.id);
      expect(linked.frozenCostCents).toBe(500);
    } finally {
      cleanup();
    }
  });
});
