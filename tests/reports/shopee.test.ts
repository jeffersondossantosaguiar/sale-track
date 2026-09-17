import { parseShopeeReport } from "@/lib/reports/shopee";
import { describe, expect, it } from "vitest";

const CSV = [
  "Relatório,,,",
  ",,",
  "Informações da conta,,",
  "Nome de usuário (vendedor),heroprintstudio,,",
  "Resumo,,,,",
  "Data,Tipo de transação,Descrição,ID do pedido,Direção do dinheiro,Valor,Status",
  "2026-09-17 15:07:24,Renda do pedido,Renda do pedido #260907C6P2FS35,260907C6P2FS35,Entrada,11.17,Transação completa",
  "2026-09-15 10:19:06,Renda do pedido,Renda do pedido #260908GPTSCXWF,260908GPTSCXWF,Entrada,12.38,Transação completa",
  "2026-09-14 08:00:00,Outra,Renda do pedido #999,999,Saída,0.00,Transação completa",
].join("\n");

describe("reports.shopee (005/US3)", () => {
  it("extrai pedidos 'Renda do pedido' com o valor recebido", () => {
    const orders = parseShopeeReport("relatorio.csv", CSV);
    expect(orders).toEqual([
      { orderId: "260907C6P2FS35", receivedCents: 1117 },
      { orderId: "260908GPTSCXWF", receivedCents: 1238 },
    ]);
  });

  it("lança erro sem cabeçalho de transações", () => {
    expect(() => parseShopeeReport("vazio.csv", "a,b,c\n1,2,3")).toThrow(/cabeçalho/i);
  });
});
