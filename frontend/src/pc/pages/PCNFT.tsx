import "./PCNFT.css";
import { t } from "@shared/i18n";

const FEATURED = [
  { img: "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=800&h=500&fit=crop", name: "Cosmic Vortex #001", artist: "CryptoArtist.eth", price: "12.5 ETH" },
  { img: "https://images.unsplash.com/photo-1634986666676-ec8fd927c23d?w=800&h=500&fit=crop", name: "Neon Genesis #042", artist: "PixelMaster.eth", price: "8.2 ETH" },
];

const GALLERY = [
  { img: "https://images.unsplash.com/photo-1635322966219-b75ed372eb01?w=400&h=400&fit=crop", name: "Digital Dream", price: "3.1 ETH", bid: "2.8 ETH" },
  { img: "https://images.unsplash.com/photo-1633957897986-70e83293f3ff?w=400&h=400&fit=crop", name: "Pixel Horizon", price: "1.8 ETH", bid: "1.5 ETH" },
  { img: "https://images.unsplash.com/photo-1620641788421-7a1c342ea42e?w=400&h=400&fit=crop", name: "Abstract Flow", price: "5.4 ETH", bid: "5.0 ETH" },
  { img: "https://images.unsplash.com/photo-1618005198919-d3d4b5a92ead?w=400&h=400&fit=crop", name: "Quantum Pulse", price: "2.2 ETH", bid: "1.9 ETH" },
  { img: "https://images.unsplash.com/photo-1614850523459-c2f4c699c52e?w=400&h=400&fit=crop", name: "Neon Bloom", price: "4.7 ETH", bid: "4.2 ETH" },
  { img: "https://images.unsplash.com/photo-1614851099511-773084f6911d?w=400&h=400&fit=crop", name: "Cyber Genesis", price: "6.3 ETH", bid: "5.8 ETH" },
  { img: "https://images.unsplash.com/photo-1617791160505-6f00504e3519?w=400&h=400&fit=crop", name: "Void Walker", price: "1.1 ETH", bid: "0.9 ETH" },
  { img: "https://images.unsplash.com/photo-1578662996442-48f60103fc96?w=400&h=400&fit=crop", name: "Crystal Shard", price: "3.8 ETH", bid: "3.5 ETH" },
];

const AUCTIONS = [
  { img: "https://images.unsplash.com/photo-1642104704074-907c0698cbd9?w=600&h=450&fit=crop", name: "Meta Ape #3291", price: "24.5 ETH", timer: "02:14:33" },
  { img: "https://images.unsplash.com/photo-1645378999013-95c5975f4156?w=600&h=450&fit=crop", name: "CryptoPunk #7804", price: "89.0 ETH", timer: "05:42:11" },
  { img: "https://images.unsplash.com/photo-1637611331620-51149c7ceb94?w=600&h=450&fit=crop", name: "Bored Yacht #8817", price: "34.2 ETH", timer: "11:08:45" },
];

const RANKINGS = [
  { avatar: "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=96&h=96&fit=crop", name: "CryptoWhale.eth", vol: "1,245 ETH", change: "+342%", up: true },
  { avatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=96&h=96&fit=crop", name: "NFTQueen.eth", vol: "892 ETH", change: "+218%", up: true },
  { avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=96&h=96&fit=crop", name: "PixelKing.eth", vol: "756 ETH", change: "+189%", up: true },
  { avatar: "https://images.unsplash.com/photo-1527980965255-d3b416303d12?w=96&h=96&fit=crop", name: "ArtCollector.eth", vol: "634 ETH", change: "-12%", up: false },
  { avatar: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=96&h=96&fit=crop", name: "DigiArtist.eth", vol: "521 ETH", change: "+156%", up: true },
  { avatar: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=96&h=96&fit=crop", name: "MetaTrader.eth", vol: "498 ETH", change: "+98%", up: true },
];

export default function PCNFT() {
  return (
    <div class="nft-page">
      {/* ══ Hero ══ */}
      <div class="nft-hero">
        <div class="nft-hero-inner">
          <h1>Discover the <span class="nft-purple">Exclusive</span> <span class="nft-cyan">NFT</span> Collection</h1>
          <p>Explore, collect, and trade unique digital assets on HuoBTC's decentralized NFT marketplace. Powered by blockchain technology.</p>
          <div class="nft-hero-stats">
            <div class="nft-hero-stat"><span class="nft-hero-stat-num">52,400+</span><span class="nft-hero-stat-label">Total NFTs</span></div>
            <div class="nft-hero-stat"><span class="nft-hero-stat-num">12,800</span><span class="nft-hero-stat-label">Artists</span></div>
            <div class="nft-hero-stat"><span class="nft-hero-stat-num">$180M+</span><span class="nft-hero-stat-label">Total Volume</span></div>
            <div class="nft-hero-stat"><span class="nft-hero-stat-num">8,200+</span><span class="nft-hero-stat-label">Collectors</span></div>
          </div>
        </div>
      </div>

      {/* ══ Featured ══ */}
      <div class="nft-section">
        <h2 class="nft-section-title">🔥 Featured Collections</h2>
        <div class="nft-featured">
          {FEATURED.map(f => (
            <div class="nft-featured-card">
              <img src={f.img} alt={f.name} class="nft-featured-img" loading="lazy" />
              <div class="nft-featured-overlay">
                <div class="nft-featured-name">{f.name}</div>
                <div class="nft-featured-artist">by {f.artist}</div>
              </div>
              <div class="nft-featured-price">{f.price}</div>
            </div>
          ))}
        </div>

        {/* ══ Gallery ══ */}
        <h2 class="nft-section-title">🎨 Trending Artworks</h2>
        <div class="nft-gallery-grid">
          {GALLERY.map(g => (
            <div class="nft-g-card">
              <div class="nft-g-img-wrap"><img src={g.img} alt={g.name} class="nft-g-img" loading="lazy" /></div>
              <div class="nft-g-info">
                <div class="nft-g-name">{g.name}</div>
                <div class="nft-g-row">
                  <span class="nft-g-price">{g.price}</span>
                  <span class="nft-g-bid">Bid: {g.bid}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ══ Live Auctions ══ */}
      <div class="nft-section">
        <h2 class="nft-section-title">⚡ Live Auctions</h2>
        <div class="nft-auctions">
          {AUCTIONS.map(a => (
            <div class="nft-auction-card">
              <img src={a.img} alt={a.name} class="nft-auction-img" loading="lazy" />
              <div class="nft-auction-body">
                <div class="nft-auction-name">{a.name}</div>
                <div class="nft-auction-meta">
                  <span class="nft-auction-price">{a.price}</span>
                  <span class="nft-auction-timer">{a.timer}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ══ Rankings ══ */}
      <div class="nft-section">
        <h2 class="nft-section-title">🏆 Top Collectors</h2>
        <div class="nft-rankings">
          {RANKINGS.map((r, i) => (
            <div class="nft-rank-card">
              <span class="nft-rank-num">#{i + 1}</span>
              <img src={r.avatar} alt={r.name} class="nft-rank-avatar" loading="lazy" />
              <div class="nft-rank-info">
                <div class="nft-rank-name">{r.name}</div>
                <div class="nft-rank-vol">Vol: {r.vol}</div>
              </div>
              <span class={`nft-rank-change ${r.up ? "nft-rank-up" : "nft-rank-down"}`}>{r.change}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
