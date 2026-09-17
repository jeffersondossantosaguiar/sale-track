import { listChannelFeeTiers } from "@/lib/catalog/service";
import { getSerieChannelMap } from "@/lib/db/settings";
import { FEE_TIERS_CHANNELS } from "@/lib/domain/fees";
import type { Metadata } from "next";
import ChannelSettingsPanel from "./channel-settings-panel";

export const metadata: Metadata = {
  title: "Canais · sale-track",
};

export default function ChannelsPage() {
  const serieChannelMap = getSerieChannelMap();
  const channelTiers = Object.fromEntries(
    FEE_TIERS_CHANNELS.map((channel) => [channel, listChannelFeeTiers(channel)]),
  ) as Record<
    "shopee" | "tiktok",
    Array<{ minCents: number; maxCents: number | null; commissionBps: number; fixedCents: number }>
  >;
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold">Canais</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Configurações por canal: as séries de emissão da NFe que identificam o canal na importação (Shopee/TikTok) e
          as faixas de taxa usadas no preço sugerido. O resumo por canal e a lista operacional de vendas continuam em
          Vendas.
        </p>
      </div>

      <div className="rounded-lg border bg-card p-4">
        <ChannelSettingsPanel initialSerieChannelMap={serieChannelMap} initialChannelTiers={channelTiers} />
      </div>
    </div>
  );
}
