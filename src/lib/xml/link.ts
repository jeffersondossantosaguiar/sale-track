import type { Channel } from "./channel";

/**
 * Vínculo de item → variante via product_codes (US5, 006).
 * Contrato: a CHAVE de vínculo depende do canal — TikTok casa pela DESCRIÇÃO
 * (o cProd é genérico 'Padrao'); Shopee/presencial/geral casam por cProd.
 * Prefere código específico do canal; fallback para "geral".
 * Sem match → item sem vínculo (não bloqueia lote).
 * Presencial não tem códigos de marketplace → só casa códigos "geral".
 */

export type CodeLookupRow = {
  code: string;
  channel: string;
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

function rank(channel: string): number {
  // canal específico (0) > geral (1) > nada (não casa)
  return channel === "geral" ? 1 : 0;
}

/** Forma normalizada para casamento case-insensitive e tolerante a espaços. */
export function normalizeMatch(value: string): string {
  return (value ?? "").trim().toLowerCase();
}

/** Chave de vínculo do item conforme o canal: TikTok → descrição; demais → cProd. */
export function itemMatchKey(channel: Channel, item: { cProd: string; description?: string }): string {
  return channel === "tiktok" ? item.description?.trim() || item.cProd : item.cProd;
}

/** Casa uma chave (cProd ou descrição) com o melhor código candidato para o canal. */
export function linkCProd(key: string, channel: Channel, codes: CodeLookupRow[]): LinkedItem {
  const candidates = codes
    .filter((row) => normalizeMatch(row.code) === normalizeMatch(key))
    .filter(
      (row) =>
        row.channel === "geral" || row.channel === channel || (channel === "presencial" && row.channel === "geral"),
    )
    .sort((a, b) => rank(a.channel) - rank(b.channel));

  const best = candidates[0];
  if (!best) return { cProd: key, variantId: null, frozenCostCents: null };
  return {
    cProd: key,
    variantId: best.variant.id,
    frozenCostCents: best.variant.costCents, // congelado na venda (D6)
  };
}

/** Casa todos os itens de um pedido com os códigos disponíveis (chave por canal). */
export function linkItems(
  items: Array<{ cProd: string; description?: string }>,
  channel: Channel,
  codes: CodeLookupRow[],
): LinkedItem[] {
  return items.map((item) => {
    const linked = linkCProd(itemMatchKey(channel, item), channel, codes);
    return { cProd: item.cProd, variantId: linked.variantId, frozenCostCents: linked.frozenCostCents };
  });
}
