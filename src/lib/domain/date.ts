import { z } from "zod";

/**
 * Data de negócio (lançamento de caixa, venda presencial etc.) — aceita
 * "YYYY-MM-DD" ou Date. Strings no formato iso são parseadas como MEIA-NOITE
 * LOCAL (não UTC) para a data impressa nunca "andar" no fuso do usuário.
 */

export const dateSchema = z.preprocess((value) => {
  if (value instanceof Date) return value;
  const raw = String(value ?? "").trim();
  if (!raw) return Number.NaN;
  const parsed = /^\d{4}-\d{2}-\d{2}$/.test(raw) ? new Date(`${raw}T00:00:00`) : new Date(raw);
  return Number.isNaN(parsed.getTime()) ? Number.NaN : parsed;
}, z.date());
