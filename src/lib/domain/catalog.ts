import { z } from "zod";

/**
 * Domínio do catálogo (US2/T027) — puras, sem I/O.
 * Constitution: dinheiro SEMPRE em centavos inteiros; nomes normalizados
 * (trim + colapso de espaços) para dedup de categoria ser previsível.
 */

/** Categorias criadas pelo seed (removíveis pelo usuário). */
export const DEFAULT_CATEGORIES = ["Geral"] as const;

export function normalizeName(raw: string): string {
  return raw.trim().replace(/\s+/g, " ");
}

export function normalizeCategoryName(raw: string): string {
  const normalized = normalizeName(raw);
  return normalized ? normalized.charAt(0).toUpperCase() + normalized.slice(1) : normalized;
}

/** Nome de categoria (1–40 chars, normalizado). */
export const categoryNameSchema = z
  .string()
  .transform(normalizeCategoryName)
  .refine((v) => v.length >= 1, "nome da categoria é obrigatório")
  .refine((v) => v.length <= 40, "nome muito longo (máx. 40)");

export type CategoryName = z.infer<typeof categoryNameSchema>;

/**
 * Input de produto — serve tanto formulário (strings do FormData) quanto API
 * tipada (numbers); centavos inteiros >= 0; categoryId opcional ("" → null).
 */
export const productInputSchema = z.object({
  name: z
    .string()
    .transform(normalizeName)
    .refine((v) => v.length >= 1, "nome do produto é obrigatório")
    .refine((v) => v.length <= 120, "nome muito longo (máx. 120)"),
  categoryId: z
    .preprocess(
      (v) => (v === "" || v === null || v === undefined ? null : v),
      z.null().or(z.coerce.number().int().positive("categoria inválida")),
    )
    .optional(),
  salePriceCents: z.coerce.number().int("preço deve ser inteiro (centavos)").min(0, "preço deve ser >= 0"),
  estimatedCostCents: z.coerce.number().int("custo deve ser inteiro (centavos)").min(0, "custo deve ser >= 0"),
});

export type ProductInput = z.infer<typeof productInputSchema>;
export type ProductPatch = Partial<ProductInput>;
