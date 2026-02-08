import "./PCAIQuant.css";
import { t } from "@shared/i18n";

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
  { pair: "DOGE / BTC", badge: "stable", apr: "28.7%", pnl30d: "+$6,210", winRate: "69%", runners: 45, coins: ["https://assets.coingecko.com/coins/images/5/small/dogecoin.png", "https://assets.coingecko.com/coins/images/1/small/bitcoin.png"], seed: 7 },
  { pair: "ADA / ETH", badge: "new", apr: "41.8%", pnl30d: "+$9,780", winRate: "74%", runners: 22, coins: ["https://assets.coingecko.com/coins/images/975/small/cardano.png", "https://assets.coingecko.com/coins/images/279/small/ethereum.png"], seed: 3 },
];

const LEADERS = [
  { avatar: "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=64&h=64&fit=crop", name: "AlphaBot.eth", strat: "BTC/ETH Grid", pnl: "+$128,450", pnlPct: "+342%", up: true, followers: 892 },
  { avatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=64&h=64&fit=crop", name: "QuantQueen.eth", strat: "SOL/ETH Momentum", pnl: "+$89,200", pnlPct: "+218%", up: true, followers: 654 },
  { avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=64&h=64&fit=crop", name: "DeepTrade.eth", strat: "Multi-Pair Arb", pnl: "+$75,600", pnlPct: "+189%", up: true, followers: 521 },
  { avatar: "https://images.unsplash.com/photo-1527980965255-d3b416303d12?w=64&h=64&fit=crop", name: "GridMaster.eth", strat: "BTC/SOL Scalp", pnl: "+$62,100", pnlPct: "+156%", up: true, followers: 438 },
  { avatar: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=64&h=64&fit=crop", name: "SmartYield.eth", strat: "ETH DCA", pnl: "-$4,200", pnlPct: "-12%", up: false, followers: 312 },
];

export default function PCAIQuant() {
  return (
    <div class="ai-page">
      {/* ══ Hero ══ */}
      <div class="ai-hero">
        <div class="ai-hero-inner">
          <h1><span class="ai-glow">AI</span> Quantitative Trading</h1>
          <p>Leverage cutting-edge machine learning algorithms to automate your trading strategies. Real-time market analysis, risk management, and portfolio optimization — all powered by AI.</p>
          <div class="ai-hero-metrics">
            <div class="ai-metric"><span class="ai-metric-num green">+247%</span><span class="ai-metric-label">Avg Annual Return</span></div>
            <div class="ai-metric"><span class="ai-metric-num">$2.1B</span><span class="ai-metric-label">Total AUM</span></div>
            <div class="ai-metric"><span class="ai-metric-num green">89.2%</span><span class="ai-metric-label">Win Rate</span></div>
            <div class="ai-metric"><span class="ai-metric-num">24/7</span><span class="ai-metric-label">Monitoring</span></div>
          </div>
        </div>
      </div>

      {/* ══ How It Works ══ */}
      <div class="ai-section">
        <h2 class="ai-section-title">How It Works</h2>
        <p class="ai-section-sub">Start earning in 4 simple steps</p>
        <div class="ai-steps">
          <div class="ai-step">
            <div class="ai-step-num">1</div>
            <div class="ai-step-title">Connect Wallet</div>
            <div class="ai-step-desc">Link your crypto wallet securely with one click</div>
          </div>
          <div class="ai-step">
            <div class="ai-step-num">2</div>
            <div class="ai-step-title">Choose Strategy</div>
            <div class="ai-step-desc">Browse AI strategies ranked by performance and risk level</div>
          </div>
          <div class="ai-step">
            <div class="ai-step-num">3</div>
            <div class="ai-step-title">Set Parameters</div>
            <div class="ai-step-desc">Configure investment amount, risk tolerance and take-profit levels</div>
          </div>
          <div class="ai-step">
            <div class="ai-step-num">4</div>
            <div class="ai-step-title">Auto-Trade</div>
            <div class="ai-step-desc">AI executes trades 24/7 while you monitor profits in real-time</div>
          </div>
        </div>
      </div>

      {/* ══ Strategies ══ */}
      <div class="ai-section">
        <h2 class="ai-section-title">🤖 Active Strategies</h2>
        <p class="ai-section-sub">AI-powered strategies with proven track records</p>
        <div class="ai-strat-grid">
          {STRATEGIES.map(s => (
            <div class="ai-strat-card">
              <span class={`ai-strat-badge ${s.badge === "hot" ? "ai-badge-hot" : s.badge === "stable" ? "ai-badge-stable" : "ai-badge-new"}`}>
                {s.badge === "hot" ? "🔥 Hot" : s.badge === "stable" ? "✅ Stable" : "✨ New"}
              </span>
              <div class="ai-strat-pair">
                {s.coins.map(c => <img src={c} alt="" />)}
                {s.pair}
              </div>
              <div class="ai-strat-chart">
                <svg viewBox="0 0 120 80" preserveAspectRatio="none">
                  <polyline fill="none" stroke="var(--buy)" stroke-width="1.5" points={sparkline(s.seed)} />
                </svg>
              </div>
              <div class="ai-strat-stats">
                <div class="ai-strat-stat"><span class="ai-strat-stat-label">APR</span><span class="ai-strat-stat-val green">{s.apr}</span></div>
                <div class="ai-strat-stat"><span class="ai-strat-stat-label">30d PnL</span><span class="ai-strat-stat-val green">{s.pnl30d}</span></div>
                <div class="ai-strat-stat"><span class="ai-strat-stat-label">Win Rate</span><span class="ai-strat-stat-val">{s.winRate}</span></div>
              </div>
              <button class="ai-strat-btn">Start Copy Trading · {s.runners} followers</button>
            </div>
          ))}
        </div>
      </div>

      {/* ══ Performance ══ */}
      <div class="ai-section">
        <h2 class="ai-section-title">📊 Platform Performance</h2>
        <div class="ai-perf-grid">
          <div class="ai-perf-card"><div class="ai-perf-icon">💰</div><div class="ai-perf-num">$2.1B</div><div class="ai-perf-label">Assets Under Management</div></div>
          <div class="ai-perf-card"><div class="ai-perf-icon">📈</div><div class="ai-perf-num">1.2M</div><div class="ai-perf-label">Trades Executed (24h)</div></div>
          <div class="ai-perf-card"><div class="ai-perf-icon">🎯</div><div class="ai-perf-num">89.2%</div><div class="ai-perf-label">Average Win Rate</div></div>
          <div class="ai-perf-card"><div class="ai-perf-icon">⚡</div><div class="ai-perf-num">&lt;50ms</div><div class="ai-perf-label">Execution Latency</div></div>
        </div>
      </div>

      {/* ══ Leaderboard ══ */}
      <div class="ai-section">
        <h2 class="ai-section-title">🏆 Top Traders Leaderboard</h2>
        <p class="ai-section-sub">Follow the best AI traders and copy their strategies</p>
        <table class="ai-leader-table">
          <thead>
            <tr><th>Rank</th><th>Trader</th><th>Strategy</th><th>30d PnL</th><th>Return</th><th>Followers</th></tr>
          </thead>
          <tbody>
            {LEADERS.map((l, i) => (
              <tr>
                <td>#{i + 1}</td>
                <td><div class="ai-leader-name"><img src={l.avatar} alt="" class="ai-leader-avatar" />{l.name}</div></td>
                <td>{l.strat}</td>
                <td class={`ai-leader-pnl ${l.up ? "up" : "down"}`}>{l.pnl}</td>
                <td class={`ai-leader-pnl ${l.up ? "up" : "down"}`}>{l.pnlPct}</td>
                <td>{l.followers}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
