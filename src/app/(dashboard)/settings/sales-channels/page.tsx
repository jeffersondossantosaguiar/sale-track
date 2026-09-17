import { listChannelFeeTiers } from "@/lib/catalog/service";
import { FEE_TIERS_CHANNELS } from "@/lib/domain/fees";
import type { Metadata } from "next";
import ChannelFeesPanel from "./channel-fees-panel";

export const metadata: Metadata = {
  title: "Taxas por canal · sale-track",
};

export default function SalesChannelsPage() {
  const channelTiers = Object.fromEntries(
    FEE_TIERS_CHANNELS.map((channel) => [channel, listChannelFeeTiers(channel)]),
  ) as Record<
    "shopee" | "tiktok",
    Array<{ minCents: number; maxCents: number | null; commissionBps: number; fixedCents: number }>
  >;
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold">Taxas por canal</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Configure as faixas de taxa por canal (comissão% + fixa por valor do item) — usadas no preço sugerido. O
          resumo por canal e a lista operacional de vendas continuam em Vendas.
        </p>
      </div>

      <div className="rounded-lg border bg-card p-4">
        <ChannelFeesPanel initialChannelTiers={channelTiers} />
      </div>
    </div>
  );
}
