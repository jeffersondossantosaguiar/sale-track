"use client";

import { saveChannelFeeTiersAction } from "@/app/actions/catalog";
import { formatTierForText, parseFeeTiersText } from "@/lib/domain/fees";
import { useState, useTransition } from "react";

/**
 * 005 — Taxa de cada canal = tabela de faixas (comissão% + fixa por valor do item),
 * usada no preço sugerido. Editor de texto → linhas estruturadas com prévia e
 * validação antes de salvar. (O antigo "% + fixa" por canal foi substituído.)
 */

const CANAL_LABEL: Record<string, string> = {
  shopee: "Shopee",
  tiktok: "TikTok",
};

const TIER_CHANNELS = ["shopee", "tiktok"] as const;

type Tier = { minCents: number; maxCents: number | null; commissionBps: number; fixedCents: number };

export default function ChannelFeesPanel({
  initialChannelTiers,
}: {
  initialChannelTiers: Record<"shopee" | "tiktok", Tier[]>;
}) {
  return (
    <div className="space-y-5">
      {TIER_CHANNELS.map((channel) => (
        <FeeTiersEditor key={channel} channel={channel} initial={initialChannelTiers[channel]} />
      ))}
    </div>
  );
}

function FeeTiersEditor({ channel, initial }: { channel: "shopee" | "tiktok"; initial: Tier[] }) {
  const [text, setText] = useState(initial.map(formatTierForText).join("\n"));
  const [saved, setSaved] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const preview = (() => {
    try {
      return { ok: true as const, tiers: parseFeeTiersText(text) };
    } catch (error) {
      return { ok: false as const, error: error instanceof Error ? error.message : String(error) };
    }
  })();

  const save = () => {
    const form = new FormData();
    form.set("channel", channel);
    form.set("text", text);
    startTransition(async () => {
      const r = await saveChannelFeeTiersAction(form);
      if (r.ok) setSaved("Faixas salvas e preços sugeridos recalculados.");
      else setSaved(r.error);
    });
  };

  return (
    <div className="rounded-md border bg-background p-3">
      <h3 className="text-xs font-semibold text-muted-foreground">Faixas de taxa — {CANAL_LABEL[channel]}</h3>
      <p className="mt-1 text-xs text-muted-foreground">
        Uma regra por linha, ex.: <code className="text-[11px]">{"<= 79,99 = 20% + 4"}</code> ·{" "}
        <code className="text-[11px]">{"80,00 - 99,99 = 14% + 4"}</code> ·{" "}
        <code className="text-[11px]">{">= 500,00 = 14% + 26"}</code>
      </p>
      <textarea
        value={text}
        onChange={(event) => setText(event.target.value)}
        rows={initial.length || 2}
        spellCheck={false}
        className="mt-2 w-full rounded-md border bg-background px-2 py-1 font-mono text-xs"
      />
      <div className="mt-2 text-xs">
        <span className="text-muted-foreground">Prévia: </span>
        {preview.ok ? (
          <span className="text-green-700">
            {preview.tiers
              .map((t) => `${formatTierForText(t)} (${(t.commissionBps / 100).toFixed(0).replace(".", ",")}%)`)
              .join(" · ")}
          </span>
        ) : (
          <span className="text-red-600">{preview.error}</span>
        )}
      </div>
      <div className="mt-2 flex items-center gap-2">
        <button
          type="button"
          onClick={save}
          disabled={pending || !preview.ok}
          className="rounded-md border px-2 py-1 text-xs text-muted-foreground disabled:opacity-50"
        >
          Salvar faixas
        </button>
        {saved && <span className="text-xs text-green-700">{saved}</span>}
      </div>
    </div>
  );
}
