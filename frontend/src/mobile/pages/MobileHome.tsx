import "./MobileHome.css";
import { onMount, createSignal, createEffect, on, For, Show } from "solid-js";
import { useNavigate } from "@solidjs/router";
import { api } from "@shared/api";
import type { CurrencyResponse } from "@shared/api-types";
import { marketStore, priceDir, fmtPrice as fmtP, socket } from "@/stores/market";
import { t } from "@shared/i18n";
import { API_BASE, resolveIconUrl } from "@shared/config";
import CoinIcon from "@/components/CoinIcon";

interface NewsItem { img: string; tag: string; title: string; desc: string; date: string; url: string; }

// ── 金刚区配置（统一深色底 + 主题色图标）──
const QUICK_ENTRIES = [
  { labelKey: "quicknav.deposit",  path: "/assets",              icon: IconDeposit },
  { labelKey: "quicknav.withdraw", path: "/assets",              icon: IconWithdraw },
  { labelKey: "trade.spot",        path: "/trade?type=spot",     icon: IconSpot },
  { labelKey: "trade.leverage",    path: "/trade?type=leverage", icon: IconLeverage },
  { labelKey: "trade.perpetual",   path: "/trade?type=perpetual",icon: IconPerpetual },
  { labelKey: "trade.binary",      path: "/trade?type=binary",   icon: IconBinary },
  { labelKey: "NFT",               path: "/nft",                 icon: IconNft },
  { labelKey: "quicknav.ai",       path: "/ai",                  icon: IconAi },
];

export default function MobileHome() {
  const navigate = useNavigate();
  const [currencies, setCurrencies] = createSignal<CurrencyResponse[]>([]);
  const [newsItems, setNewsItems] = createSignal<NewsItem[]>([]);
  // Track symbols that flash on price change
  const [flashMap, setFlashMap] = createSignal<Record<string, "up" | "down" | null>>({});

  onMount(() => {
    socket.connect();
    api("GET /currencies").then((list) => {
      setCurrencies(list as CurrencyResponse[]);
      const arr = list as CurrencyResponse[];
      if (arr.length) socket.subscribe(arr.map(c => c.symbol));
    }).catch(() => {});
    fetch(`${API_BASE}/news`).then(r => r.json()).then((items: NewsItem[]) => {
      if (Array.isArray(items)) setNewsItems(items);
    }).catch(() => {});
  });

  // Flash animation: watch each ticker price and trigger a brief flash class
  createEffect(
    on(
      () => {
        const syms = currencies();
        return syms.map((c) => marketStore.tickers[c.symbol]?.price);
      },
      (cur, prev) => {
        if (!prev) return;
        const syms = currencies();
        const flashes: Record<string, "up" | "down" | null> = {};
        syms.forEach((c, i) => {
          if (cur[i] !== undefined && prev[i] !== undefined && cur[i] !== prev[i]) {
            flashes[c.symbol] = cur[i]! > prev[i]! ? "up" : "down";
          }
        });
        if (Object.keys(flashes).length) {
          setFlashMap((f) => ({ ...f, ...flashes }));
          // Clear flash after 600ms
          setTimeout(() => {
            setFlashMap((f) => {
              const next = { ...f };
              for (const sym of Object.keys(flashes)) next[sym] = null;
              return next;
            });
          }, 600);
        }
      }
    )
  );

  function dir(sym: string) { return priceDir(sym); }
  function fmtPrice(sym: string) {
    const tk = marketStore.tickers[sym];
    return tk ? fmtP(tk.price) : "—";
  }

  const tickerItems = () => {
    const list = currencies();
    return list.length ? list : [{ symbol: "BTC" }, { symbol: "ETH" }, { symbol: "SOL" }] as any[];
  };

  return (
    <div class="mh">
      {/* ═══ Hero ═══ */}
      <section class="mh-hero">
        <video class="mh-video-bg" src="/video2.mp4" autoplay loop muted playsinline />
        <div class="mh-float-wrapper">
          <div class="mh-float mh-ball1"><img src="/129.png" alt="" /></div>
          <div class="mh-float mh-ball2"><img src="/130.png" alt="" /></div>
          <div class="mh-float mh-ball3"><img src="/131.png" alt="" /></div>
          <div class="mh-float mh-ball4"><img src="/132.png" alt="" /></div>
          <div class="mh-float mh-ball5"><img src="/133.png" alt="" /></div>
          <div class="mh-float mh-ball6"><img src="/134.png" alt="" /></div>
        </div>
        <div class="mh-hero-text">
          <h1 class="mh-title">{t("home.hero.title")}<span class="mh-glow">HuoBTC</span></h1>
          <p class="mh-sub">{t("home.hero.subtitle")}</p>
          <div class="mh-operate">
            <input type="text" class="mh-hero-input" placeholder={t("home.hero.placeholder")} />
            <button type="button" class="mh-btn-pri" onClick={() => navigate("/trade")}>{t("home.hero.goTrade")}</button>
          </div>
          <div class="mh-stats">
            <div class="mh-stat"><span class="mh-stat-num">$75.31B</span><span class="mh-stat-label">{t("home.stat.vol24h")}</span></div>
            <div class="mh-stat-divider" />
            <div class="mh-stat"><span class="mh-stat-num">100+</span><span class="mh-stat-label">{t("home.stat.cryptoTypes")}</span></div>
            <div class="mh-stat-divider" />
            <div class="mh-stat"><span class="mh-stat-num">2,500M+</span><span class="mh-stat-label">{t("home.stat.regUsers")}</span></div>
          </div>
        </div>
      </section>

      {/* ═══ 跑马灯 ═══ */}
      <div class="mh-ticker">
        <div class="mh-ticker-track">
          <For each={[...tickerItems(), ...tickerItems(), ...tickerItems()]}>
            {(c) => (
              <span class="mh-ticker-item">
                <CoinIcon symbol={c.symbol} size={16} iconUrl={resolveIconUrl(c.iconUrl)} />
                <span class="mh-ticker-sym">{c.symbol}</span>
                <span classList={{ "mh-ticker-price": true, "tk-up": dir(c.symbol) === "up", "tk-down": dir(c.symbol) === "down" }}>
                  {fmtPrice(c.symbol)}
                </span>
              </span>
            )}
          </For>
        </div>
      </div>

      {/* ═══ 快捷入口 ═══ */}
      <section class="mh-grid-nav">
        {QUICK_ENTRIES.map(e => (
          <button type="button" class="mh-grid-item" onClick={() => navigate(e.path)}>
            <div class="mh-grid-icon"><e.icon /></div>
            <span class="mh-grid-label">{e.labelKey === "NFT" ? "NFT" : t(e.labelKey)}</span>
          </button>
        ))}
      </section>

      {/* ═══ 行情 ═══ */}
      <section class="mh-section">
        <h2 class="mh-sec-title"><span class="mh-glow">Web3</span> {t("home.section.market")}</h2>
        <Show when={currencies().length > 0} fallback={<Skeleton />}>
          <div class="mh-market-grid">
            <For each={currencies()}>
              {(c) => (
                <div class="mh-market-card" onClick={() => navigate("/trade")}>
                  <div class="mh-mc-top"><span class="mh-mc-sym" style="display:flex;align-items:center;gap:6px"><CoinIcon symbol={c.symbol} size={20} iconUrl={resolveIconUrl(c.iconUrl)} />{c.symbol}</span><span class="mh-mc-type">{c.type}</span></div>
                  <span classList={{ "mh-mc-price": true, "tk-up": dir(c.symbol) === "up", "tk-down": dir(c.symbol) === "down", "tk-flash-up": flashMap()[c.symbol] === "up", "tk-flash-down": flashMap()[c.symbol] === "down" }}>
                    {fmtPrice(c.symbol)}
                  </span>
                </div>
              )}
            </For>
          </div>
        </Show>
        <button type="button" class="mh-ghost-btn" onClick={() => navigate("/market")}>{t("home.hero.market")} <MhArrow /></button>
      </section>

      {/* ═══ AI 策略 ═══ */}
      <section class="mh-section mh-section-dark">
        <h2 class="mh-sec-title"><span class="mh-glow">AI</span> {t("home.ai.title")}</h2>
        <div class="mh-ai-grid">
          {[{ pair: "SOL/ETH", apr: "45.2%", runners: 73 }, { pair: "BTC/SOL", apr: "33.4%", runners: 31 }, { pair: "ETH/TRX", apr: "34.4%", runners: 32 }].map(s => (
            <div class="mh-ai-card">
              <div class="mh-ai-pair">{s.pair}</div>
              <div class="mh-ai-stats">
                <div><span class="mh-ai-label">{t("home.ai.apr")}</span><span class="mh-ai-val mh-glow">{s.apr}</span></div>
                <div><span class="mh-ai-label">{t("home.ai.runners")}</span><span class="mh-ai-val">{s.runners}</span></div>
              </div>
            </div>
          ))}
        </div>
        <button type="button" class="mh-ghost-btn" onClick={() => navigate("/ai")}>{t("home.ai.start")} <MhArrow /></button>
      </section>

      {/* ═══ NFT ═══ */}
      <section class="mh-section">
        <h2 class="mh-sec-title">{t("home.nft.title.pre")} <span class="mh-glow">NFT</span> {t("home.nft.title.post")}</h2>
        <div class="mh-nft-grid">
          {[
            { img: "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=300&h=300&fit=crop", name: "Cosmic Vortex", price: "4.2 ETH" },
            { img: "https://images.unsplash.com/photo-1634986666676-ec8fd927c23d?w=300&h=300&fit=crop", name: "Neon Genesis", price: "2.8 ETH" },
            { img: "https://images.unsplash.com/photo-1635322966219-b75ed372eb01?w=300&h=300&fit=crop", name: "Digital Dream", price: "1.5 ETH" },
            { img: "https://images.unsplash.com/photo-1633957897986-70e83293f3ff?w=300&h=300&fit=crop", name: "Pixel Horizon", price: "3.1 ETH" },
          ].map(nft => (
            <div class="mh-nft-card">
              <div class="mh-nft-img-wrap"><img src={nft.img} alt={nft.name} class="mh-nft-img" loading="lazy" /></div>
              <div class="mh-nft-info"><span class="mh-nft-name">{nft.name}</span><span class="mh-nft-price">{nft.price}</span></div>
            </div>
          ))}
        </div>
        <button type="button" class="mh-ghost-btn" onClick={() => navigate("/nft")}>{t("home.nft.go")} <MhArrow /></button>
      </section>

      {/* ═══ News ═══ */}
      <Show when={newsItems().length > 0}>
        <section class="mh-section">
          <h2 class="mh-sec-title">{t("home.news.title.pre")} <span class="mh-glow">{t("home.news.title.post")}</span></h2>
          <div class="mh-news-grid">
            <For each={newsItems()}>
              {(item) => (
                <a class="mh-news-card" href={item.url} target="_blank" rel="noopener noreferrer">
                  <div class="mh-news-img-wrap"><img src={item.img} alt={item.title} class="mh-news-img" loading="lazy" /></div>
                  <div class="mh-news-body">
                    <span class="mh-news-tag">{item.tag}</span>
                    <h3 class="mh-news-title">{item.title}</h3>
                    <span class="mh-news-date">{item.date}</span>
                  </div>
                </a>
              )}
            </For>
          </div>
        </section>
      </Show>

      {/* ═══ FAQ ═══ */}
      <section class="mh-section">
        <h2 class="mh-sec-title">{t("home.faq.title.pre")} <span class="mh-glow">{t("home.faq.title.post")}</span></h2>
        <MhFaqList />
      </section>
    </div>
  );
}

function Skeleton() {
  return <div class="mh-list">{Array.from({ length: 4 }).map(() => <div class="mh-list-item" style={{ opacity: .3, height: "48px" }} />)}</div>;
}

// ═══════ 金刚区 SVG 图标（26px, stroke 2.2, 在 56px 图标块内清晰可见）═══════
const I = { w: "22", h: "22", vb: "0 0 24 24", f: "none", s: "currentColor", sw: "2", lc: "round" as const, lj: "round" as const };

function IconDeposit() { return <svg width={I.w} height={I.h} viewBox={I.vb} fill={I.f} stroke={I.s} stroke-width={I.sw} stroke-linecap={I.lc} stroke-linejoin={I.lj}><path d="M12 3v14m0 0l-5-5m5 5l5-5"/><line x1="4" y1="21" x2="20" y2="21"/></svg>; }
function IconWithdraw() { return <svg width={I.w} height={I.h} viewBox={I.vb} fill={I.f} stroke={I.s} stroke-width={I.sw} stroke-linecap={I.lc} stroke-linejoin={I.lj}><path d="M12 17V3m0 0l-5 5m5-5l5 5"/><line x1="4" y1="21" x2="20" y2="21"/></svg>; }
function IconSpot() { return <svg width={I.w} height={I.h} viewBox={I.vb} fill={I.f} stroke={I.s} stroke-width={I.sw} stroke-linecap={I.lc} stroke-linejoin={I.lj}><rect x="4" y="14" width="4" height="7" rx="1"/><rect x="10" y="8" width="4" height="13" rx="1"/><rect x="16" y="4" width="4" height="17" rx="1"/></svg>; }
function IconLeverage() { return <svg width={I.w} height={I.h} viewBox={I.vb} fill={I.f} stroke={I.s} stroke-width={I.sw} stroke-linecap={I.lc} stroke-linejoin={I.lj}><polyline points="22 7 13.5 15.5 8.5 10.5 2 17"/><polyline points="16 7 22 7 22 13"/></svg>; }
function IconPerpetual() { return <svg width={I.w} height={I.h} viewBox={I.vb} fill={I.f} stroke={I.s} stroke-width={I.sw} stroke-linecap={I.lc} stroke-linejoin={I.lj}><path d="M18.178 8c5.096 0 5.096 8 0 8-5.095 0-5.095-8 0-8z"/><path d="M5.822 8c-5.096 0-5.096 8 0 8 5.095 0 5.095-8 0-8z"/><line x1="9" y1="12" x2="15" y2="12"/></svg>; }
function IconBinary() { return <svg width={I.w} height={I.h} viewBox={I.vb} fill={I.f} stroke={I.s} stroke-width={I.sw} stroke-linecap={I.lc} stroke-linejoin={I.lj}><circle cx="12" cy="12" r="9"/><polyline points="12 7 12 12 15.5 14"/></svg>; }
function IconNft() { return <svg width={I.w} height={I.h} viewBox={I.vb} fill={I.f} stroke={I.s} stroke-width={I.sw} stroke-linecap={I.lc} stroke-linejoin={I.lj}><rect x="3" y="3" width="18" height="18" rx="3"/><circle cx="8.5" cy="8.5" r="1.5" fill="currentColor" stroke="none"/><path d="M21 15l-5-5L5 21"/></svg>; }
function IconAi() { return <svg width={I.w} height={I.h} viewBox={I.vb} fill={I.f} stroke={I.s} stroke-width={I.sw} stroke-linecap={I.lc} stroke-linejoin={I.lj}><rect x="4" y="4" width="16" height="12" rx="2"/><line x1="9" y1="20" x2="15" y2="20"/><line x1="12" y1="16" x2="12" y2="20"/><path d="M7 9h2m6 0h2"/></svg>; }

function MhArrow() {
  return <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor" style={{ "margin-left": "4px", "vertical-align": "middle" }}><path d="M6.47 12.53a.75.75 0 001.06 0l4-4a.75.75 0 000-1.06l-4-4a.75.75 0 00-1.06 1.06L9.94 8 6.47 11.47a.75.75 0 000 1.06z"/></svg>;
}

function MhFaqList() {
  const items = [
    { q: t("home.faq.q1"), a: t("home.faq.a1") },
    { q: t("home.faq.q2"), a: t("home.faq.a2") },
    { q: t("home.faq.q3"), a: t("home.faq.a3") },
    { q: t("home.faq.q4"), a: t("home.faq.a4") },
  ];
  const [open, setOpen] = createSignal<number | null>(null);
  return (
    <div class="mh-faq-list">
      <For each={items}>
        {(item, i) => (
          <div class="mh-faq-item" classList={{ "mh-faq-open": open() === i() }} onClick={() => setOpen(open() === i() ? null : i())}>
            <div class="mh-faq-q"><span>{item.q}</span><span class="mh-faq-icon">{open() === i() ? "−" : "+"}</span></div>
            <div class="mh-faq-a">{item.a}</div>
          </div>
        )}
      </For>
    </div>
  );
}
