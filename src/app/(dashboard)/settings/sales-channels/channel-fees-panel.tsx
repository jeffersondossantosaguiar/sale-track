"use client";

import { setChannelFeeFrom } from "@/app/actions/sales-fees";
import { MAX_FEE_BPS } from "@/lib/domain/fees";
import type { Channel } from "@/lib/xml/channel";
import { useState, useTransition } from "react";

/**
 * FR-013 — Taxa padrão por canal (% + fixa). Extraído do taxes-panel em Vendas.
 * O resumo por canal e a lista operacional de vendas permanecem em Vendas.
 */

const CANAL_LABEL: Record<Channel, string> = {
  shopee: "Shopee",
  tiktok: "TikTok",
  presencial: "Presencial",
};

export default function ChannelFeesPanel({
  initialChannelFees,
  initialChannelFeesFixed,
}: {
  initialChannelFees: Record<Channel, number>;
  initialChannelFeesFixed: Record<Channel, number>;
}) {
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [message, setMessage] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const channelDraft = (channel: Channel, bps: number): string => drafts[`channel:${channel}`] ?? inputBps(bps);
  const fixedDraft = (channel: Channel, cents: number): string => drafts[`fixed:${channel}`] ?? toBRL(cents);

  const applyChannel = (channel: Channel) => {
    const form = new FormData();
    form.set("channel", channel);
    form.set("bps", channelDraft(channel, initialChannelFees[channel] ?? 0));
    form.set("fixedCents", String(centsOf(fixedDraft(channel, initialChannelFeesFixed[channel] ?? 0))));
    startTransition(async () => {
      const r = await setChannelFeeFrom(form);
      if (r.ok) {
        setMessage(null);
        setDrafts({});
      } else {
        setMessage(r.error);
      }
    });
  };

  return (
    <div className="space-y-3">
      <h3 className="text-xs font-semibold text-muted-foreground">Taxa padrão por canal</h3>
      <p className="text-xs text-muted-foreground">
        A % e a taxa fixa configuradas viram a taxa inicial das próximas vendas importadas do canal.
      </p>
      <div className="grid gap-3 sm:grid-cols-3">
        {(Object.keys(CANAL_LABEL) as Channel[]).map((channel) => (
          <div key={channel} className="rounded-md border bg-background p-2">
            <span className="text-xs text-muted-foreground">{CANAL_LABEL[channel]}</span>
            <div className="mt-1 flex items-center gap-2">
              <label className="block">
                <span className="text-[10px] text-muted-foreground">%</span>
                <input
                  type="number"
                  min={0}
                  max={MAX_FEE_BPS / 100}
                  step={0.1}
                  value={channelDraft(channel, initialChannelFees[channel] ?? 0)}
                  onChange={(event) => setDrafts((prev) => ({ ...prev, [`channel:${channel}`]: event.target.value }))}
                  className="w-20 rounded-md border bg-background px-2 py-1 text-sm"
                />
              </label>
              <label className="block">
                <span className="text-[10px] text-muted-foreground">Fixa (R$)</span>
                <input
                  value={fixedDraft(channel, initialChannelFeesFixed[channel] ?? 0)}
                  onChange={(event) => setDrafts((prev) => ({ ...prev, [`fixed:${channel}`]: event.target.value }))}
                  inputMode="decimal"
                  placeholder="0,00"
                  className="w-20 rounded-md border bg-background px-2 py-1 text-sm"
                />
              </label>
              <button
                type="button"
                onClick={() => applyChannel(channel)}
                disabled={pending}
                className="mt-3 rounded-md border px-2 py-1 text-xs text-muted-foreground disabled:opacity-50"
              >
                Aplicar
              </button>
            </div>
          </div>
        ))}
      </div>
      {message && <p className="text-xs text-red-600">{message}</p>}
    </div>
  );
}

function inputBps(bps: number): string {
  return String(bps / 100);
}

function toBRL(cents: number): string {
  return (cents / 100).toFixed(2).replace(".", ",");
}

function centsOf(raw: string): number {
  const cleaned = raw
    .trim()
    .replace(/[R$\s]/g, "")
    .replace(".", "")
    .replace(",", ".");
  const value = Math.round(Number(cleaned) * 100);
  return Number.isFinite(value) && value >= 0 ? value : 0;
}
