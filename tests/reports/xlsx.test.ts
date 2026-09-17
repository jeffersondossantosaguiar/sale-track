import { parseXlsx } from "@/lib/reports/grid";
import { describe, expect, it } from "vitest";

/**
 * 005/US3 — leitor de xlsx (zip + xml mínimo, sem dependência). Este teste constrói
 * um xlsx mínimo em memória (entradas stored) e garante a leitura da grade e das
 * shared strings — protegendo o parser contra regressão (central directory).
 */

const NS = "http://schemas.openxmlformats.org/spreadsheetml/2006/main";

function crc32(buf: Uint8Array): number {
  let c = ~0;
  for (let i = 0; i < buf.length; i++) {
    c ^= buf[i] ?? 0;
    for (let k = 0; k < 8; k++) c = (c >>> 1) ^ (0xedb88320 & -(c & 1));
  }
  return ~c >>> 0;
}

function buildZip(entries: Array<{ name: string; data: Uint8Array }>): Buffer {
  const parts: Buffer[] = [];
  const central: Buffer[] = [];
  let offset = 0;

  for (const entry of entries) {
    const nameBuf = Buffer.from(entry.name, "utf8");
    const data = Buffer.from(entry.data);
    const local = Buffer.alloc(30);
    local.writeUInt32LE(0x04034b50, 0); // signature
    local.writeUInt16LE(20, 4); // version needed
    local.writeUInt16LE(0, 6); // flags (no data descriptor)
    local.writeUInt16LE(0, 8); // method = stored
    local.writeUInt32LE(crc32(entry.data), 14); // crc32
    local.writeUInt32LE(data.length, 18); // compressed size
    local.writeUInt32LE(data.length, 22); // uncompressed size
    local.writeUInt16LE(nameBuf.length, 26);
    local.writeUInt16LE(0, 28); // extra len
    parts.push(local, nameBuf, data);

    const cen = Buffer.alloc(46);
    cen.writeUInt32LE(0x02014b50, 0); // signature
    cen.writeUInt16LE(20, 6); // version needed
    cen.writeUInt16LE(0, 8); // flags
    cen.writeUInt16LE(0, 10); // method = stored
    cen.writeUInt32LE(crc32(entry.data), 16);
    cen.writeUInt32LE(data.length, 20); // compressed size
    cen.writeUInt32LE(data.length, 24); // uncompressed size
    cen.writeUInt16LE(nameBuf.length, 28);
    cen.writeUInt16LE(0, 30);
    cen.writeUInt32LE(offset, 42); // local header offset
    central.push(cen, nameBuf);

    offset += 30 + nameBuf.length + data.length;
  }

  const centralStart = offset;
  const centralBuf = Buffer.concat(central);
  const eocd = Buffer.alloc(22);
  eocd.writeUInt32LE(0x06054b50, 0); // signature
  eocd.writeUInt16LE(entries.length, 8);
  eocd.writeUInt16LE(entries.length, 10);
  eocd.writeUInt32LE(centralBuf.length, 12);
  eocd.writeUInt32LE(centralStart, 16);

  return Buffer.concat([...parts, centralBuf, eocd]);
}

describe("reports.xlsx (005/US3)", () => {
  it("lê a primeira planilha e as shared strings via central directory", () => {
    const sheet = `<?xml version="1.0"?><worksheet xmlns="${NS}"><sheetData><row r="1"><c r="A1" t="s"><v>0</v></c><c r="B1"><v>12.5</v></c></row></sheetData></worksheet>`;
    const shared = `<sst xmlns="${NS}"><si><t>Renda do pedido</t></si></sst>`;
    const xlsx = buildZip([
      { name: "xl/sharedStrings.xml", data: new TextEncoder().encode(shared) },
      { name: "xl/worksheets/sheet1.xml", data: new TextEncoder().encode(sheet) },
    ]);

    const rows = parseXlsx(xlsx);
    expect(rows).toHaveLength(1);
    expect(rows[0]).toEqual(["Renda do pedido", "12.5"]);
  });

  it("lança erro sem planilha", () => {
    const xlsx = buildZip([{ name: "xl/other.xml", data: new TextEncoder().encode("<x/>") }]);
    expect(() => parseXlsx(xlsx)).toThrow(/sem planilha/i);
  });
});
