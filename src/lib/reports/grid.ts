import { inflateRawSync } from "node:zlib";

/**
 * Leitura de relatórios exportados (005/US3) — xlsx (zip+xml mínimo, sem dependência)
 * e CSV. Retorna uma grade `string[][]` (linhas de células). O parsing por canal
 * (shopee.ts/tiktok.ts) consome essa grade. Constitution §II: simplicidade local — um
 * parser mínimo de xlsx cobre os relatórios reais (estrutura estável).
 */

const BOM = "\uFEFF";

/** Converte um Buffer/ArrayBuffer/string em um array de bytes (Node). */
function toBuffer(data: ArrayBuffer | Buffer | Uint8Array | string): Buffer {
  if (typeof data === "string") return Buffer.from(data, "utf8");
  if (Buffer.isBuffer(data)) return data;
  return Buffer.from(new Uint8Array(data as ArrayBuffer));
}

/** Descompacta os itens de um arquivo ZIP via central directory → nome → bytes. */
function unzipEntries(buffer: Buffer): Map<string, Buffer> {
  const entries = new Map<string, Buffer>();

  // Localiza o End Of Central Directory (0x06054b50) nos últimos ~64 KB.
  let eocd = -1;
  const tailStart = Math.max(0, buffer.length - 65536);
  for (let i = buffer.length - 22; i >= tailStart; i--) {
    if (buffer.readUInt32LE(i) === 0x06054b50) {
      eocd = i;
      break;
    }
  }
  if (eocd < 0) throw new Error("zip inválido (sem EOCD)");

  const centralOffset = buffer.readUInt32LE(eocd + 16); // offset do central directory
  let offset = centralOffset;
  while (offset + 46 <= buffer.length && buffer.readUInt32LE(offset) === 0x02014b50) {
    const method = buffer.readUInt16LE(offset + 10);
    const compSize = buffer.readUInt32LE(offset + 20);
    const nameLen = buffer.readUInt16LE(offset + 28);
    const extraLen = buffer.readUInt16LE(offset + 30);
    const localOffset = buffer.readUInt32LE(offset + 42);
    const name = buffer.slice(offset + 46, offset + 46 + nameLen).toString("utf8");

    // Data começa em localOffset + 30 + nameLen + extraLen (do header LOCAL).
    const localNameLen = buffer.readUInt16LE(localOffset + 26);
    const localExtraLen = buffer.readUInt16LE(localOffset + 28);
    const dataStart = localOffset + 30 + localNameLen + localExtraLen;
    const data = buffer.slice(dataStart, dataStart + compSize);

    if (method === 0) entries.set(name, data);
    else if (method === 8) entries.set(name, inflateRawSync(data));

    offset += 46 + nameLen + extraLen;
  }
  return entries;
}

const XML_NS = "{http://schemas.openxmlformats.org/spreadsheetml/2006/main}";

/** Lê a grade de células de um xlsx (primeira planilha). */
export function parseXlsx(input: ArrayBuffer | Buffer | Uint8Array | string): string[][] {
  const entries = unzipEntries(toBuffer(input));
  const shared: string[] = [];
  const sharedEntry = entries.get("xl/sharedStrings.xml") ?? entries.get("/xl/sharedStrings.xml");
  if (sharedEntry) {
    const xml = sharedEntry.toString("utf8");
    const regex = /<si[\s\S]*?<\/si>/g;
    for (let m = regex.exec(xml); m; m = regex.exec(xml)) {
      const text = [...m[0].matchAll(/<t[^>]*>([\s\S]*?)<\/t>/g)].map((tm) => tm[1]).join("");
      shared.push(unescapeXml(text));
    }
  }

  const sheetEntry = entries.get("xl/worksheets/sheet1.xml") ?? entries.get("/xl/worksheets/sheet1.xml");
  if (!sheetEntry) throw new Error("relatório xlsx sem planilha (sheet1)");
  const xml = sheetEntry.toString("utf8");

  const rows: string[][] = [];
  const rowRegex = /<row\b[^>]*>([\s\S]*?)<\/row>/g;
  for (let rm = rowRegex.exec(xml); rm; rm = rowRegex.exec(xml)) {
    const rowXml = rm[1];
    const cells: string[] = [];
    const cellRegex = /<c\b([^>]*)>([\s\S]*?)<\/c>/g;
    for (let cm = cellRegex.exec(rowXml); cm; cm = cellRegex.exec(rowXml)) {
      const t = /\bt="([^"]+)"/.exec(cm[1] ?? "")?.[1] ?? "";
      cells.push(cellValue(cm[2] ?? "", t, shared));
    }
    rows.push(cells);
  }
  return rows;
}

function cellValue(cellXml: string, t: string, shared: string[]): string {
  if (t === "inlineStr") {
    const m = /<t[^>]*>([\s\S]*?)<\/t>/.exec(cellXml);
    return unescapeXml(m?.[1] ?? "");
  }
  const v = /<v>([\s\S]*?)<\/v>/.exec(cellXml);
  if (!v) return "";
  if (t === "s") {
    const idx = Number(v[1]);
    return shared[idx] ?? "";
  }
  return v[1] ?? "";
}

/** Lê a grade de células de um CSV (vírgula; aspas simples/dobradas). */
export function parseCsv(input: ArrayBuffer | Buffer | Uint8Array | string): string[][] {
  const text = toBuffer(input)
    .toString("utf8")
    .replace(/^\uFEFF/, "");
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (inQuotes) {
      if (ch === '"') {
        if (text[i + 1] === '"') {
          cell += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        cell += ch;
      }
    } else if (ch === '"') {
      inQuotes = true;
    } else if (ch === ",") {
      row.push(cell);
      cell = "";
    } else if (ch === "\n" || ch === "\r") {
      if (ch === "\r" && text[i + 1] === "\n") i++;
      row.push(cell);
      cell = "";
      if (row.some((c) => c !== "")) rows.push(row);
      row = [];
    } else {
      cell += ch;
    }
  }
  row.push(cell);
  if (row.some((c) => c !== "")) rows.push(row);
  return rows;
}

function unescapeXml(value: string): string {
  return value
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, "&");
}

/** Detecta e lê a grade conforme o tipo do arquivo. */
export function parseReportFile(filename: string, data: ArrayBuffer | Buffer | Uint8Array | string): string[][] {
  const lower = filename.toLowerCase();
  if (lower.endsWith(".csv")) return parseCsv(data);
  if (lower.endsWith(".xlsx")) return parseXlsx(data);
  throw new Error("formato não suportado (use .xlsx ou .csv)");
}
