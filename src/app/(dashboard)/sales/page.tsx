import { listAllVariants } from "@/lib/catalog/service";
import { FEE_CHANNELS } from "@/lib/domain/fees";
import {
  byChannelSummary,
  getChannelFeeBps,
  getChannelFeeFixedCents,
  listSales,
  monthlyGross,
} from "@/lib/sales/service";
import type { Channel } from "@/lib/xml/channel";
import type { Metadata } from "next";
import XmlImportForm from "./import-form";
import PresentialPanel from "./presential";
import TaxesPanel from "./taxes-panel";

export const metadata: Metadata = {
  title: "Vendas · sale-track",
};

export default function SalesPage() {
  const sales = listSales();
  const variants = listAllVariants();
  const now = new Date();
  const month = { year: now.getFullYear(), month: now.getMonth() + 1 };
  const monthTotal = monthlyGross(month);
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
        <h1 className="text-xl font-semibold">Vendas</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Importe as NFe baixadas dos painéis (Shopee/TikTok) e lance à mão as vendas presenciais — ambas contam para o
          faturamento do mês e do teto MEI (a presencial também entra no caixa).
        </p>
      </div>
      <XmlImportForm />
      <PresentialPanel initialMonthTotal={monthTotal} initialMonth={month} variants={variants} />
      <TaxesPanel
        initialSales={sales}
        initialByChannel={byChannelSummary()}
        initialChannelFees={channelFees}
        initialChannelFeesFixed={channelFixedFees}
      />
    </div>
  );
}
