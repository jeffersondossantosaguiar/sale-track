import { z } from "zod";

/**
 * Domínio do CAIXA (US3/T032–T033) — puras, sem I/O.
 * D5/D8: caixa (dinheiro real) é ledger SEPARADO do faturamento.
 * D7: estorno é status com data; NUNCA exclusão — reversão é nova entrada oposta.
 * Constitution §III/§V: dinheiro em centavos inteiros; amountCents > 0 (sinal no type).
 */

export const CASH_TYPES = ["entrada", "saida"] as const;
export type CashType = (typeof CASH_TYPES)[number];

export const CASH_CATEGORIES = ["taxas", "filamento", "energia", "manutencao", "embalagem", "venda", "outros"] as const;
export type CashCategory = (typeof CASH_CATEGORIES)[number];

/** Rótulos pt-BR para exibição (chaves ficam em inglês no banco). */
export const CASH_CATEGORY_LABELS: Record<CashCategory, string> = {
  taxas: "Taxas",
  filamento: "Filamento",
  energia: "Energia",
  manutencao: "Manutenção",
  embalagem: "Embalagem",
  venda: "Venda",
  outros: "Outros",
};

export const cashEntryStatusSchema = z.enum(["normal", "estornado"]).default("normal");
export type CashEntryStatus = z.infer<typeof cashEntryStatusSchema>;

/** Data do lançamento aceita "YYYY-MM-DD" ou Date; rejeita valores inválidos. */
const dateInput = z.preprocess((value) => {
  if (value instanceof Date) return value;
  const raw = String(value ?? "").trim();
  if (!raw) return Number.NaN;
  const parsed = /^\d{4}-\d{2}-\d{2}$/.test(raw) ? new Date(`${raw}T00:00:00`) : new Date(raw);
  return Number.isNaN(parsed.getTime()) ? Number.NaN : parsed;
}, z.date());

/** Input de criação de lançamento (formulário ou API). */
export const cashEntryInputSchema = z.object({
  date: dateInput,
  type: z.enum(CASH_TYPES),
  category: z.enum(CASH_CATEGORIES),
  amountCents: z.coerce.number().int("valor deve ser inteiro (centavos)").positive("valor deve ser > 0"),
  description: z.string().trim().max(140, "descrição muito longa (máx. 140)").optional().default(""),
  saleId: z
    .preprocess(
      (v) => (v === "" || v === null || v === undefined ? null : v),
      z.null().or(z.coerce.number().int().positive("venda inválida")),
    )
    .optional(),
});

export type CashEntryInput = z.input<typeof cashEntryInputSchema>;

/** Input do estorno — data do estorno (aparece com data própria, D7). */
export const reversalInputSchema = z.object({
  date: dateInput,
  description: z.string().trim().max(140, "descrição muito longa").optional().default(""),
});

export type ReversalInput = z.infer<typeof reversalInputSchema>;

/** Descrição rastreável da reversão gerada a partir do lançamento original. */
export function reversalDescriptionFor(original: { description: string; category: string }): string {
  const description = String(original.description ?? "").trim();
  return description ? `Estorno de "${description}"` : `Estorno de lançamento (${original.category})`;
}
