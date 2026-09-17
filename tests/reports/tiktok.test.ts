import { parseTiktokReport } from "@/lib/reports/tiktok";
import { describe, expect, it } from "vitest";

const HEADER =
  "Data do demonstrativo,ID do pedido/ajuste,ID do SKU,Quantidade,Nome do produto,Nome do SKU,Data de criação do pedido,Valor total a ser liquidado,Vendas líquidas dos produtos,Custo de frete,Reembolsos de produtos";

const CSV = [
  HEADER,
  "2026/09/17,585535596445860976,1736378475505419673,1,Ash Greninja Low Poly Pokémon,Enfeite Totem,2026/08/13,11.86,18.88,-9.6,0",
  "2026/09/14,585484723744769852,1736378475505419673,2,Ash Greninja Low Poly Pokémon,Enfeite Totem,2026/08/10,22.00,37.76,-8.4,0",
  "2026/08/24,585680011214358007,1734718026323428761,1,Luffy Low Poly,One Piece,2026/08/22,0,-18.31,0,-18.31", // reembolso (valor 0) → ignora
].join("\n");

describe("reports.tiktok (005/US3)", () => {
  it("extrai pedidos com valor a liquidar; ignora reembolsos (valor 0)", () => {
    const orders = parseTiktokReport("income.csv", CSV);
    expect(orders).toHaveLength(2);
    expect(orders[0]).toMatchObject({
      orderId: "585535596445860976",
      receivedCents: 1186,
      qty: 1,
      date: "2026-08-13",
    });
    expect(orders[1]).toMatchObject({ orderId: "585484723744769852", receivedCents: 2200, qty: 2 });
  });

  it("lança erro sem a aba 'Detalhes do pedido'", () => {
    expect(() => parseTiktokReport("outro.csv", "a,b\n1,2")).toThrow(/Detalhes do pedido/i);
  });
});
