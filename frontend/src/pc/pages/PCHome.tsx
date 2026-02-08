import "./PCHome.css";
import { onMount, createSignal, For, Show } from "solid-js";
import { useNavigate } from "@solidjs/router";
import { api } from "@shared/api";
import type { CurrencyResponse } from "@shared/api-types";
import { marketStore, priceDir, fmtPrice as fmtP, socket } from "@/stores/market";
import { t } from "@shared/i18n";
import { API_BASE, resolveIconUrl } from "@shared/config";
import CoinIcon from "@/components/CoinIcon";

interface NewsItem { img: string; tag: string; title: string; desc: string; date: string; url: string; }

export default function PCHome() {
  const navigate = useNavigate();
  const [currencies, setCurrencies] = createSignal<CurrencyResponse[]>([]);
  const [newsItems, setNewsItems] = createSignal<NewsItem[]>([]);
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
    observeScrollAnims();
  });

  function dir(sym: string) { return priceDir(sym); }
  function fmtPrice(sym: string) {
    const tk = marketStore.tickers[sym];
    return tk ? fmtP(tk.price) : "—";
  }

  function observeScrollAnims() {
    const io = new IntersectionObserver((entries) => {
      entries.forEach(e => { if (e.isIntersecting) { (e.target as HTMLElement).classList.add("anim-visible"); io.unobserve(e.target); } });
    }, { threshold: 0.15 });
    document.querySelectorAll("[data-anim]").forEach(el => io.observe(el));
  }

  const tickerItems = () => {
    const list = currencies();
    return list.length ? list : [{ symbol: "BTC" }, { symbol: "ETH" }, { symbol: "SOL" }] as any[];
  };

  return (
    <div class="home-root">
      {/* ════════════ HERO ════════════ */}
      <section class="hero">
        <video class="hero-video-bg" src="/video2.mp4" autoplay loop muted playsinline />

        {/* ── 浮动币图（复刻Vue） ── */}
        <div class="hero-float-wrapper">
          <div class="hero-float hero-ball1"><img src="/129.png" alt="" /></div>
          <div class="hero-float hero-ball2"><img src="/130.png" alt="" /></div>
          <div class="hero-float hero-ball3"><img src="/131.png" alt="" /></div>
          <div class="hero-float hero-ball4"><img src="/132.png" alt="" /></div>
          <div class="hero-float hero-ball5"><img src="/133.png" alt="" /></div>
          <div class="hero-float hero-ball6"><img src="/134.png" alt="" /></div>
        </div>

        {/* ── 文案 ── */}
        <div class="hero-content">
          <h1 class="hero-title fade-in-up">
            {t("home.hero.title")}<span class="text-glow">HuoBTC</span>
          </h1>
          <h4 class="hero-sub fade-in-up delay1">
            {t("home.hero.subtitle")}
          </h4>
          <div class="hero-operate fade-in-up delay2">
            <input type="text" class="hero-input" placeholder={t("home.hero.placeholder")} />
            <button class="btn-primary glow-btn" onClick={() => navigate("/trade")}><span>{t("home.hero.goTrade")}</span></button>
          </div>
          <div class="stats-pill fade-in-up delay3">
            <div class="stat-item"><span class="stat-num">$75.31B</span><span class="stat-label">{t("home.stat.vol24h")}</span></div>
            <div class="stat-divider" />
            <div class="stat-item"><span class="stat-num">100+</span><span class="stat-label">{t("home.stat.cryptoTypes")}</span></div>
            <div class="stat-divider" />
            <div class="stat-item"><span class="stat-num">2,500M+</span><span class="stat-label">{t("home.stat.regUsers")}</span></div>
          </div>
        </div>
      </section>

      {/* ════════════ 跑马灯 ════════════ */}
      <div class="ticker-bar">
        <div class="ticker-track">
          <For each={[...tickerItems(), ...tickerItems(), ...tickerItems()]}>
            {(c) => (
              <span class="ticker-item">
                <CoinIcon symbol={c.symbol} size={16} iconUrl={resolveIconUrl(c.iconUrl)} />
                <span class="ticker-sym">{c.symbol}</span>
                <span classList={{ "ticker-price": true, "tk-up": dir(c.symbol) === "up", "tk-down": dir(c.symbol) === "down" }}>
                  {fmtPrice(c.symbol)}
                </span>
              </span>
            )}
          </For>
        </div>
      </div>

      {/* ════════════ 行情 ════════════ */}
      <section class="section" data-anim="fade-up">
        <div class="section-inner">
          <div class="section-header"><h2><span class="text-glow">Web3</span> {t("home.section.market")}</h2></div>
          <Show when={currencies().length > 0} fallback={<MarketListSkeleton />}>
            <div class="market-grid">
              <For each={currencies()}>
                {(c) => (
                  <div class="market-card" onClick={() => navigate("/trade")}>
                    <div class="mc-top"><span class="mc-symbol" style="display:flex;align-items:center;gap:6px"><CoinIcon symbol={c.symbol} size={20} iconUrl={resolveIconUrl(c.iconUrl)} />{c.symbol}</span><span class="mc-type">{c.type}</span></div>
                    <div classList={{ "mc-price": true, "price-up": dir(c.symbol) === "up", "price-down": dir(c.symbol) === "down" }}>
                      {fmtPrice(c.symbol)}
                    </div>
                  </div>
                )}
              </For>
            </div>
          </Show>
          <div class="section-cta"><button class="btn-ghost" onClick={() => navigate("/market")}><span>{t("home.hero.market")}</span><ArrowSVG /></button></div>
        </div>
      </section>

      {/* ════════════ AI 策略 ════════════ */}
      <section class="section section-dark" data-anim="fade-up">
        <div class="section-inner">
          <div class="section-header"><h2><span class="text-glow">AI</span> {t("home.ai.title")}</h2></div>
          <div class="ai-grid">
            {[
              { pair: "SOL/ETH", apr: "45.2%", runners: 73 },
              { pair: "BTC/SOL", apr: "33.4%", runners: 31 },
              { pair: "ETH/TRX", apr: "34.4%", runners: 32 },
            ].map(s => (
              <div class="ai-card">
                <div class="ai-pair">{s.pair}</div>
                <div class="ai-sparkline"><svg viewBox="0 0 120 40" preserveAspectRatio="none"><polyline fill="none" stroke="var(--buy)" stroke-width="2" points={randomSparkline()} /></svg></div>
                <div class="ai-stats">
                  <div><span class="ai-label">{t("home.ai.apr")}</span><span class="ai-val text-glow">{s.apr}</span></div>
                  <div class="ai-orb-wrap"><div class="ai-orb" /></div>
                  <div><span class="ai-label">{t("home.ai.runners")}</span><span class="ai-val">{s.runners}</span></div>
                </div>
              </div>
            ))}
          </div>
          <div class="section-cta"><button class="btn-ghost" onClick={() => navigate("/ai")}><span>{t("home.ai.start")}</span><ArrowSVG /></button></div>
        </div>
      </section>

      {/* ════════════ NFT ════════════ */}
      <section class="section nft-section" data-anim="fade-up">
        <div class="section-inner">
          <div class="section-header"><h2>{t("home.nft.title.pre")} <span class="text-glow">NFT</span> {t("home.nft.title.post")}</h2></div>
          <div class="nft-gallery">
            {[
              { img: "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=400&h=400&fit=crop", name: "Cosmic Vortex",    price: "4.2 ETH" },
              { img: "https://images.unsplash.com/photo-1634986666676-ec8fd927c23d?w=400&h=400&fit=crop", name: "Neon Genesis",     price: "2.8 ETH" },
              { img: "https://images.unsplash.com/photo-1635322966219-b75ed372eb01?w=400&h=400&fit=crop", name: "Digital Dream",    price: "1.5 ETH" },
              { img: "https://images.unsplash.com/photo-1633957897986-70e83293f3ff?w=400&h=400&fit=crop", name: "Pixel Horizon",    price: "3.1 ETH" },
              { img: "https://images.unsplash.com/photo-1620641788421-7a1c342ea42e?w=400&h=400&fit=crop", name: "Abstract Flow",    price: "0.9 ETH" },
            ].map((nft, i) => (
              <div class="nft-card" classList={{ "nft-float1": i % 3 === 0, "nft-float2": i % 3 === 1, "nft-float3": i % 3 === 2 }}>
                <div class="nft-img-wrap">
                  <img src={nft.img} alt={nft.name} class="nft-img" loading="lazy" />
                </div>
                <div class="nft-info">
                  <span class="nft-name">{nft.name}</span>
                  <span class="nft-price">{nft.price}</span>
                </div>
              </div>
            ))}
          </div>
          <div class="section-cta"><button class="btn-ghost" onClick={() => navigate("/nft")}><span>{t("home.nft.go")}</span><ArrowSVG /></button></div>
        </div>
      </section>

      {/* ════════════ NEWS ════════════ */}
      <section class="section" data-anim="fade-up">
        <div class="section-inner">
          <div class="section-header">
            <h2>{t("home.news.title.pre")} <span class="text-glow">{t("home.news.title.post")}</span></h2>
          </div>
          <div class="news-grid">
            <For each={newsItems()}>
              {(item) => (
                <a class="news-card" href={item.url} target="_blank" rel="noopener noreferrer">
                  <div class="news-img-wrap">
                    <img src={item.img} alt={item.title} class="news-img" loading="lazy" />
                  </div>
                  <div class="news-body">
                    <span class="news-tag">{item.tag}</span>
                    <h3 class="news-title">{item.title}</h3>
                    <p class="news-desc">{item.desc}</p>
                    <span class="news-date">{item.date}</span>
                  </div>
                </a>
              )}
            </For>
          </div>
        </div>
      </section>

      {/* ════════════ FAQ ════════════ */}
      <section class="section" data-anim="fade-up">
        <div class="section-inner">
          <div class="section-header"><h2>{t("home.faq.title.pre")} <span class="text-glow">{t("home.faq.title.post")}</span></h2></div>
          <FaqList />
        </div>
      </section>
    </div>
  );
}

function ArrowSVG() {
  return <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor"><path d="M6.47 12.53a.75.75 0 001.06 0l4-4a.75.75 0 000-1.06l-4-4a.75.75 0 00-1.06 1.06L9.94 8 6.47 11.47a.75.75 0 000 1.06z"/></svg>;
}

// ── FAQ ──────────────────────────────────────────────────
function FaqList() {
  const items = [
    { q: t("home.faq.q1"), a: t("home.faq.a1") },
    { q: t("home.faq.q2"), a: t("home.faq.a2") },
    { q: t("home.faq.q3"), a: t("home.faq.a3") },
    { q: t("home.faq.q4"), a: t("home.faq.a4") },
  ];
  const [open, setOpen] = createSignal<number | null>(null);
  return (
    <div class="faq-list">
      <For each={items}>
        {(item, i) => (
          <div class="faq-item" classList={{ "faq-open": open() === i() }} onClick={() => setOpen(open() === i() ? null : i())}>
            <div class="faq-q"><span>{item.q}</span><span class="faq-icon">{open() === i() ? "−" : "+"}</span></div>
            <div class="faq-a">{item.a}</div>
          </div>
        )}
      </For>
    </div>
  );
}

function MarketListSkeleton() {
  return (
    <div class="market-grid animate-pulse">
      {Array.from({ length: 6 }).map(() => (<div class="market-card skeleton-card"><div class="h-5 bg-[#21262d] rounded w-1/3 mb-3" /><div class="h-7 bg-[#21262d] rounded w-1/2" /></div>))}
    </div>
  );
}

function randomSparkline(): string {
  return Array.from({ length: 13 }, (_, i) => `${i * 10},${10 + Math.random() * 20}`).join(" ");
}
