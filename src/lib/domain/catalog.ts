import { z } from "zod";

/**
 * Domínio do catálogo (US2/T027 + 002: variantes) — puras, sem I/O.
 * Constitution: dinheiro SEMPRE em centavos inteiros; nomes normalizados
 * (trim + colapso de espaços) para dedup de categoria ser previsível.
 */

/** Categorias criadas pelo seed (removíveis pelo usuário). */
export const DEFAULT_CATEGORIES = ["Geral"] as const;

/** Canais cobertos pela precificação por variante (presencial fora do escopo da 002). */
export const PRICING_CHANNELS = ["shopee", "tiktok"] as const;
export type PricingChannel = (typeof PRICING_CHANNELS)[number];

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
 * Input de produto — apenas o contêiner (nome, categoria). Preço/custo agora
 * vivem na VARIANTE (002). categoryId opcional ("" → null).
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
  marginBps: z.coerce
    .number()
    .int("margem deve ser inteiro")
    .min(0, "margem >= 0")
    .max(10000, "margem <= 100%")
    .optional(),
});

export type ProductInput = z.infer<typeof productInputSchema>;
export type ProductPatch = Partial<ProductInput>;

/* ============================== Variant ============================== */

/** Input de variante (002/US1) — insumos de fabricação em minutos/gramas/centavos. */
export const variantInputSchema = z.object({
  sku: z
    .string()
    .transform(normalizeName)
    .refine((v) => v.length >= 1, "SKU é obrigatório")
    .refine((v) => v.length <= 60, "SKU muito longo (máx. 60)"),
  name: z
    .string()
    .transform(normalizeName)
    .refine((v) => v.length >= 1, "nome da variante é obrigatório")
    .refine((v) => v.length <= 120, "nome muito longo (máx. 120)"),
  printTimeMin: z.coerce.number().int("tempo de impressão deve ser inteiro (min)").min(0, "tempo >= 0"),
  manualTimeMin: z.coerce.number().int("tempo manual deve ser inteiro (min)").min(0, "tempo >= 0"),
  filamentMaterialId: z.preprocess(
    (v) => (v === "" || v === null || v === undefined ? null : v),
    z.null().or(z.coerce.number().int().positive("material inválido")),
  ),
  filamentGrams: z.coerce.number().int("peso deve ser inteiro (gramas)").min(0, "peso >= 0"),
  packagingCents: z.coerce.number().int("embalagem deve ser inteiro (centavos)").min(0, "embalagem >= 0"),
  accessoriesCents: z.coerce.number().int("acessórios deve ser inteiro (centavos)").min(0, "acessórios >= 0"),
});

export type VariantInput = z.infer<typeof variantInputSchema>;
export type VariantPatch = Partial<VariantInput>;

/* ============================== Material ============================== */

/** Material de filamento com preço por kg (cor/tipo). */
export const materialInputSchema = z.object({
  name: z
    .string()
    .transform(normalizeName)
    .refine((v) => v.length >= 1, "nome do material é obrigatório")
    .refine((v) => v.length <= 80, "nome muito longo (máx. 80)"),
  pricePerKgCents: z.coerce.number().int("preço deve ser inteiro (centavos por kg)").min(1, "preço deve ser > 0"),
});

export type MaterialInput = z.infer<typeof materialInputSchema>;

/* ============================== Variant Price ============================== */

/** Preço/margem por variante × canal. */
export const variantPriceInputSchema = z.object({
  channel: z.enum(PRICING_CHANNELS),
  marginBps: z.coerce
    .number()
    .int("margem deve ser inteiro (basis points)")
    .min(0, "margem >= 0")
    .max(10_000, "margem <= 100%"),
  practicedPriceCents: z.coerce.number().int("preço deve ser inteiro (centavos)").min(0, "preço >= 0"),
});

export type VariantPriceInput = z.infer<typeof variantPriceInputSchema>;

/* ============================== Printer ============================== */

/** Impressora de referência para derivar o custo/hora global (mais cara). */
export const printerInputSchema = z.object({
  name: z
    .string()
    .transform(normalizeName)
    .refine((v) => v.length >= 1, "nome da impressora é obrigatório")
    .refine((v) => v.length <= 80, "nome muito longo (máx. 80)"),
  acquisitionCents: z.coerce.number().int("aquisição deve ser inteiro (centavos)").min(0, "aquisição >= 0"),
  usefulLifeYears: z.coerce.number().int("vida útil deve ser inteiro (anos)").min(1, "vida útil >= 1"),
  powerWatts: z.coerce.number().int("consumo deve ser inteiro (watts)").min(0, "consumo >= 0"),
  maintenanceCentsPerHour: z.coerce.number().int("manutenção deve ser inteiro (centavos/h)").min(0, "manutenção >= 0"),
});

export type PrinterInput = z.infer<typeof printerInputSchema>;

/* ============================ Product Code ============================ */

export type ProductCodeChannel = "shopee" | "tiktok" | "geral";

const PRODUCT_CODE_CHANNEL_LABELS: Record<ProductCodeChannel, string> = {
  geral: "geral (todos os canais)",
  shopee: "Shopee",
  tiktok: "TikTok",
};

/** Rótulo legível do canal do código (UI/erros). */
export function productCodeChannelLabel(channel: ProductCodeChannel): string {
  return PRODUCT_CODE_CHANNEL_LABELS[channel];
}

export const productCodeChannelSchema = z.enum(["shopee", "tiktok", "geral"]);

/**
 * Input de código de produto (T029). `channel = "geral"` → NULL no banco
 * (vale para qualquer canal); código normalizado para dedup previsível.
 */
export const productCodeInputSchema = z.object({
  code: z
    .string()
    .transform(normalizeName)
    .refine((v) => v.length >= 1, "código obrigatório")
    .refine((v) => v.length <= 255, "código muito longo (máx. 255)"),
  channel: productCodeChannelSchema.default("geral"),
});

export type ProductCodeInput = z.infer<typeof productCodeInputSchema>;
