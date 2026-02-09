import {
  onCleanup,
  onMount,
  createSignal,
  Show,
  For,
} from "solid-js";
import type { WsSnapshotMessage, WsTickMessage, CurrencyResponse } from "@shared/api-types";
import { createMarketWs } from "@shared/ws-market";
import { api } from "@shared/api";
import { t } from "@shared/i18n";
import { fmtPriceStr } from "@/stores/market";
import CoinIcon from "@/components/CoinIcon";
import { resolveIconUrl } from "@shared/config";

type PriceEntry = { price: string; ts: string; prev: string };
type PriceMap = Record<string, PriceEntry>;

export default function MobileMarket() {
  const [currencies, setCurrencies] = createSignal<CurrencyResponse[]>([]);
  const [loading, setLoading] = createSignal(true);
  const [prices, setPrices] = createSignal<PriceMap>({});
  const [selectedSymbol, setSelectedSymbol] = createSignal<string | null>(null);
  const [wsConnected, setWsConnected] = createSignal(false);

  const ws = createMarketWs(
    (msg: WsSnapshotMessage) => {
      setPrices((prev) => ({
        ...prev,
        [msg.symbol]: { price: msg.price ?? "", ts: msg.timestamp, prev: prev[msg.symbol]?.price ?? "" },
      }));
    },
    (msg: WsTickMessage) => {
      setPrices((prev) => ({
        ...prev,
        [msg.symbol]: { price: msg.price, ts: msg.timestamp, prev: prev[msg.symbol]?.price ?? "" },
      }));
    },
    () => setWsConnected(true),
    () => setWsConnected(false)
  );

  onMount(() => {
    api("GET /currencies")
      .then((list) => {
        const arr = list as CurrencyResponse[];
        setCurrencies(arr);
        setLoading(false);
        if (arr.length) {
          setSelectedSymbol(arr[0].symbol);
          ws.connect();
          ws.subscribe(arr.map((c) => c.symbol));
        }
      })
      .catch(() => setLoading(false));
  });

  onCleanup(() => ws.disconnect());

  function priceDir(sym: string): "up" | "down" | "flat" {
    const e = prices()[sym];
    if (!e?.prev || !e?.price) return "flat";
    return parseFloat(e.price) > parseFloat(e.prev) ? "up" : parseFloat(e.price) < parseFloat(e.prev) ? "down" : "flat";
  }

  return (
    <div class="px-4 py-4 pb-20">
      <div class="flex items-center gap-3 mb-4">
        <h1 class="text-lg font-semibold text-[#e6edf3]">{t("market.title")}</h1>
        <span
          class="text-xs px-2 py-0.5 rounded"
          classList={{
            "bg-[#00f0ff]/20 text-[#00f0ff]": wsConnected(),
            "bg-[#21262d] text-[#8b949e]": !wsConnected(),
          }}
        >
          {wsConnected() ? "● Live" : "○ Offline"}
        </span>
      </div>

      <Show when={!loading()} fallback={<MobileMarketSkeleton />}>
        <div class="space-y-3">
          <For each={currencies()}>
            {(c) => (
              <button
                type="button"
                class="w-full p-4 rounded-lg border bg-[#161b22] text-left active:opacity-90 transition-all duration-200"
                classList={{
                  "border-[#00f0ff]/50 ring-1 ring-[#00f0ff]/30": selectedSymbol() === c.symbol,
                  "border-[#30363d]": selectedSymbol() !== c.symbol,
                }}
                onClick={() => setSelectedSymbol(c.symbol)}
              >
                <div class="flex justify-between items-baseline">
                  <span class="font-medium text-[#e6edf3] flex items-center gap-2"><CoinIcon symbol={c.symbol} size={22} iconUrl={resolveIconUrl(c.iconUrl)} />{c.symbol}</span>
                  <span
                    class="tabular-nums font-mono text-sm transition-all duration-150"
                    classList={{
                      "text-[#00f0ff]": priceDir(c.symbol) !== "down",
                      "text-[#FF4834]": priceDir(c.symbol) === "down",
                    }}
                  >
                    {prices()[c.symbol]?.price ? fmtPriceStr(prices()[c.symbol]!.price) : "—"}
                  </span>
                </div>
                <div class="text-xs text-[#8b949e] mt-1 capitalize">{c.type}</div>
              </button>
            )}
          </For>
        </div>
      </Show>
    </div>
  );
}

function MobileMarketSkeleton() {
  return (
    <div class="space-y-3 animate-pulse">
      {Array.from({ length: 5 }).map((_, i) => (
        <div class="p-4 rounded-lg border border-[#30363d] bg-[#161b22]">
          <div class="h-5 bg-[#21262d] rounded w-1/3 mb-2" />
          <div class="h-5 bg-[#21262d] rounded w-1/2" />
        </div>
      ))}
    </div>
  );
}
