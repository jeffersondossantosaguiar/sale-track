"use client";

import { type ImportBatchResponse, importXml } from "@/app/actions/xml-import";
import { formatBRL } from "@/lib/domain/money";
import { cn } from "@/lib/utils";
import { CHANNEL_LABELS, type Channel, type DetectableChannel } from "@/lib/xml/channel";
import type { WorkerFileResult, WorkerRequest, WorkerResponse } from "@/lib/xml/worker";
import { useCallback, useEffect, useRef, useState } from "react";

/**
 * T025 — Importação NFe XML (US1).
 * Parses no navegador (Web Worker) para preview; confirma envia o lote ao
 * Server Action, que revalida e grava (servidor é a fonte da verdade).
 */

const CHANNELS: Channel[] = ["shopee", "tiktok", "presencial"];
const MAX_BATCH_FILES = 1000;

type PreviewRow = { file: File; result: WorkerFileResult };
type Phase = "idle" | "parsing" | "review" | "importing" | "done";

export default function XmlImportForm() {
  const [rows, setRows] = useState<PreviewRow[]>([]);
  const [channels, setChannels] = useState<Record<string, Channel>>({});
  const [phase, setPhase] = useState<Phase>("idle");
  const [response, setResponse] = useState<ImportBatchResponse | null>(null);
  const workerRef = useRef<Worker | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  const getWorker = useCallback(() => {
    if (workerRef.current) return workerRef.current;
    const worker = new Worker(new URL("../../../lib/xml/worker", import.meta.url), { name: "nfe-parser" });
    workerRef.current = worker;
    return worker;
  }, []);

  useEffect(() => () => workerRef.current?.terminate(), []);

  const addFiles = async (fileList: FileList | null) => {
    if (!fileList || fileList.length === 0) return;
    const files = Array.from(fileList).slice(0, MAX_BATCH_FILES);
    setPhase("parsing");
    setResponse(null);

    const worker = getWorker();
    const results = await new Promise<WorkerResponse>((resolve, reject) => {
      worker.onmessage = (event: MessageEvent<WorkerResponse>) => resolve(event.data);
      worker.onerror = () => reject(new Error("worker de parse falhou"));
      const request: WorkerRequest = { files: [] };
      // Lê conteúdo em paralelo antes de postar.
      Promise.all(files.map(async (file) => ({ filename: file.name, content: await file.text() }))).then((inputs) => {
        request.files = inputs;
        worker.postMessage(request);
      });
    });

    setRows(files.map((file, index) => ({ file, result: results.results[index] })));
    const detected: Record<string, Channel> = {};
    for (const result of results.results) {
      if (result.status === "ok" && result.channel) detected[result.filename] = result.channel;
    }
    setChannels(detected);
    setPhase("review");
  };

  const setChannel = (filename: string, channel: Channel) => {
    setChannels((prev) => ({ ...prev, [filename]: channel }));
  };

  const missingChannels = rows.some((row) => row.result.status === "ok" && !(row.result.filename in channels));

  const submit = async () => {
    if (missingChannels) return;
    setPhase("importing");
    const form = new FormData();
    for (const row of rows) {
      if (row.result.status !== "ok") continue;
      const filename = row.result.filename;
      form.append("filename", filename);
      form.append("channel", channels[filename]);
      form.append("xml", await row.file.text());
    }
    const result = await importXml(form);
    setResponse(result);
    setPhase("done");
  };

  const reset = () => {
    setRows([]);
    setChannels({});
    setResponse(null);
    setPhase("idle");
    if (inputRef.current) inputRef.current.value = "";
  };

  const parsedCount = rows.filter((r) => r.result.status === "ok").length;
  const skippedCount = rows.filter((r) => r.result.status === "skipped").length;
  const errorCount = rows.filter((r) => r.result.status === "error").length;
  const totalCents = rows.reduce(
    (sum, row) => (row.result.status === "ok" ? sum + row.result.invoice.grossCents : sum),
    0,
  );

  return (
    <div className="space-y-6">
      <section className="rounded-lg border bg-card p-4">
        <label className="cursor-pointer rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground">
          Selecionar XMLs (lote)
          <input
            ref={inputRef}
            type="file"
            multiple
            accept=".xml"
            className="hidden"
            onChange={(event) => addFiles(event.target.files)}
            disabled={phase === "parsing" || phase === "importing"}
          />
        </label>
        <p className="mt-2 text-xs text-muted-foreground">
          Mín. 1 arquivo · máx. {MAX_BATCH_FILES} por lote · parse em Web Worker no navegador (o XML bruto também é
          enviado ao servidor para revalidar e arquivar).
        </p>
        {phase === "parsing" && <p className="mt-2 text-sm">Parsing no navegador…</p>}
      </section>

      {rows.length > 0 && (
        <section className="rounded-lg border bg-card">
          <div className="flex items-center justify-between border-b px-4 py-3">
            <h2 className="text-sm font-semibold">Prévia do lote</h2>
            <span className="text-xs text-muted-foreground">
              {parsedCount} ok · {skippedCount} ignorado{skippedCount === 1 ? "" : "s"} · {errorCount} falha
              {errorCount === 1 ? "" : "s"} · total {formatBRL(totalCents)}
            </span>
          </div>

          <div className="max-h-96 overflow-auto">
            <table className="w-full text-left text-sm">
              <thead className="sticky top-0 bg-muted/60 text-xs uppercase text-muted-foreground">
                <tr>
                  <th className="px-4 py-2">Arquivo</th>
                  <th className="px-4 py-2">Canal</th>
                  <th className="px-4 py-2">Nota</th>
                  <th className="px-4 py-2">Data</th>
                  <th className="px-4 py-2 text-right">Bruto</th>
                  <th className="px-4 py-2 text-right">Itens</th>
                  <th className="px-4 py-2">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {rows.map(({ file, result }) => {
                  const rowChannel = result.status === "ok" ? channels[result.filename] : null;
                  return (
                    <tr key={file.name}>
                      <td className="px-4 py-2 font-mono text-xs">{file.name}</td>
                      <td className="px-4 py-2">
                        {result.status === "ok" ? (
                          <select
                            value={rowChannel ?? ""}
                            onChange={(event) => setChannel(result.filename, event.target.value as Channel)}
                            className={cn(
                              "rounded border bg-background px-2 py-1 text-xs",
                              !rowChannel && "border-dashed border-yellow-500",
                            )}
                          >
                            <option value="" disabled>
                              — escolha —
                            </option>
                            {CHANNELS.map((channel) => (
                              <option key={channel} value={channel}>
                                {CHANNEL_LABELS[channel]}
                              </option>
                            ))}
                          </select>
                        ) : (
                          <span className="text-xs text-muted-foreground">—</span>
                        )}
                      </td>
                      {result.status === "ok" ? (
                        <>
                          <td className="px-4 py-2">{result.invoice.invoiceNumber}</td>
                          <td className="px-4 py-2 text-xs">{result.invoice.issueDate.toLocaleString("pt-BR")}</td>
                          <td className="px-4 py-2 text-right">{formatBRL(result.invoice.grossCents)}</td>
                          <td className="px-4 py-2 text-right">{result.invoice.items.length}</td>
                          <td className="px-4 py-2 text-xs text-emerald-600">
                            ok
                            {result.channel ? ` · ${CHANNEL_LABELS[result.channel as DetectableChannel]}` : ""}
                            {result.invoice.warnings.length > 0 && " · ⚠"}
                          </td>
                        </>
                      ) : (
                        <td className="px-4 py-2 text-right" colSpan={4}>
                          <span
                            className={cn(
                              "text-xs",
                              result.status === "error" ? "text-red-600" : "text-muted-foreground",
                            )}
                          >
                            {result.status === "error" ? result.error : "ignorado (não-XML)"}
                          </span>
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {phase === "review" && (
            <div className="flex items-center gap-3 border-t px-4 py-3">
              <button
                type="button"
                onClick={submit}
                disabled={missingChannels}
                className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-50"
              >
                Importar {parsedCount} nota{parsedCount === 1 ? "" : "s"}
              </button>
              <button
                type="button"
                onClick={reset}
                className="rounded-md border px-4 py-2 text-sm text-muted-foreground"
              >
                Limpar
              </button>
              {missingChannels && (
                <span className="text-xs text-amber-600">Faltam canais para {parsedCount} arquivo(s).</span>
              )}
            </div>
          )}

          {phase === "importing" && <p className="px-4 py-3 text-sm">Importando…</p>}
        </section>
      )}

      {response && <ResultSummary response={response} onReset={reset} />}
    </div>
  );
}

function ResultSummary({ response, onReset }: { response: ImportBatchResponse; onReset: () => void }) {
  if (!response.ok) {
    return <div className="rounded-lg border border-red-300 bg-red-50 p-4 text-sm text-red-700">{response.error}</div>;
  }

  const { total, imported, duplicates, errors, results } = response.data;
  return (
    <div className="space-y-4">
      <div className="rounded-lg border bg-card p-4 text-sm">
        <p className="font-medium">
          {imported} importada{imported === 1 ? "" : "s"} · {duplicates} já importada{duplicates === 1 ? "" : "s"} ·{" "}
          {errors} falha{errors === 1 ? "" : "s"} (de {total})
        </p>
        <ul className="mt-3 max-h-80 divide-y divide-border overflow-auto">
          {results.map((result) => (
            <li key={result.filename} className="flex items-start justify-between gap-4 py-2 font-mono text-xs">
              <span className="min-w-0 truncate">{result.filename}</span>
              {result.status === "imported" && (
                <span className="text-right text-emerald-600">
                  nota {result.invoiceNumber} · {formatBRL(result.grossCents)}
                  {result.unlinked.length > 0 &&
                    ` · ${result.unlinked.length} item(ns) sem vínculo (${result.unlinked.map((u) => u.cProd).join(", ")})`}
                </span>
              )}
              {result.status === "duplicate" && (
                <span className="shrink-0 text-amber-600">já importado (nota {result.invoiceNumber})</span>
              )}
              {result.status === "error" && <span className="shrink-0 text-red-600">{result.error}</span>}
            </li>
          ))}
        </ul>
      </div>
      <button type="button" onClick={onReset} className="rounded-md border px-4 py-2 text-sm">
        Novo lote
      </button>
    </div>
  );
}
