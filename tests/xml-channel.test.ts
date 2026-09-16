import { CHANNEL_LABELS, PICKABLE_CHANNELS, detectChannelFromFilename } from "@/lib/xml/channel";
import { describe, expect, it } from "vitest";

describe("T016 — detecção de canal por padrão de nome de arquivo (D2)", () => {
  it("reconhece padrão Shopee (`_invoice_file_`)", () => {
    expect(detectChannelFromFilename("260712NNN_invoice_file_1783889608_fixture1.xml")).toBe("shopee");
    expect(detectChannelFromFilename("290106ABC_invoice_file_1784296401.xml")).toBe("shopee");
    expect(detectChannelFromFilename("2345678901234567_invoice_file_12_a1b2c3d4.xml")).toBe("shopee");
  });

  it("reconhece padrão TikTok (número puro ~13 dígitos)", () => {
    expect(detectChannelFromFilename("1783889877430.xml")).toBe("tiktok");
    expect(detectChannelFromFilename("1234567890123.xml")).toBe("tiktok");
  });

  it("não classifica número com prefixo como TikTok", () => {
    expect(detectChannelFromFilename("2926060012_invoice_file_1783889608.xml")).toBe("shopee");
  });

  it("retorna null para padrão desconhecido (exige escolha manual)", () => {
    expect(detectChannelFromFilename("sem_padrao_pedido_xyz.xml")).toBeNull();
    expect(detectChannelFromFilename("_malformed.xml")).toBeNull();
    expect(detectChannelFromFilename("nota_foto.jpg")).toBeNull();
    expect(detectChannelFromFilename("")).toBeNull();
  });

  it("tolera path no nome para classificar o basename", () => {
    expect(detectChannelFromFilename("/tmp/nfe/260712NNN_invoice_file_1783889608_fixture1.xml")).toBe("shopee");
    expect(detectChannelFromFilename("C:\\\\nfe\\\\1783889877430.xml")).toBe("tiktok");
  });

  it("mantém constantes de UI coerentes com o enum", () => {
    expect(Object.keys(CHANNEL_LABELS).sort()).toEqual(["presencial", "shopee", "tiktok"]);
    expect(PICKABLE_CHANNELS).toContain("presencial");
  });
});
