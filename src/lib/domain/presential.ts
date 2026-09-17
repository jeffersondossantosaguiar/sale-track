import { z } from "zod";
import { dateSchema } from "./date";

/**
 * Domínio da venda PRESENCIAL (US4/T036) — sem NFe (D3): produto + quantidade
 * do catálogo e valor recebido explicitamente (pode divergir do somatório por
 * desconto). Centavos inteiros (constitution §III/§V).
 */

const presentialItemLine = z.object({
  variantId: z.coerce.number().int().positive("variante inválida"),
  quantity: z.coerce.number().int().min(1, "quantidade deve ser >= 1"),
});

export const presentialSaleInputSchema = z.object({
  saleDate: dateSchema,
  receivedCents: z.coerce.number().int().positive("valor recebido deve ser > 0"),
  items: z.array(presentialItemLine).min(1, "selecione ao menos um produto"),
});

export type PresentialSaleInput = z.input<typeof presentialSaleInputSchema>;
