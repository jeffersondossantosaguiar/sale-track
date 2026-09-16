import type { ZodType } from "zod";

/**
 * Helpers compartilhados de Server Actions (Constitution §V)
 * e validação de input com zod (T013). Toda mutação DEVE validar entrada
 * antes de tocar o banco — retornamos resultado tipado ao cliente.
 */

export type ActionResult<T = void> = { ok: true; data: T } | { ok: false; error: string };

export function actionData<T>(data: T): ActionResult<T> {
  return { ok: true, data };
}

export function actionError(error: string): ActionResult<never> {
  return { ok: false, error };
}

/** Valida FormData contra um schema zod; devolve dados tipados ou erro amigável. */
export function parseFormData<T>(schema: ZodType<T>, formData: FormData): ActionResult<T> {
  const result = schema.safeParse(Object.fromEntries(formData.entries()));
  if (!result.success) {
    const error = result.error.issues.map((issue) => `${issue.path.join(".") || "form"}: ${issue.message}`).join("; ");
    return actionError(error);
  }
  return actionData(result.data);
}

/** Coleta valores repetidos de um campo (ex.: linhas de itens em lote). */
export function formList(formData: FormData, key: string): string[] {
  return formData.getAll(key).map(String);
}
