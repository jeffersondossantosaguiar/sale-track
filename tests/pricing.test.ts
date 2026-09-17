import { computeProfitBps, computeProfitCents, computeSuggestedPriceCents } from "@/lib/domain/pricing";
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
