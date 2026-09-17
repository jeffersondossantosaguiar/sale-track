"use client";

import { saveChannelFeeTiersAction } from "@/app/actions/catalog";
import { saveSerieChannelMapAction } from "@/app/actions/settings";
import { formatTierForText, parseFeeTiersText } from "@/lib/domain/fees";
import { cn } from "@/lib/utils";
import type { SerieChannelMap } from "@/lib/xml/channel";
import { useState, useTransition } from "react";

/**
 * Página unificada "Canais" — configurações por canal. Cada canal (Shopee/TikTok)
 * tem um card com (1) as séries de emissão usadas para detectar o canal na
 * importação NFe e (2) as faixas de taxa (comissão% + fixa) usadas no preço.
 * As séries são agrupadas por canal na UI, mas persistidas como mapa plano.
 */

const CHANNELS = ["shopee", "tiktok"] as const;
type Channel = (typeof CHANNELS)[number];

const CANAL_LABEL: Record<Channel, string> = { shopee: "Shopee", tiktok: "TikTok" };

type Tier = { minCents: number; maxCents: number | null; commissionBps: number; fixedCents: number };

/** Inverte o mapa plano série→canal em séries agrupadas por canal. */
function seriesByChannel(map: SerieChannelMap): Record<Channel, string[]> {
  const grouped: Record<Channel, string[]> = { shopee: [], tiktok: [] };
  for (const [serie, channel] of Object.entries(map)) {
    if (channel === "shopee" || channel === "tiktok") grouped[channel].push(serie);
  }
  grouped.shopee.sort();
  grouped.tiktok.sort();
  return grouped;
}

export default function ChannelSettingsPanel({
  initialSerieChannelMap,
  initialChannelTiers,
}: {
  initialSerieChannelMap: SerieChannelMap;
  initialChannelTiers: Record<Channel, Tier[]>;
}) {
  return (
    <div className="space-y-5">
      {CHANNELS.map((channel) => (
        <ChannelCard
          key={channel}
          channel={channel}
          initialSeries={seriesByChannel(initialSerieChannelMap)[channel]}
          initialTiers={initialChannelTiers[channel]}
        />
      ))}
    </div>
  );
}

function ChannelCard({
  channel,
  initialSeries,
  initialTiers,
}: {
  channel: Channel;
  initialSeries: string[];
  initialTiers: Tier[];
}) {
  const [series, setSeries] = useState<string[]>(initialSeries);
  const [newSerie, setNewSerie] = useState("");
  const [seriesMsg, setSeriesMsg] = useState<{ type: "ok" | "err"; text: string } | null>(null);
  const [seriesPending, startSeries] = useTransition();

  /** Persiste as séries deste canal (auto-save) após cada add/remove. */
  const persist = (next: string[]) => {
    setSeries(next);
    setSeriesMsg(null);
    startSeries(async () => {
      const r = await saveSerieChannelMapForChannel(channel, next);
      if (r.ok) setSeriesMsg({ type: "ok", text: `Séries da ${CANAL_LABEL[channel]} salvas.` });
      else setSeriesMsg({ type: "err", text: r.error });
    });
  };

  const addSerie = () => {
    const value = newSerie.trim();
    if (!/^\d+$/.test(value)) {
      setSeriesMsg({ type: "err", text: "Série deve ser numérica." });
      return;
    }
    if (series.includes(value)) {
      setSeriesMsg({ type: "err", text: "Série já cadastrada neste canal." });
      return;
    }
    persist([...series, value].sort());
    setNewSerie("");
  };

  const removeSerie = (serie: string) => {
    persist(series.filter((s) => s !== serie));
  };

  return (
    <div className="rounded-lg border bg-card">
      <h2 className="border-b px-4 py-3 text-sm font-semibold">{CANAL_LABEL[channel]}</h2>

      <div className="space-y-5 p-4">
        {/* Séries de emissão */}
        <div>
          <h3 className="text-xs font-semibold text-muted-foreground">Séries de emissão</h3>
          <p className="mt-1 text-xs text-muted-foreground">
            Séries da NFe que identificam este canal na importação (a detecção usa a série do XML).
          </p>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            {series.length === 0 && <span className="text-xs text-muted-foreground">Nenhuma série cadastrada.</span>}
            {series.map((serie) => (
              <span
                key={serie}
                className="inline-flex items-center gap-1.5 rounded-md border bg-background px-2 py-1 font-mono text-xs"
              >
                {serie}
                <button
                  type="button"
                  onClick={() => removeSerie(serie)}
                  className="text-muted-foreground hover:text-red-600"
                  aria-label={`Remover série ${serie}`}
                >
                  ×
                </button>
              </span>
            ))}
          </div>
          <div className="mt-2 flex items-center gap-2">
            <input
              type="text"
              inputMode="numeric"
              value={newSerie}
              onChange={(event) => setNewSerie(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  addSerie();
                }
              }}
              placeholder="nova série"
              className="w-32 rounded-md border bg-background px-2 py-1 font-mono text-xs"
            />
            <button
              type="button"
              onClick={addSerie}
              disabled={seriesPending}
              className="rounded-md border px-2 py-1 text-xs text-muted-foreground hover:text-foreground disabled:opacity-50"
            >
              Adicionar
            </button>
            {seriesMsg && (
              <span className={cn("text-xs", seriesMsg.type === "ok" ? "text-green-700" : "text-red-600")}>
                {seriesMsg.text}
              </span>
            )}
          </div>
        </div>

        {/* Faixas de taxa */}
        <FeeTiersEditor channel={channel} initial={initialTiers} />
      </div>
    </div>
  );
}

/** Envia as séries deste canal para o servidor, que mescla com os demais canais. */
async function saveSerieChannelMapForChannel(channel: Channel, series: string[]) {
  const form = new FormData();
  form.set("channel", channel);
  form.set("series", JSON.stringify(series));
  return saveSerieChannelMapAction(form);
}

function FeeTiersEditor({ channel, initial }: { channel: Channel; initial: Tier[] }) {
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
