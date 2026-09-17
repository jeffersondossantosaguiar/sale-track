import {
  type MoneyCents,
  feeFromBps,
  feeOf,
  marginBpsOf,
  marginOf,
  netOf,
  netOfReceived,
  productOf,
  profitOf,
} from "@/lib/domain/cxmoney";
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

describe("cxmoney apuração por recebido (005)", () => {
  it("productOf = bruto − frete", () => {
    expect(productOf(156_49, 23_87)).toBe(132_62);
    expect(productOf(156_49, 0)).toBe(156_49);
  });

  it("feeOf = produto − recebido (derivada); nil sem recebido", () => {
    expect(feeOf(132_62, 110_00)).toBe(22_62);
    expect(feeOf(19_28, 11_17)).toBe(8_11);
    expect(feeOf(132_62, null)).toBeNull();
  });

  it("profitOf = recebido − custo (pode ser prejuízo)", () => {
    expect(profitOf(11_17, 5_00)).toBe(6_17);
    expect(profitOf(5_00, 8_00)).toBe(-3_00);
  });

  it("netOfReceived = recebido ?? bruto", () => {
    expect(netOfReceived(8_800, 10_000)).toBe(8_800);
    expect(netOfReceived(null, 10_000)).toBe(10_000);
  });
});
