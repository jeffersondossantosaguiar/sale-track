/**
 * Dinheiro em CENTAVOS inteiros — núcleo financeiro (Constitution §III/§V; D1, D6, T009).
 * NUNCA floats em operações: `reaisToCents` converte na fronteira (parse), o restante
 * é aritmética inteira determinística (round-half-up apenas na conversão de exibição).
 */

export const CENT_PER_REAL = 100;

/** Reais (float — apenas fronteira de input/display) → centavos inteiros. */
export function reaisToCents(reais: number): number {
  if (!Number.isFinite(reais)) throw new RangeError(`reaisToCents: não-finito (${reais})`);
  const cents = Math.round(reais * CENT_PER_REAL);
  if (!Number.isSafeInteger(cents)) throw new RangeError(`reaisToCents: fora de range seguro (${reais})`);
  return cents;
}

/** Centavos → reais. SÓ para exibição/estatística; jamais para cálculo (D1). */
export function centsToReais(cents: number): number {
  return cents / CENT_PER_REAL;
}

/** Formata centavos como moeda pt-BR: 123456 → "R$ 1.234,56". */
export function formatBRL(cents: number): string {
  const negative = cents < 0;
  const abs = Math.abs(cents);
  const reais = Math.floor(abs / CENT_PER_REAL);
  const centavos = abs % CENT_PER_REAL;
  const reaisStr = reais.toLocaleString("pt-BR");
  const centavosStr = String(centavos).padStart(2, "0");
  return `${negative ? "-" : ""}R$ ${reaisStr},${centavosStr}`;
}

/** Parse pt-BR de string monetária → centavos: "1.234,56"→123456; aceita "1234.56". */
export function parseBrlToCents(input: string): number {
  const raw = input.trim().replace(/\s|R\$|R\$/gi, "");
  if (!raw) throw new RangeError("parseBrlToCents: vazio");

  const br = raw.match(/^(-?\d{1,3}(?:\.\d{3})*)(?:,(\d{1,2}))?$/);
  if (br) {
    const intPart = Number(br[1].replace(/\./g, ""));
    const frac = (br[2] ?? "").padEnd(2, "0");
    const cents = intPart * CENT_PER_REAL + Number(frac);
    return raw.startsWith("-") ? -cents : cents;
  }

  const intl = raw.match(/^(-?\d+)(?:\.(\d{1,2}))?$/);
  if (intl) {
    const cents = Number(intl[1]) * CENT_PER_REAL + Number((intl[2] ?? "").padEnd(2, "0"));
    return raw.startsWith("-") ? -cents : cents;
  }

  throw new RangeError(`parseBrlToCents: formato desconhecido ("${input}")`);
}

/** Soma em centavos com checagem de inteiro seguro (never overflow silencioso). */
export function addCents(a: number, b: number): number {
  const sum = a + b;
  if (!Number.isSafeInteger(sum)) throw new RangeError(`addCents: overflow (${a} + ${b})`);
  return sum;
}

/** Percentual expresso em basis points (10000 = 100%). Ex.: 12,5% = 1250bps. */
export function bpsOf(totalCents: number, bps: number): number {
  const value = Math.round((totalCents * bps) / 10_000);
  if (!Number.isSafeInteger(value)) throw new RangeError(`bpsOf: fora de range (${totalCents} * ${bps})`);
  return value;
}
