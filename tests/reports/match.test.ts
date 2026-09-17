import { type SaleForMatch, matchShopee, matchTiktok } from "@/lib/reports/match";
import { describe, expect, it } from "vitest";

function sale(partial: Partial<SaleForMatch>): SaleForMatch {
  return {
    id: partial.id ?? 1,
    channel: partial.channel ?? "shopee",
    xmlFilename: partial.xmlFilename ?? null,
    firstItem: partial.firstItem ?? null,
    saleDate: partial.saleDate ?? new Date("2026-09-01T00:00:00"),
    receivedCents: partial.receivedCents ?? null,
  };
}

describe("reports.matchShopee (005/US3)", () => {
  it("casa por ID do pedido no nome da NFe; só vendas sem recebido", () => {
    const sales = [
      sale({ id: 10, channel: "shopee", xmlFilename: "260907C6P2FS35_invoice_file_x.xml" }),
      sale({ id: 11, channel: "shopee", xmlFilename: "260908GPTSCXWF_invoice_file_y.xml", receivedCents: 500 }), // já tem recebido
    ];
    const result = matchShopee(sales, [
      { orderId: "260907C6P2FS35", receivedCents: 1117 },
      { orderId: "260908GPTSCXWF", receivedCents: 1238 },
      { orderId: "NOPE999", receivedCents: 100 },
    ]);
    expect(result.matched).toEqual([{ saleId: 10, orderId: "260907C6P2FS35", receivedCents: 1117 }]);
    expect(result.unmatchedOrders.some((u) => u.orderId === "NOPE999")).toBe(true);
  });
});

describe("reports.matchTiktok (005/US3)", () => {
  it("casa por nome+data (alta confiança única); ambíguo fica de fora", () => {
    const sales = [
      sale({
        id: 20,
        channel: "tiktok",
        firstItem: "Ash Greninja Low Poly Pokémon",
        saleDate: new Date("2026-08-13T10:00:00"),
      }),
    ];
    const result = matchTiktok(sales, [
      {
        orderId: "A1",
        sku: "enfeite",
        name: "ash greninja low poly pokemon",
        date: "2026-08-13",
        qty: 1,
        receivedCents: 1186,
      },
    ]);
    expect(result.matched).toEqual([{ saleId: 20, orderId: "A1", receivedCents: 1186 }]);
  });

  it("duas vendas do mesmo nome no mesmo dia → nenhum auto-match (ambíguo)", () => {
    const sales = [
      sale({
        id: 20,
        channel: "tiktok",
        firstItem: "Ash Greninja Low Poly Pokémon",
        saleDate: new Date("2026-08-13T10:00:00"),
      }),
      sale({
        id: 21,
        channel: "tiktok",
        firstItem: "Ash Greninja Low Poly Pokémon",
        saleDate: new Date("2026-08-13T11:00:00"),
      }),
    ];
    const result = matchTiktok(sales, [
      {
        orderId: "A1",
        sku: "enfeite",
        name: "ash greninja low poly pokemon",
        date: "2026-08-13",
        qty: 1,
        receivedCents: 1186,
      },
      {
        orderId: "A2",
        sku: "enfeite",
        name: "ash greninja low poly pokemon",
        date: "2026-08-13",
        qty: 1,
        receivedCents: 1186,
      },
    ]);
    expect(result.matched).toHaveLength(0);
  });
});
