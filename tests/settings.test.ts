import { getSerieChannelMap, setSerieChannelMap, setSetting } from "@/lib/db/settings";
import { describe, expect, it } from "vitest";
import { setupTestDb } from "./helpers/db";

describe("mapa série→canal (detecção de canal na importação)", () => {
  it("round-trip salva e lê o mapa", () => {
    const { db, cleanup } = setupTestDb();
    try {
      expect(getSerieChannelMap({ db })).toEqual({});
      setSerieChannelMap({ "1": "shopee", "2": "shopee", "3": "tiktok" }, { db });
      expect(getSerieChannelMap({ db })).toEqual({ "1": "shopee", "2": "shopee", "3": "tiktok" });
      setSerieChannelMap({ "3": "tiktok" }, { db });
      expect(getSerieChannelMap({ db })).toEqual({ "3": "tiktok" });
    } finally {
      cleanup();
    }
  });

  it("descarta valores inválidos na leitura (canais fora de Shopee/TikTok)", () => {
    const { db, cleanup } = setupTestDb();
    try {
      setSetting("nfe_serie_channel", JSON.stringify({ "1": "shopee", "9": "presencial", "3": "tiktok" }), { db });
      expect(getSerieChannelMap({ db })).toEqual({ "1": "shopee", "3": "tiktok" });
      setSetting("nfe_serie_channel", "not json", { db });
      expect(getSerieChannelMap({ db })).toEqual({});
    } finally {
      cleanup();
    }
  });
});
