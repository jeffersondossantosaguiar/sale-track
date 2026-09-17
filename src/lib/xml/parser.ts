import { reaisToCents } from "../domain/money";

/**
 * Parser de NFe modelo 55 (mercadoria) → modelo normalizado de venda.
 * Contrato: specs/.../contracts/xml-import.md (T014).
 *
 * Extração por regex restrita aos campos do contrato (nNF, serie, dhEmi, vNF,
 * det/prod/*). Validado contra 1.185 XMLs reais (Shopee Notas + eNotasGW).
 * O bruto é SEMPRE vNF (imutável, D5); a soma dos itens pode divergir por
 * frete/desconto → vira warning, nunca correção (nada recalcula o bruto).
 */

export interface ParsedInvoiceItem {
  nItem: number;
  cProd: string;
  description: string;
  quantity: number; // inteiro (qCom normalizado)
  unitPriceCents: number; // vUnCom em centavos
  totalCents: number; // vProd em centavos
}

export interface ParsedInvoice {
  invoiceNumber: string;
  serie: string;
  issueDate: Date; // dhEmi (offset -03:00 preservado pelo Date)
  grossCents: number; // vNF — bruto imutável
  freightCents?: number; // vFrete — frete pago (default 0 quando ausente) — 005
  items: ParsedInvoiceItem[];
  warnings: string[];
}

export type XmlParseResult = { ok: true; invoice: ParsedInvoice } | { ok: false; error: string };

const MAX_XML_BYTES = 10 * 1024 * 1024; // limite do contrato (security/xml-import)

const BLOCK = (tag: string) => new RegExp(`<${tag}\\b[^>]*>([\\s\\S]*?)<\\/${tag}>`, "i");
const FIELD = (tag: string) => new RegExp(`<${tag}\\b[^>]*>([^<]*)<\\/${tag}>`, "i");

function fieldText(block: string, tag: string): string | null {
  const m = FIELD(tag).exec(block);
  return m ? m[1].trim() : null;
}

function requireFields(xml: string, tags: string[]): string | null {
  for (const tag of tags) {
    const value = fieldText(xml, tag);
    if (value === null || value === "") return `campo obrigatório ausente: <${tag}>`;
  }
  return null;
}

/** Normaliza decimal do XML ("1", "1.0000", "18.8800000000") → centavos inteiros. */
function decimalToCents(raw: string): number {
  const value = Number(raw);
  if (!Number.isFinite(value)) throw new RangeError(`valor não numérico: "${raw}"`);
  return reaisToCents(value);
}

/** Normaliza quantidade ("1", "1.0000") → inteiro (suporta fracionários no XML). */
function decimalToInt(raw: string): number {
  const value = Number(raw);
  if (!Number.isFinite(value)) throw new RangeError(`quantidade não numérica: "${raw}"`);
  return Math.max(1, Math.round(value));
}

/** Extrai os blocos <det nItem="N">...</det> de uma NFe. */
function extractDetailBlocks(xml: string): Array<{ nItem: number; block: string }> {
  const blocks: Array<{ nItem: number; block: string }> = [];
  const regex = /<det\b[^>]*>([\s\S]*?)<\/det>/gi;
  for (;;) {
    const match = regex.exec(xml);
    if (match === null) break;
    const tag = match[0];
    const nItem = Number(tag.match(/\bnItem\s*=\s*["'](\d+)["']/i)?.[1] ?? blocks.length + 1);
    blocks.push({ nItem, block: match[1] });
  }
  return blocks;
}

/** Converte string numérica do XML, validando que veio de campo real. */
function validNumber(raw: string | null, label: string): number {
  if (raw === null || raw.trim() === "") throw new RangeError(`<${label}> ausente`);
  return decimalToCents(raw);
}

export function parseXmlInvoice(rawXml: string): XmlParseResult {
  if (typeof rawXml !== "string" || rawXml.trim() === "") {
    return { ok: false, error: "arquivo vazio" };
  }
  const xml = rawXml.trim();
  if (Buffer.byteLength(xml, "utf8") > MAX_XML_BYTES) {
    return { ok: false, error: "arquivo acima do limite de 10 MB" };
  }

  // Guardas de estrutura: precisa ser NFe com infNFe e total.
  const nfeBlock = BLOCK("infNFe").exec(xml)?.[1];
  if (!nfeBlock) return { ok: false, error: "não é um XML de NFe (infNFe ausente)" };

  const missing = requireFields(nfeBlock, ["nNF", "serie", "dhEmi"]);
  if (missing) return { ok: false, error: missing };

  const mod = fieldText(nfeBlock, "mod");
  if (mod !== null && mod !== "55") {
    return { ok: false, error: `modelo da NFe não-suportado: mod=${mod} (apenas 55)` };
  }

  const totalBlock = BLOCK("ICMSTot").exec(xml)?.[1];
  const vNfRaw = totalBlock ? fieldText(totalBlock, "vNF") : fieldText(xml, "vNF");
  if (vNfRaw === null || vNfRaw.trim() === "") {
    return { ok: false, error: "campo obrigatório ausente: <total/ICMSTot/vNF>" };
  }

  let grossCents: number;
  try {
    grossCents = validNumber(vNfRaw, "vNF");
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : String(error) };
  }

  // 005 — frete (vFrete); default 0 quando ausente (marketplace cobre ou presencial).
  const vFreteRaw = totalBlock ? fieldText(totalBlock, "vFrete") : fieldText(xml, "vFrete");
  let freightCents = 0;
  if (vFreteRaw !== null && vFreteRaw.trim() !== "") {
    try {
      freightCents = decimalToCents(vFreteRaw);
    } catch {
      freightCents = 0;
    }
  }
  if (freightCents < 0) freightCents = 0;

  const invoiceNumber = fieldText(nfeBlock, "nNF")?.trim() ?? "";
  const serieRaw = fieldText(nfeBlock, "serie")?.trim() ?? "";
  const dhEmiRaw = fieldText(nfeBlock, "dhEmi") ?? "";

  const issueDate = new Date(dhEmiRaw);
  if (Number.isNaN(issueDate.getTime())) {
    return { ok: false, error: `dhEmi inválido: "${dhEmiRaw}"` };
  }

  // Itens
  const items: ParsedInvoiceItem[] = [];
  const warnings: string[] = [];
  for (const { nItem, block } of extractDetailBlocks(nfeBlock)) {
    const cProd = fieldText(block, "cProd");
    const description = fieldText(block, "xProd");
    const qCom = fieldText(block, "qCom");
    const vUnCom = fieldText(block, "vUnCom");
    const vProd = fieldText(block, "vProd");
    if (!cProd || !description || qCom === null || vUnCom === null || vProd === null) {
      warnings.push(`item ${nItem}: campos incompletos, ignorado`);
      continue;
    }
    try {
      items.push({
        nItem,
        cProd,
        description,
        quantity: decimalToInt(qCom),
        unitPriceCents: decimalToCents(vUnCom),
        totalCents: decimalToCents(vProd),
      });
    } catch (error) {
      warnings.push(`item ${nItem}: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  if (items.length === 0) {
    return { ok: false, error: "NFe sem itens válidos (det/prod)" };
  }

  const itemsSum = items.reduce((sum, item) => sum + item.totalCents, 0);
  if (itemsSum !== grossCents) {
    warnings.push(`soma dos itens (${itemsSum}c) difere do vNF (${grossCents}c) — mantido vNF`);
  }

  return {
    ok: true,
    invoice: { invoiceNumber, serie: serieRaw, issueDate, grossCents, freightCents, items, warnings },
  };
}
