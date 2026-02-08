import { onMount, onCleanup, createSignal, createEffect, on } from "solid-js";
import {
  createChart, CandlestickSeries, HistogramSeries,
  type IChartApi, type ISeriesApi, type CandlestickData, type Time, ColorType,
} from "lightweight-charts";
import type { KlineBar, KlineInterval } from "@shared/api-types";
import { API_BASE } from "@shared/config";
import { onKline } from "@/stores/market";
import { t } from "@shared/i18n";

export interface KlineChartProps {
  symbol: string;
  interval?: KlineInterval;
  height?: number;
  /** compact mode for mobile */
  compact?: boolean;
}

export default function KlineChart(props: KlineChartProps) {
  let containerRef: HTMLDivElement | undefined;
  let chart: IChartApi | undefined;
  let candleSeries: ISeriesApi<"Candlestick"> | undefined;
  let volumeSeries: ISeriesApi<"Histogram"> | undefined;

  const [loading, setLoading] = createSignal(true);
  const interval = () => props.interval ?? "1m";
  const height = () => props.height ?? (props.compact ? 260 : 420);

  function initChart() {
    if (!containerRef || chart) return;

    chart = createChart(containerRef, {
      width: containerRef.clientWidth,
      height: height(),
      layout: {
        background: { type: ColorType.Solid, color: "#0d1117" },
        textColor: "#8b949e",
        fontSize: props.compact ? 10 : 12,
      },
      grid: {
        vertLines: { color: "#1b2028" },
        horzLines: { color: "#1b2028" },
      },
      crosshair: {
        mode: props.compact ? 0 : 1,
        vertLine: { color: "#30363d", labelBackgroundColor: "#21262d" },
        horzLine: { color: "#30363d", labelBackgroundColor: "#21262d" },
      },
      rightPriceScale: {
        borderColor: "#21262d",
        scaleMargins: { top: 0.1, bottom: props.compact ? 0.05 : 0.2 },
      },
      timeScale: {
        borderColor: "#21262d",
        timeVisible: true,
        secondsVisible: false,
      },
      handleScroll: { vertTouchDrag: false },
    });

    candleSeries = chart.addSeries(CandlestickSeries, {
      upColor: "#00d4aa",
      downColor: "#ff4976",
      borderUpColor: "#00d4aa",
      borderDownColor: "#ff4976",
      wickUpColor: "#00d4aa",
      wickDownColor: "#ff4976",
    });

    if (!props.compact) {
      volumeSeries = chart.addSeries(HistogramSeries, {
        priceFormat: { type: "volume" },
        priceScaleId: "volume",
      });
      chart.priceScale("volume").applyOptions({
        scaleMargins: { top: 0.8, bottom: 0 },
      });
    }

    // Responsive resize
    const resizeObserver = new ResizeObserver((entries) => {
      if (chart && entries[0]) {
        chart.applyOptions({ width: entries[0].contentRect.width });
      }
    });
    resizeObserver.observe(containerRef);

    onCleanup(() => {
      resizeObserver.disconnect();
      chart?.remove();
      chart = undefined;
      candleSeries = undefined;
      volumeSeries = undefined;
    });
  }

  async function loadData(sym: string, intv: KlineInterval) {
    setLoading(true);
    try {
      const url = `${API_BASE}/market/klines?symbol=${encodeURIComponent(sym)}&interval=${encodeURIComponent(intv)}&limit=500`;
      const res = await fetch(url);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const bars: KlineBar[] = await res.json();

      if (!candleSeries) return;

      const candles: CandlestickData<Time>[] = bars.map((b) => ({
        time: b.time as Time,
        open: b.open,
        high: b.high,
        low: b.low,
        close: b.close,
      }));
      candleSeries.setData(candles);

      if (volumeSeries) {
        const vols = bars.map((b) => ({
          time: b.time as Time,
          value: b.volume,
          color: b.close >= b.open ? "rgba(0,212,170,0.3)" : "rgba(255,73,118,0.3)",
        }));
        volumeSeries.setData(vols);
      }

      chart?.timeScale().fitContent();
    } catch (e) {
      console.error("[KlineChart] Failed to load klines:", e);
    } finally {
      setLoading(false);
    }
  }

  onMount(() => {
    initChart();
    // Initial data load (createEffect with defer won't fire on first render)
    if (props.symbol) loadData(props.symbol, interval());
  });

  // Reload data when symbol or interval changes AFTER initial mount
  createEffect(
    on(
      () => [props.symbol, interval()] as const,
      ([sym, intv]) => {
        if (sym && chart) loadData(sym, intv);
      },
      { defer: true }
    )
  );

  // Subscribe to real-time kline updates
  const unsub = onKline((sym, intv, bar) => {
    if (sym !== props.symbol.toUpperCase() || intv !== interval()) return;
    if (!candleSeries) return;

    const update: CandlestickData<Time> = {
      time: bar.time as Time,
      open: bar.open,
      high: bar.high,
      low: bar.low,
      close: bar.close,
    };
    candleSeries.update(update);

    if (volumeSeries) {
      volumeSeries.update({
        time: bar.time as Time,
        value: bar.volume,
        color: bar.close >= bar.open ? "rgba(0,212,170,0.3)" : "rgba(255,73,118,0.3)",
      });
    }
  });
  onCleanup(unsub);

  return (
    <div style={{ position: "relative", width: "100%" }}>
      {loading() && (
        <div style={{
          position: "absolute", inset: "0", display: "flex",
          "align-items": "center", "justify-content": "center",
          "z-index": "5", background: "rgba(13,17,23,0.7)",
          color: "#8b949e", "font-size": "13px",
        }}>
          {t("common.loading")}
        </div>
      )}
      <div ref={containerRef} style={{ width: "100%", height: `${height()}px` }} />
    </div>
  );
}
