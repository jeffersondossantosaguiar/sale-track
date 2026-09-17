import { FEE_CHANNELS } from "@/lib/domain/fees";
import { getChannelFeeBps, getChannelFeeFixedCents } from "@/lib/sales/service";
import type { Channel } from "@/lib/xml/channel";
import type { Metadata } from "next";
import ChannelFeesPanel from "./channel-fees-panel";

export const metadata: Metadata = {
  title: "Taxas por canal · sale-track",
};

export default function SalesChannelsPage() {
  const channelFees = Object.fromEntries(FEE_CHANNELS.map((channel) => [channel, getChannelFeeBps(channel)])) as Record<
    Channel,
    number
  >;
  const channelFixedFees = Object.fromEntries(
    FEE_CHANNELS.map((channel) => [channel, getChannelFeeFixedCents(channel)]),
  ) as Record<Channel, number>;
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold">Taxas por canal</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Configure a taxa padrão (% e fixa) por canal. O resumo por canal e a lista operacional de vendas continuam em
          Vendas.
        </p>
      </div>

      <div className="rounded-lg border bg-card p-4">
        <ChannelFeesPanel initialChannelFees={channelFees} initialChannelFeesFixed={channelFixedFees} />
      </div>
    </div>
  );
}
