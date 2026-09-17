/**
 * Detecção de canal por padrão de nome de arquivo (D2/research.md).
 * O padrão é sinal, não garantia — o usuário confirma/edita por lote na UI.
 * Shopee: nome contém `_invoice_file_` (ex.: `2607..._invoice_file_<ts>_<uuid>.xml`).
 * TikTok: <nº> puro com ~13 dígitos (ex.: `1783889877430.xml`).
 * Qualquer outro padrão → null (exige escolha manual; pode ser presencial).
 */

export type Channel = "shopee" | "tiktok" | "presencial";

export type DetectableChannel = Exclude<Channel, "presencial">;

/** Mapa série → canal (Shopee/TikTok) para detecção de canal na importação NFe. */
export type SerieChannelMap = Record<string, DetectableChannel>;

const SHOPEE_MARKER = "_invoice_file_";
const TIKTOK_NUMERIC_NAME = /^\d{10,14}$/;

/** Canal inferido da série da NFe via mapa configurado (ex.: Shopee=1/2, TikTok=3). */
export function detectChannelFromSerie(serie: string, map: Record<string, string> = {}): DetectableChannel | null {
  if (!serie) return null;
  const channel = map[serie];
  return channel === "shopee" || channel === "tiktok" ? channel : null;
}

/** Canal inferido do nome do arquivo, ou null quando o padrão é desconhecido. */
export function detectChannelFromFilename(filename: string): DetectableChannel | null {
  const base =
    String(filename ?? "")
      .split(/[\\/]/)
      .pop() ?? "";
  const name = base.replace(/\.[^.]+$/, "").toLowerCase();

  if (name.includes(SHOPEE_MARKER)) return "shopee";
  if (TIKTOK_NUMERIC_NAME.test(name)) return "tiktok";
  return null;
}

/** Nome amigável para exibição em UI/relatórios. */
export const CHANNEL_LABELS: Record<Channel, string> = {
  shopee: "Shopee",
  tiktok: "TikTok",
  presencial: "Presencial",
};

/** Só canais escolhíveis quando o padrão do arquivo é desconhecido. */
export const PICKABLE_CHANNELS: Channel[] = ["shopee", "tiktok", "presencial"];
