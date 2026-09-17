import { parseXmlInvoice } from "@/lib/xml/parser";
import { describe, expect, it } from "vitest";
import { FIXTURE_MALFORMED, FIXTURE_SHOPEE_1, FIXTURE_SHOPEE_4, FIXTURE_TIKTOK, readFixture } from "./helpers/db";

describe("T014 — parse NFe 55 → modelo normalizado", () => {
  it("extrai cabeçalho, total bruto e item de uma NFe Shopee (1 item)", () => {
    const result = parseXmlInvoice(readFixture(FIXTURE_SHOPEE_1));

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const { invoice } = result;

    expect(invoice.invoiceNumber).toBe("772");
    expect(invoice.serie).toBe("2");
    expect(invoice.issueDate.toISOString()).toBe(new Date("2026-07-12T17:49:42-03:00").toISOString());
    expect(invoice.grossCents).toBe(1550); // R$ 15,50 = vNF
    expect(invoice.items).toHaveLength(1);

    const [item] = invoice.items;
    expect(item.cProd).toBe("169415788741");
    expect(item.description).toContain("Totem");
    expect(item.quantity).toBe(1);
    expect(item.unitPriceCents).toBe(1550);
    expect(item.totalCents).toBe(1550);
    expect(invoice.warnings).toEqual([]);
  });

  it("multi-item: 4 linhas na nota → 1 venda com 4 itens (D3)", () => {
    const result = parseXmlInvoice(readFixture(FIXTURE_SHOPEE_4));

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const { invoice } = result;

    expect(invoice.invoiceNumber).toBe("804");
    expect(invoice.grossCents).toBe(8695); // 15,50 + 18,40 + 18,64 + 34,41
    expect(invoice.items).toHaveLength(4);
    expect(invoice.items.map((i) => i.totalCents)).toEqual([1550, 1840, 1864, 3441]);
    expect(invoice.warnings).toEqual([]); // soma dos itens == vNF
  });

  it("normaliza decimais do TikTok (qCom 1.0000, vUnCom 18.8800000000)", () => {
    const result = parseXmlInvoice(readFixture(FIXTURE_TIKTOK));

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const { invoice } = result;

    expect(invoice.invoiceNumber).toBe("4");
    expect(invoice.serie).toBe("3");
    const [item] = invoice.items;
    expect(item.quantity).toBe(1);
    expect(item.unitPriceCents).toBe(1888);
    expect(item.totalCents).toBe(1888);
  });

  it("bruto é SEMPRE vNF — frete embutido vira warning, nunca correção (D5)", () => {
    const result = parseXmlInvoice(readFixture(FIXTURE_TIKTOK));

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.invoice.grossCents).toBe(3208); // vNF 32,08 (18,88 + frete 13,20)
    expect(result.invoice.freightCents).toBe(1320); // vFrete 13,20 (005)
    expect(result.invoice.warnings.some((w) => w.includes("difere do vNF"))).toBe(true);
  });

  it("rejeita XML malformado com erro", () => {
    const result = parseXmlInvoice(readFixture(FIXTURE_MALFORMED));
    expect(result.ok).toBe(false);
  });

  it("rejeita conteúdo não-XML / vazio", () => {
    expect(parseXmlInvoice("").ok).toBe(false);
    expect(parseXmlInvoice("<div>html</div>").ok).toBe(false);
  });

  it("rejeita NFe de modelo diferente de 55", () => {
    const xml = readFixture(FIXTURE_SHOPEE_1).replace("<mod>55</mod>", "<mod>65</mod>");
    const result = parseXmlInvoice(xml);
    expect(result.ok).toBe(false);
  });

  it("rejeita vNF ausente", () => {
    const xml = readFixture(FIXTURE_SHOPEE_1).replace("<vNF>15.50</vNF>", "");
    const result = parseXmlInvoice(xml);
    expect(result.ok).toBe(false);
  });
});
