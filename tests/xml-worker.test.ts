import { handleWorkerFiles } from "@/lib/xml/worker";
import { describe, expect, it } from "vitest";
import { FIXTURE_MALFORMED, FIXTURE_NOT_XML, FIXTURE_SHOPEE_1, readFixture } from "./helpers/db";

describe("T022 — worker de parse em lote (função pura)", () => {
  it("marca arquivo não-XML como skipped e segue o lote", () => {
    const response = handleWorkerFiles([
      { filename: "nota_foto.jpg", content: "jpeg fake" },
      { filename: FIXTURE_SHOPEE_1, content: readFixture(FIXTURE_SHOPEE_1) },
      { filename: FIXTURE_MALFORMED, content: "<nfeProc><NFe>" },
    ]);

    expect(response.results).toHaveLength(3);
    expect(response.results[0]).toEqual({ status: "skipped", filename: FIXTURE_NOT_XML, reason: "not-xml" });
    expect(response.results[1]).toMatchObject({ status: "ok", channel: "shopee" });
    expect(response.results[2]).toMatchObject({ status: "error" });
  });

  it("lote vazio devolve lista vazia", () => {
    expect(handleWorkerFiles([]).results).toEqual([]);
  });

  it("sugere canal TikTok para número puro", () => {
    const response = handleWorkerFiles([{ filename: "1783889877430.xml", content: readFixture("1783889877430.xml") }]);
    expect(response.results[0]).toMatchObject({ status: "ok", channel: "tiktok" });
  });
});
