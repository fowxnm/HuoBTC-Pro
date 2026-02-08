import "./MobileAIQuant.css";

function sparkline(seed: number) {
  const pts: string[] = [];
  let y = 20 + seed;
  for (let x = 0; x <= 120; x += 4) {
    y += (Math.sin(x * 0.15 + seed) * 3 + (Math.random() - 0.4) * 4);
    y = Math.max(5, Math.min(75, y));
    pts.push(`${x},${y}`);
  }
  return pts.join(" ");
}

const STRATEGIES = [
  { pair: "SOL / ETH", badge: "hot", apr: "45.2%", pnl30d: "+$12,840", winRate: "78%", runners: 73, coins: ["https://assets.coingecko.com/coins/images/4128/small/solana.png", "https://assets.coingecko.com/coins/images/279/small/ethereum.png"], seed: 1 },
  { pair: "BTC / SOL", badge: "stable", apr: "33.4%", pnl30d: "+$28,510", winRate: "82%", runners: 31, coins: ["https://assets.coingecko.com/coins/images/1/small/bitcoin.png", "https://assets.coingecko.com/coins/images/4128/small/solana.png"], seed: 5 },
  { pair: "ETH / TRX", badge: "new", apr: "34.4%", pnl30d: "+$8,920", winRate: "71%", runners: 32, coins: ["https://assets.coingecko.com/coins/images/279/small/ethereum.png", "https://assets.coingecko.com/coins/images/1094/small/tron-logo.png"], seed: 9 },
  { pair: "BTC / ETH", badge: "hot", apr: "52.1%", pnl30d: "+$45,300", winRate: "85%", runners: 128, coins: ["https://assets.coingecko.com/coins/images/1/small/bitcoin.png", "https://assets.coingecko.com/coins/images/279/small/ethereum.png"], seed: 2 },
];

const LEADERS = [
  { avatar: "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=64&h=64&fit=crop", name: "AlphaBot.eth", strat: "BTC/ETH Grid", pnl: "+$128K", up: true },
  { avatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=64&h=64&fit=crop", name: "QuantQueen.eth", strat: "SOL/ETH Momentum", pnl: "+$89K", up: true },
  { avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=64&h=64&fit=crop", name: "DeepTrade.eth", strat: "Multi-Pair Arb", pnl: "+$75K", up: true },
  { avatar: "https://images.unsplash.com/photo-1527980965255-d3b416303d12?w=64&h=64&fit=crop", name: "GridMaster.eth", strat: "BTC/SOL Scalp", pnl: "-$4.2K", up: false },
];

export default function MobileAIQuant() {
  return (
    <div class="mai">
      {/* Hero */}
      <div class="mai-hero">
        <div class="mai-hero-inner">
          <h1><span class="mai-glow">AI</span> Quantitative Trading</h1>
          <p>Machine learning algorithms automate your trading. Real-time analysis, risk management, portfolio optimization.</p>
          <div class="mai-hero-metrics">
            <div class="mai-metric"><span class="mai-metric-num green">+247%</span><span class="mai-metric-label">Avg Return</span></div>
            <div class="mai-metric"><span class="mai-metric-num">$2.1B</span><span class="mai-metric-label">AUM</span></div>
            <div class="mai-metric"><span class="mai-metric-num green">89.2%</span><span class="mai-metric-label">Win Rate</span></div>
          </div>
        </div>
      </div>

      {/* Steps */}
      <div class="mai-sec">
        <h2 class="mai-sec-title">How It Works</h2>
        <div class="mai-steps">
          <div class="mai-step"><div class="mai-step-num">1</div><div class="mai-step-title">Connect Wallet</div><div class="mai-step-desc">Link your wallet securely</div></div>
          <div class="mai-step"><div class="mai-step-num">2</div><div class="mai-step-title">Choose Strategy</div><div class="mai-step-desc">Browse AI strategies</div></div>
          <div class="mai-step"><div class="mai-step-num">3</div><div class="mai-step-title">Set Parameters</div><div class="mai-step-desc">Configure risk & amount</div></div>
          <div class="mai-step"><div class="mai-step-num">4</div><div class="mai-step-title">Auto-Trade</div><div class="mai-step-desc">AI trades 24/7 for you</div></div>
        </div>
      </div>

      {/* Strategies */}
      <div class="mai-sec">
        <h2 class="mai-sec-title">🤖 Active Strategies</h2>
        <p class="mai-sec-sub">AI-powered with proven track records</p>
        <div class="mai-strat-list">
          {STRATEGIES.map(s => (
            <div class="mai-strat-card">
              <span class={`mai-strat-badge ${s.badge === "hot" ? "mai-badge-hot" : s.badge === "stable" ? "mai-badge-stable" : "mai-badge-new"}`}>
                {s.badge === "hot" ? "🔥 Hot" : s.badge === "stable" ? "✅ Stable" : "✨ New"}
              </span>
              <div class="mai-strat-pair">
                {s.coins.map(c => <img src={c} alt="" />)}
                {s.pair}
              </div>
              <div class="mai-strat-chart">
                <svg viewBox="0 0 120 80" preserveAspectRatio="none">
                  <polyline fill="none" stroke="var(--buy)" stroke-width="1.5" points={sparkline(s.seed)} />
                </svg>
              </div>
              <div class="mai-strat-stats">
                <div class="mai-ss"><span class="mai-ss-label">APR</span><span class="mai-ss-val green">{s.apr}</span></div>
                <div class="mai-ss"><span class="mai-ss-label">30d PnL</span><span class="mai-ss-val green">{s.pnl30d}</span></div>
                <div class="mai-ss"><span class="mai-ss-label">Win Rate</span><span class="mai-ss-val">{s.winRate}</span></div>
              </div>
              <button class="mai-strat-btn">Copy · {s.runners} followers</button>
            </div>
          ))}
        </div>
      </div>

      {/* Performance */}
      <div class="mai-sec mai-sec-dark">
        <h2 class="mai-sec-title">📊 Platform Stats</h2>
        <div class="mai-perf-grid">
          <div class="mai-perf-card"><div class="mai-perf-icon">💰</div><div class="mai-perf-num">$2.1B</div><div class="mai-perf-label">AUM</div></div>
          <div class="mai-perf-card"><div class="mai-perf-icon">📈</div><div class="mai-perf-num">1.2M</div><div class="mai-perf-label">Trades (24h)</div></div>
          <div class="mai-perf-card"><div class="mai-perf-icon">🎯</div><div class="mai-perf-num">89.2%</div><div class="mai-perf-label">Win Rate</div></div>
          <div class="mai-perf-card"><div class="mai-perf-icon">⚡</div><div class="mai-perf-num">&lt;50ms</div><div class="mai-perf-label">Latency</div></div>
        </div>
      </div>

      {/* Leaderboard */}
      <div class="mai-sec">
        <h2 class="mai-sec-title">🏆 Top Traders</h2>
        <div class="mai-leaders">
          {LEADERS.map((l, i) => (
            <div class="mai-leader">
              <span class="mai-leader-rank">#{i + 1}</span>
              <img src={l.avatar} alt="" class="mai-leader-av" loading="lazy" />
              <div class="mai-leader-info"><div class="mai-leader-name">{l.name}</div><div class="mai-leader-strat">{l.strat}</div></div>
              <span class={`mai-leader-pnl ${l.up ? "mai-leader-up" : "mai-leader-down"}`}>{l.pnl}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
