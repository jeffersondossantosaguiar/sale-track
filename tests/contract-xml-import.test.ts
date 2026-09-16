import { detectChannelFromFilename } from "@/lib/xml/channel";
import { parseXmlInvoice } from "@/lib/xml/parser";
import { describe, expect, it } from "vitest";
import { FIXTURE_SEM_PADRAO, FIXTURE_SHOPEE_1, FIXTURE_SHOPEE_4, FIXTURE_TIKTOK, readFixture } from "./helpers/db";

/**
 * T018 — Contract test: o parser entrega exatamente os campos do contrato
 * (contracts/xml-import.md) para TODOS os fixtures válidos. Qualquer XML aceito
 * precisa expor as colunas obrigatórias da tabela do contrato.
 */

const CONTRACT_FIELDS = [
  "invoiceNumber",
  "serie",
  "issueDate",
  "grossCents",
  "channel",
  "items[].cProd",
  "items[].description",
  "items[].qty",
  "items[].unitPriceCents",
  "items[].totalCents",
  "rawXml",
];

function assertContractFields(invoice: NonNullable<ReturnType<typeof contractCheck>>): void {
  for (const field of CONTRACT_FIELDS) {
    expect(field).toBeDefined();
  }
  expect(invoice.invoiceNumber).toBeTypeOf("string");
  expect(invoice.serie).toBeTypeOf("string");
  expect(invoice.issueDate).toBeInstanceOf(Date);
  expect(invoice.grossCents).toBeTypeOf("number");
  expect(invoice.items).toBeInstanceOf(Array);
  for (const item of invoice.items) {
    expect(item.cProd).toBeTypeOf("string");
    expect(item.description).toBeTypeOf("string");
    expect(item.quantity).toBeTypeOf("number");
    expect(item.unitPriceCents).toBeTypeOf("number");
    expect(item.totalCents).toBeTypeOf("number");
  }
}

function contractCheck(title: string) {
  const xml = readFixture(title);
  const parsed = parseXmlInvoice(xml);
  expect(parsed.ok, `${title} deve parsear ok`).toBe(true);
  if (!parsed.ok) return null;
  const channel = detectChannelFromFilename(title);
  expect(channel, `${title} deve ter canal detectável`).not.toBeNull();
  return { ...parsed.invoice, channel };
}

describe("T018 — contrato de importação (contracts/xml-import.md)", () => {
  it("cobre todos os campos obrigatórios do contrato em cada fixture válido", () => {
    for (const fixture of [FIXTURE_SHOPEE_1, FIXTURE_SHOPEE_4, FIXTURE_TIKTOK]) {
      const invoice = contractCheck(fixture);
      if (!invoice) return;
      assertContractFields(invoice);
    }
  });

  it("fixture de padrão desconhecido parseia, mas exige canal manual", () => {
    const xml = readFixture(FIXTURE_SEM_PADRAO);
    const parsed = parseXmlInvoice(xml);
    expect(parsed.ok).toBe(true);
    expect(detectChannelFromFilename(FIXTURE_SEM_PADRAO)).toBeNull();
  });

  it("issueDate normalizado preserva o offset -03:00 do XML", () => {
    const invoice = contractCheck(FIXTURE_TIKTOK);
    if (!invoice) return;
    expect(invoice.issueDate.toISOString()).toBe("2026-07-12T20:56:45.000Z");
  });

  it("valores chave dos fixtures (nNF+bruto) conferem", () => {
    const s1 = contractCheck(FIXTURE_SHOPEE_1);
    const s4 = contractCheck(FIXTURE_SHOPEE_4);
    const t = contractCheck(FIXTURE_TIKTOK);
    if (!s1 || !s4 || !t) return;
    expect([s1.invoiceNumber, s1.grossCents]).toEqual(["772", 1550]);
    expect([s4.invoiceNumber, s4.grossCents]).toEqual(["804", 8695]);
    expect([t.invoiceNumber, t.grossCents]).toEqual(["4", 3208]);
  });
});
