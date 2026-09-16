import { type DetectableChannel, detectChannelFromFilename } from "./channel";
import { type ParsedInvoice, parseXmlInvoice } from "./parser";

/**
 * Web Worker — parse em lote no navegador (contrato xml-import: segurança/limites).
 * Só o resultado saneado vai ao servidor; o XML bruto também é enviado para o
 * servidor revalidar e arquivar (server é a fonte da verdade, nunca o preview).
 */

export interface WorkerFileInput {
  filename: string;
  content: string;
}

export type WorkerFileResult =
  | {
      status: "ok";
      filename: string;
      channel: DetectableChannel | null;
      invoice: ParsedInvoice;
    }
  | { status: "skipped"; filename: string; reason: "not-xml" }
  | { status: "error"; filename: string; error: string };

export interface WorkerRequest {
  files: WorkerFileInput[];
}

export interface WorkerResponse {
  results: WorkerFileResult[];
}

interface WorkerScope {
  onmessage: ((event: MessageEvent<WorkerRequest>) => void) | null;
  postMessage: (message: WorkerResponse) => void;
}

function isXml(filename: string): boolean {
  return /\.xml$/i.test(filename);
}

/** Lógica pura do worker — exportada para teste unitário (T022). */
export function handleWorkerFiles(files: WorkerFileInput[]): WorkerResponse {
  const results: WorkerFileResult[] = files.map(({ filename, content }) => {
    if (!isXml(filename)) return { status: "skipped", filename, reason: "not-xml" };
    const parsed = parseXmlInvoice(content);
    if (!parsed.ok) return { status: "error", filename, error: parsed.error };
    return {
      status: "ok",
      filename,
      channel: detectChannelFromFilename(filename),
      invoice: parsed.invoice,
    };
  });
  return { results };
}

const scope = (typeof self !== "undefined" ? self : globalThis) as unknown as WorkerScope;
scope.onmessage = (event: MessageEvent<WorkerRequest>) => {
  const { files } = event.data ?? { files: [] };
  scope.postMessage(handleWorkerFiles(files));
};
