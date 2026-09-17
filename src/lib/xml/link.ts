import type { Channel } from "./channel";

/**
 * Vínculo cProd → variante via product_codes (US5).
 * Contrato: prefere código específico do canal; fallback para código "geral"
 * (channel null). Sem match → item sem vínculo (não bloqueia lote).
 * Presencial não tem códigos de marketplace → só casa códigos "geral".
 */

export type CodeLookupRow = {
  code: string;
  channel: string | null;
  variant: {
    id: number;
    costCents: number;
  };
};

export type LinkedItem = {
  cProd: string;
  variantId: number | null; // null = sem vínculo (continua na fila)
  frozenCostCents: number | null; // null = sem custo conhecido
};

function rank(channel: string | null): number {
  // canal específico (0) > geral (1) > nada (não casa)
  return channel === null ? 1 : 0;
}

/** Casa um cProd específico com o melhor código candidato para o canal. */
export function linkCProd(cProd: string, channel: Channel, codes: CodeLookupRow[]): LinkedItem {
  const candidates = codes
    .filter((row) => row.code === cProd)
    .filter(
      (row) => row.channel === null || row.channel === channel || (channel === "presencial" && row.channel === null),
    )
    .sort((a, b) => rank(a.channel) - rank(b.channel));

  const best = candidates[0];
  if (!best) return { cProd, variantId: null, frozenCostCents: null };
  return {
    cProd,
    variantId: best.variant.id,
    frozenCostCents: best.variant.costCents, // congelado na venda (D6)
  };
}

/** Casa todos os itens de um pedido com os códigos disponíveis. */
export function linkItems(items: Array<{ cProd: string }>, channel: Channel, codes: CodeLookupRow[]): LinkedItem[] {
  return items.map((item) => linkCProd(item.cProd, channel, codes));
}
