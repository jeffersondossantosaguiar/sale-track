"use client";

import { type FeesState, reverseSaleFrom, setChannelFeeFrom, setSaleFeeFrom } from "@/app/actions/sales-fees";
import { MAX_FEE_BPS } from "@/lib/domain/fees";
import { formatBRL } from "@/lib/domain/money";
import type { ChannelSummaryRow, SaleRow } from "@/lib/sales/service";
import type { Channel } from "@/lib/xml/channel";
import { useEffect, useState, useTransition } from "react";

/**
 * T041 — Taxas (US5): % padrão por canal (settings) + resumo do faturamento
 * por canal (bruto / taxas / líquido) + taxa editável em cada venda da lista.
 * O bruto da NFe nunca muda (faturamento imutável): editar taxa recalcula
 * líquido/margem apenas (T040).
 */

const CANAL_LABEL: Record<Channel, string> = {
  shopee: "Shopee",
  tiktok: "TikTok",
  presencial: "Presencial",
};

export default function TaxesPanel({
  initialSales,
  initialByChannel,
  initialChannelFees,
}: {
  initialSales: SaleRow[];
  initialByChannel: ChannelSummaryRow[];
  initialChannelFees: Record<Channel, number>;
}) {
  const [fees, setFees] = useState<FeesState>({
    sales: initialSales,
    byChannel: initialByChannel,
    channelFees: initialChannelFees,
  });
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [message, setMessage] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  // irmãos (ex.: venda presencial) atualizam via router.refresh() → props novas
  useEffect(() => {
    setFees({ sales: initialSales, byChannel: initialByChannel, channelFees: initialChannelFees });
  }, [initialSales, initialByChannel, initialChannelFees]);

  const channelDraft = (channel: Channel, bps: number): string => drafts[`channel:${channel}`] ?? inputBps(bps);

  const saleDraft = (saleId: number, bps: number): string => drafts[`sale:${saleId}`] ?? inputBps(bps);

  const applyChannel = (channel: Channel) => {
    const form = new FormData();
    form.set("channel", channel);
    form.set("bps", channelDraft(channel, fees.channelFees[channel] ?? 0));
    startTransition(async () => apply(await setChannelFeeFrom(form)));
  };

  const applySale = (saleId: number, current: number) => {
    const form = new FormData();
    form.set("id", String(saleId));
    form.set("bps", saleDraft(saleId, current));
    startTransition(async () => apply(await setSaleFeeFrom(form)));
  };

  const apply = (result: { ok: true; data: FeesState } | { ok: false; error: string }) => {
    if (!result.ok) {
      setMessage(result.error);
      return;
    }
    setMessage(null);
    setDrafts({});
    setFees(result.data);
  };

  const estornar = (sale: SaleRow) => {
    const refundDate = window.prompt("Data do estorno (AAAA-MM-DD):", todayIso());
    if (!refundDate) return;
    const form = new FormData();
    form.set("id", String(sale.id));
    form.set("date", refundDate);
    startTransition(async () => apply(await reverseSaleFrom(form)));
  };

  const grossTotal = fees.byChannel.reduce((sum, row) => sum + row.grossCents, 0);
  const feeTotal = fees.byChannel.reduce((sum, row) => sum + row.feeCents, 0);
  const netTotal = fees.byChannel.reduce((sum, row) => sum + row.netCents, 0);

  return (
    <section className="space-y-4">
      <div className="rounded-lg border bg-card p-4">
        <h2 className="text-sm font-semibold">Taxa padrão por canal</h2>
        <p className="mt-0.5 text-xs text-muted-foreground">
          A % configurada vira a taxa inicial das próximas vendas importadas do canal (editável em cada venda abaixo).
        </p>
        <div className="mt-3 grid gap-3 sm:grid-cols-3">
          {(Object.keys(CANAL_LABEL) as Channel[]).map((channel) => (
            <label key={channel} className="block">
              <span className="text-xs text-muted-foreground">{CANAL_LABEL[channel]} (%)</span>
              <div className="mt-1 flex items-center gap-2">
                <input
                  type="number"
                  min={0}
                  max={MAX_FEE_BPS / 100}
                  step={0.1}
                  value={channelDraft(channel, fees.channelFees[channel] ?? 0)}
                  onChange={(event) => setDrafts((prev) => ({ ...prev, [`channel:${channel}`]: event.target.value }))}
                  onBlur={() => applyChannel(channel)}
                  className="w-28 rounded-md border bg-background px-3 py-1.5 text-sm"
                />
                <button
                  type="button"
                  onClick={() => applyChannel(channel)}
                  disabled={pending}
                  className="rounded-md border px-2 py-1.5 text-xs text-muted-foreground disabled:opacity-50"
                >
                  Aplicar
                </button>
              </div>
            </label>
          ))}
        </div>
        {message && <p className="mt-2 text-xs text-red-600">{message}</p>}
      </div>

      <div className="rounded-lg border bg-card p-4">
        <h2 className="text-sm font-semibold">Resumo por canal</h2>
        <div className="mt-3 overflow-auto">
          <table className="w-full text-left text-sm">
            <thead className="text-xs uppercase text-muted-foreground">
              <tr>
                <th className="px-1 py-1">Canal</th>
                <th className="px-1 py-1 text-right">Vendas</th>
                <th className="px-1 py-1 text-right">Bruto</th>
                <th className="px-1 py-1 text-right">Taxas</th>
                <th className="px-1 py-1 text-right">Líquido</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {fees.byChannel.map((row) => (
                <tr key={row.channel}>
                  <td className="px-1 py-2">{CANAL_LABEL[row.channel as Channel] ?? row.channel}</td>
                  <td className="px-1 py-2 text-right">{row.count}</td>
                  <td className="px-1 py-2 text-right">{formatBRL(row.grossCents)}</td>
                  <td className="px-1 py-2 text-right">− {formatBRL(row.feeCents)}</td>
                  <td className="px-1 py-2 text-right font-medium">{formatBRL(row.netCents)}</td>
                </tr>
              ))}
              {fees.byChannel.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-1 py-2 text-xs text-muted-foreground">
                    Nenhuma venda registrada ainda.
                  </td>
                </tr>
              )}
              {fees.byChannel.length > 0 && (
                <tr className="font-medium">
                  <td className="px-1 py-2">Total</td>
                  <td className="px-1 py-2 text-right" />
                  <td className="px-1 py-2 text-right">{formatBRL(grossTotal)}</td>
                  <td className="px-1 py-2 text-right">− {formatBRL(feeTotal)}</td>
                  <td className="px-1 py-2 text-right">{formatBRL(netTotal)}</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {fees.sales.length > 0 && (
        <div className="rounded-lg border bg-card">
          <div className="max-h-96 overflow-auto">
            <table className="w-full text-left text-sm">
              <thead className="sticky top-0 bg-muted/60 text-xs uppercase text-muted-foreground">
                <tr>
                  <th className="px-4 py-2">Data</th>
                  <th className="px-4 py-2">Canal</th>
                  <th className="px-4 py-2">Itens</th>
                  <th className="px-4 py-2 text-right">Bruto</th>
                  <th className="px-4 py-2">Taxa</th>
                  <th className="px-4 py-2 text-right">Líquido</th>
                  <th className="px-4 py-2 text-right">Margem</th>
                  <th className="px-4 py-2" />
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {fees.sales.map((sale) => {
                  const bps = sale.grossCents > 0 ? Math.round((sale.feeCents / sale.grossCents) * 10_000) : 0;
                  return (
                    <tr key={sale.id}>
                      <td className="px-4 py-2 whitespace-nowrap">{sale.saleDate.toISOString().slice(0, 10)}</td>
                      <td className="px-4 py-2">
                        <span className="text-xs text-muted-foreground">
                          {CANAL_LABEL[sale.channel as Channel] ?? sale.channel}
                        </span>
                        {sale.invoiceNumber && (
                          <span className="ml-1 text-xs text-muted-foreground">· NF {sale.invoiceNumber}</span>
                        )}
                      </td>
                      <td className="max-w-52 px-4 py-2 text-xs">
                        <span className="line-clamp-1">{sale.firstItem ?? "—"}</span>
                        {sale.itemCount > 1 && <span className="text-muted-foreground"> · {sale.itemCount} un</span>}
                      </td>
                      <td className="px-4 py-2 text-right whitespace-nowrap">{formatBRL(sale.grossCents)}</td>
                      <td className="px-4 py-2">
                        <div className="flex items-center gap-1">
                          <input
                            type="number"
                            min={0}
                            max={MAX_FEE_BPS / 100}
                            step={0.1}
                            value={saleDraft(sale.id, bps)}
                            onChange={(event) =>
                              setDrafts((prev) => ({ ...prev, [`sale:${sale.id}`]: event.target.value }))
                            }
                            onKeyDown={(event) => {
                              if (event.key === "Enter") applySale(sale.id, bps);
                            }}
                            className="w-20 rounded-md border bg-background px-2 py-1 text-sm"
                          />
                          <button
                            type="button"
                            onClick={() => applySale(sale.id, bps)}
                            disabled={pending}
                            className="rounded-md border px-1.5 py-1 text-xs text-muted-foreground disabled:opacity-50"
                          >
                            ok
                          </button>
                        </div>
                      </td>
                      <td className="px-4 py-2 text-right whitespace-nowrap">{formatBRL(sale.netCents)}</td>
                      <td className="px-4 py-2 text-right whitespace-nowrap text-xs">{formatBRL(sale.liquidCents)}</td>
                      <td className="px-4 py-2 text-right whitespace-nowrap">
                        {sale.status === "normal" ? (
                          <button
                            type="button"
                            onClick={() => estornar(sale)}
                            disabled={pending}
                            className="rounded-md border px-2 py-1 text-xs text-muted-foreground hover:text-red-600 disabled:opacity-50"
                          >
                            Estornar
                          </button>
                        ) : (
                          <span className="text-xs font-medium text-red-600">estornado</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </section>
  );
}

/** centavos de taxa em % (bps p/ input): taxa é um percentual do bruto. */
function inputBps(bps: number): string {
  return String(bps / 100);
}

function todayIso(): string {
  const d = new Date();
  const pad = (value: number) => String(value).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}
