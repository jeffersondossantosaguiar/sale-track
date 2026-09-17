import {
  computeProfitBps,
  computeProfitCents,
  computeSuggestedPriceCents,
  computeSuggestedPriceCentsByTiers,
  feeForPrice,
} from "@/lib/domain/pricing";
import { describe, expect, it } from "vitest";

/**
 * 004-US1/T004 — Preço sugerido por canal com taxa % como bps (constitution §III).
 * sugerido = (custo + taxa_fixa) / (1 − taxa% − margem%); praticado congelado.
 */

describe("pricing.suggested", () => {
  it("exemplo do dono: custo R$10, taxa fixa R$2, taxa 10%, margem 40% → R$24", () => {
    expect(computeSuggestedPriceCents(1000, 4000, { feeFixedCents: 200, feeRateBps: 1000 })).toBe(2400);
  });

  it("taxa % como bps (004): 20% = 2000bps", () => {
    // custo R$13,22, margem 30%, taxa 20%, taxa fixa R$4 → (1322+400)/(1-0,20-0,30) = 3444
    expect(computeSuggestedPriceCents(1322, 3000, { feeFixedCents: 400, feeRateBps: 2000 })).toBe(3444);
  });

  it("erro se margem + taxa % ≥ 100%", () => {
    expect(() => computeSuggestedPriceCents(1000, 5000, { feeFixedCents: 0, feeRateBps: 5000 })).toThrow(RangeError);
  });
});

describe("pricing.profit", () => {
  it("lucro = praticado − custo; margem real em %", () => {
    expect(computeProfitCents(3999, 1322)).toBe(2677);
    expect(computeProfitBps(3999, 1322)).toBe(Math.round((2677 / 3999) * 10000)); // ~66,9%
  });

  it("0% quando praticado ≤ 0", () => {
    expect(computeProfitBps(0, 1322)).toBe(0);
  });
});

describe("pricing.faixas (005)", () => {
  const shopee = [
    { minCents: 0, maxCents: 7_999, commissionBps: 2000, fixedCents: 4_00 },
    { minCents: 8_000, maxCents: 9_999, commissionBps: 1400, fixedCents: 4_00 },
    { minCents: 10_000, maxCents: null, commissionBps: 1400, fixedCents: 20_00 },
  ];

  it("feeForPrice escolhe a faixa (inclusiva/aberta)", () => {
    expect(feeForPrice(7_999, shopee).commissionBps).toBe(2000);
    expect(feeForPrice(8_000, shopee).commissionBps).toBe(1400);
    expect(feeForPrice(9_999, shopee).fixedCents).toBe(4_00);
    expect(feeForPrice(50_000, shopee).fixedCents).toBe(20_00); // aberto acima
  });

  it("feeForPrice erra sem faixa aplicável / preço inválido", () => {
    expect(() => feeForPrice(-1, shopee)).toThrow(RangeError);
    expect(() => feeForPrice(10_000, [])).toThrow(/faixa/i);
  });

  it("computeSuggestedPriceCentsByTiers itera e preserva a margem", () => {
    // Custo R$10, margem 30%, faixa 20% + R$4 → (10+4)/(1−0,20−0,30) = 28,00
    const p = computeSuggestedPriceCentsByTiers(10_00, 3000, [
      { minCents: 0, maxCents: null, commissionBps: 2000, fixedCents: 4_00 },
    ]);
    expect(p).toBe(28_00);
  });

  it("erro quando comissão + margem ≥ 100%", () => {
    expect(() =>
      computeSuggestedPriceCentsByTiers(10_00, 9000, [
        { minCents: 0, maxCents: null, commissionBps: 2000, fixedCents: 0 },
      ]),
    ).toThrow(RangeError);
  });

  it("erro quando não há faixas", () => {
    expect(() => computeSuggestedPriceCentsByTiers(10_00, 3000, [])).toThrow(/faixa/i);
  });
});
