"use server";

import { mkdirSync, writeFileSync } from "node:fs";
import { basename, join } from "node:path";
import { type ActionResult, actionData, actionError } from "@/lib/actions";
import { formList } from "@/lib/actions";
import { DATA_DIR } from "@/lib/db/client";
import type { Channel } from "@/lib/xml/channel";
import { importNfeToDb } from "@/lib/xml/importer";
import { parseXmlInvoice } from "@/lib/xml/parser";
import { z } from "zod";

/**
 * Server Action de importação em lote de NFe 55 (T024/T026).
 * Recebe, por arquivo: nome, canal confirmado e o XML bruto (a UI envia também
 * o bruto para o servidor revalidar como fonte da verdade e arquivar — o preview
 * do worker é só UX). Dedup por (nNF, serie, dhEmi) — reimport é idempotente.
 */

export interface ImportedUnlinked {
  cProd: string;
  description: string;
}

export type BatchItemResult =
  | {
      status: "imported";
      filename: string;
      invoiceNumber: string;
      serie: string;
      grossCents: number;
      items: number;
      channel: Channel;
      xmlStoredPath: string;
      unlinked: ImportedUnlinked[];
    }
  | {
      status: "duplicate";
      filename: string;
      invoiceNumber: string;
      serie: string;
    }
  | { status: "error"; filename: string; error: string };

export type ImportBatchResponse = ActionResult<{
  total: number;
  imported: number;
  duplicates: number;
  errors: number;
  results: BatchItemResult[];
}>;

const channelEnum = z.enum(["shopee", "tiktok", "presencial"]);
type ImportChannel = z.infer<typeof channelEnum>;

const fileSchema = z.object({
  filename: z.string().min(1, "arquivo sem nome"),
  channel: channelEnum,
  xml: z.string().min(1, "arquivo vazio"),
});

/** Sanitiza o nome do arquivo para gravação segura em disco. */
function sanitizeFilename(raw: string): string {
  const safe = basename(raw).replace(/[^A-Za-z0-9_.-]/g, "_");
  return safe.slice(0, 120);
}

export async function importXml(formData: FormData): Promise<ImportBatchResponse> {
  const filenames = formList(formData, "filename");
  const channels = formList(formData, "channel");
  const xmls = formList(formData, "xml");

  const count = filenames.length;
  if (count === 0) return actionError("nenhum arquivo selecionado");
  if (count !== channels.length || count !== xmls.length) {
    return actionError("lote inconsistente: arquivos e metadados não batem");
  }

  const results: BatchItemResult[] = [];
  let imported = 0;
  let duplicates = 0;
  let errors = 0;

  for (let i = 0; i < count; i++) {
    const file = fileSchema.safeParse({ filename: filenames[i], channel: channels[i], xml: xmls[i] });
    if (!file.success) {
      errors++;
      const message = file.error.issues.map((issue) => issue.message).join("; ");
      results.push({ status: "error", filename: filenames[i], error: message });
      continue;
    }

    const parsed = parseXmlInvoice(file.data.xml);
    if (!parsed.ok) {
      errors++;
      results.push({ status: "error", filename: file.data.filename, error: parsed.error });
      continue;
    }

    const invoice = parsed.invoice;
    const outcome = importNfeToDb(invoice, file.data.channel, file.data.filename);

    if (outcome.ok) {
      let xmlStoredPath: string;
      try {
        // Arquivar o XML bruto (auditoria/re-vinculação — D4). Fica em data/storage
        // (privado, fora do public); relativo a DATA_DIR vai no campo xml_stored_path.
        const year = invoice.issueDate.getFullYear();
        const storedName = sanitizeFilename(file.data.filename);
        xmlStoredPath = `storage/sales/${year}/${storedName}`;
        const dir = join(DATA_DIR, "storage", "sales", String(year));
        mkdirSync(dir, { recursive: true });
        writeFileSync(join(DATA_DIR, xmlStoredPath), file.data.xml, "utf8");
      } catch {
        xmlStoredPath = ""; // DB já gravado; arquivo é best-effort (auditoria)
      }
      imported++;
      results.push({
        status: "imported",
        filename: file.data.filename,
        invoiceNumber: invoice.invoiceNumber,
        serie: invoice.serie,
        grossCents: invoice.grossCents,
        items: invoice.items.length,
        channel: file.data.channel,
        xmlStoredPath,
        unlinked: outcome.unlinked,
      });
      continue;
    }

    if (outcome.reason === "duplicate") {
      duplicates++;
      results.push({
        status: "duplicate",
        filename: file.data.filename,
        invoiceNumber: outcome.invoiceNumber,
        serie: outcome.serie,
      });
      continue;
    }

    errors++;
    results.push({ status: "error", filename: file.data.filename, error: outcome.error });
  }

  return actionData({ total: count, imported, duplicates, errors, results });
}
