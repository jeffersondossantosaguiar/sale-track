import { type MoneyCents, feeFromBps, marginBpsOf, marginOf, netOf } from "@/lib/domain/cxmoney";
import { describe, expect, it } from "vitest";

/**
 * T028 [US2] — cxmoney: margem = bruto − taxa − custo congelado (centavos).
 * Constitution §III/§V: sempre centavos inteiros; aritmética determinística.
 */

describe("cxmoney.feeFromBps", () => {
  it("calcula taxa por basis points (10000 = 100%)", () => {
    expect(feeFromBps(10_000, 1_000)).toBe(1_000); // 10%
    expect(feeFromBps(10_000, 125)).toBe(125); // 1,25%
    expect(feeFromBps(1_234, 3_300)).toBe(407); // arredondado
    expect(feeFromBps(10_000, 0)).toBe(0);
  });
});

describe("cxmoney.netOf / marginOf", () => {
  it("líquido = bruto − taxa", () => {
    expect(netOf(12_500, 2_000)).toBe(10_500);
    expect(netOf(1_000, 0)).toBe(1_000);
  });

  it("margem = bruto − taxa − custo congelado", () => {
    expect(marginOf(1_000, 120, 500)).toBe(380);
    expect(marginOf(1_000, 0, 800)).toBe(200);
  });

  it("permite prejuízo (margem negativa) mas nunca quebra inteiro", () => {
    expect(marginOf(1_000, 200, 900)).toBe(-100);
    expect(marginOf(500, 100, 500)).toBe(-100);
  });
});

describe("cxmoney.marginBpsOf", () => {
  it("relativa em basis points (10.000 = 100%)", () => {
    expect(marginBpsOf(10_000, 4_000)).toBe(4_000); // 40%
    expect(marginBpsOf(10_000, -15_000)).toBe(-15_000); // prejuízo de 150%
    expect(marginBpsOf(10_000, -2_000)).toBe(-2_000);
  });

  it("satura em 0 quando não há base (bruto 0)", () => {
    expect(marginBpsOf(0, 100)).toBe(0);
    expect(marginBpsOf(0, 0)).toBe(0);
  });
});

describe("cxmoney.money convictos", () => {
  it("rejeita entrada não-inteira (float de centavos)", () => {
    expect(() => marginOf(10.5, 1, 1)).toThrow(/centavos/i);
    expect(() => netOf(1_000, 0.5)).toThrow(/centavos/i);
    expect(() => feeFromBps(1_000, 55.5)).toThrow(/bps/i);
  });

  it("rejeita overflow de inteiro seguro (never float/overflow silencioso)", () => {
    const big: MoneyCents = Number.MAX_SAFE_INTEGER;
    const minBig: MoneyCents = Number.MIN_SAFE_INTEGER;
    expect(() => netOf(big, minBig)).toThrow(/seguro|overflow/i);
    expect(() => marginOf(big, minBig, 1)).toThrow(/seguro|overflow/i);
  });
});
