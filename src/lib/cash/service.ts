import { type Db, getDb } from "@/lib/db/client";
import { cashEntries, sales } from "@/lib/db/schema";
import {
  type CashEntryInput,
  type CashType,
  cashEntryInputSchema,
  reversalDescriptionFor,
  reversalInputSchema,
} from "@/lib/domain/cash";
import { eq, sql } from "drizzle-orm";

/**
 * Serviço de CAIXA (US3/T032) — lógica pura contra a `Db` injectável.
 * D7: NUNCA há exclusão — correção = estornar (status + data + reversão).
 * Regras: amountCents > 0 sempre (sinal vem do `type`); estorno zera o saldo
 * do original e aparece com data própria.
 */

export type ServiceResult<T> = { ok: true; value: T } | { ok: false; error: string };

export type CashEntryRow = {
  id: number;
  date: Date;
  type: CashType;
  category: string;
  amountCents: number;
  description: string;
  saleId: number | null;
  status: "normal" | "estornado";
  reversedAt: Date | null;
  reversalOfId: number | null;
};

const now = () => new Date();

function dbOf(opts?: { db?: Db }): Db {
  return opts?.db ?? getDb().db;
}

function zodMessage(issues: { message: string }[]): string {
  return issues.map((issue) => issue.message).join("; ");
}

export function listCashEntries(opts?: { db?: Db }): CashEntryRow[] {
  const db = dbOf(opts);
  return db
    .select()
    .from(cashEntries)
    .orderBy(sql`${cashEntries.date} desc, ${cashEntries.id} desc`)
    .all() as CashEntryRow[];
}

export function createCashEntry(input: CashEntryInput, opts?: { db?: Db }): ServiceResult<{ entry: CashEntryRow }> {
  const db = dbOf(opts);
  const parsed = cashEntryInputSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: zodMessage(parsed.error.issues) };
  const data = parsed.data;

  if (data.saleId != null) {
    const sale = db.select({ id: sales.id }).from(sales).where(eq(sales.id, data.saleId)).get();
    if (!sale) return { ok: false, error: "venda não encontrada para o vínculo" };
  }

  const inserted = db
    .insert(cashEntries)
    .values({
      date: data.date,
      type: data.type,
      category: data.category,
      amountCents: data.amountCents,
      description: data.description,
      saleId: data.saleId ?? null,
      status: "normal",
      createdAt: now(),
    })
    .run();

  const row = db
    .select()
    .from(cashEntries)
    .where(eq(cashEntries.id, Number(inserted.lastInsertRowid)))
    .get() as CashEntryRow;
  return { ok: true, value: { entry: row } };
}

/**
 * Estorno explícito (D7/T033): marca o original como `estornado` + `reversedAt`
 * e cria uma ENTRADA DE REVERSÃO (tipo oposto, mesmo valor, categoria e vínculo),
 * com data própria. Idempotência: estornar de novo é erro.
 */
export function reverseCashEntry(
  id: number,
  input: { date: string | Date; description?: string },
  opts?: { db?: Db },
): ServiceResult<{ entry: CashEntryRow }> {
  const db = dbOf(opts);
  const original = db.select().from(cashEntries).where(eq(cashEntries.id, id)).get() as
    | (Pick<CashEntryRow, "id" | "date" | "type" | "category" | "amountCents" | "description" | "saleId" | "status"> & {
        reversalOfId: number | null;
      })
    | undefined;
  if (!original) return { ok: false, error: "lançamento não encontrado" };
  if (original.status === "estornado") return { ok: false, error: "lançamento já foi estornado" };

  const parsed = reversalInputSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: zodMessage(parsed.error.issues) };
  const { date, description } = parsed.data;

  const reversalType: CashType = original.type === "entrada" ? "saida" : "entrada";
  const inserted = db
    .insert(cashEntries)
    .values({
      date,
      type: reversalType,
      category: original.category,
      amountCents: original.amountCents,
      description: description || reversalDescriptionFor(original),
      saleId: original.saleId,
      status: "normal",
      reversalOfId: original.id,
      createdAt: now(),
    })
    .run();

  db.update(cashEntries).set({ status: "estornado", reversedAt: now() }).where(eq(cashEntries.id, id)).run();

  const row = db
    .select()
    .from(cashEntries)
    .where(eq(cashEntries.id, Number(inserted.lastInsertRowid)))
    .get() as CashEntryRow;
  return { ok: true, value: { entry: row } };
}
