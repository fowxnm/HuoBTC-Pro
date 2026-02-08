import "./MobileNFT.css";

const FEATURED = [
  { img: "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=600&h=340&fit=crop", name: "Cosmic Vortex #001", artist: "CryptoArtist.eth", price: "12.5 ETH" },
  { img: "https://images.unsplash.com/photo-1634986666676-ec8fd927c23d?w=600&h=340&fit=crop", name: "Neon Genesis #042", artist: "PixelMaster.eth", price: "8.2 ETH" },
];

const GALLERY = [
  { img: "https://images.unsplash.com/photo-1635322966219-b75ed372eb01?w=300&h=300&fit=crop", name: "Digital Dream", price: "3.1 ETH", bid: "2.8 ETH" },
  { img: "https://images.unsplash.com/photo-1633957897986-70e83293f3ff?w=300&h=300&fit=crop", name: "Pixel Horizon", price: "1.8 ETH", bid: "1.5 ETH" },
  { img: "https://images.unsplash.com/photo-1620641788421-7a1c342ea42e?w=300&h=300&fit=crop", name: "Abstract Flow", price: "5.4 ETH", bid: "5.0 ETH" },
  { img: "https://images.unsplash.com/photo-1618005198919-d3d4b5a92ead?w=300&h=300&fit=crop", name: "Quantum Pulse", price: "2.2 ETH", bid: "1.9 ETH" },
  { img: "https://images.unsplash.com/photo-1614850523459-c2f4c699c52e?w=300&h=300&fit=crop", name: "Neon Bloom", price: "4.7 ETH", bid: "4.2 ETH" },
  { img: "https://images.unsplash.com/photo-1614851099511-773084f6911d?w=300&h=300&fit=crop", name: "Cyber Genesis", price: "6.3 ETH", bid: "5.8 ETH" },
];

const AUCTIONS = [
  { img: "https://images.unsplash.com/photo-1642104704074-907c0698cbd9?w=200&h=200&fit=crop", name: "Meta Ape #3291", price: "24.5 ETH", timer: "02:14:33" },
  { img: "https://images.unsplash.com/photo-1645378999013-95c5975f4156?w=200&h=200&fit=crop", name: "CryptoPunk #7804", price: "89.0 ETH", timer: "05:42:11" },
  { img: "https://images.unsplash.com/photo-1637611331620-51149c7ceb94?w=200&h=200&fit=crop", name: "Bored Yacht #8817", price: "34.2 ETH", timer: "11:08:45" },
];

const RANKINGS = [
  { avatar: "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=72&h=72&fit=crop", name: "CryptoWhale.eth", vol: "1,245 ETH", change: "+342%", up: true },
  { avatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=72&h=72&fit=crop", name: "NFTQueen.eth", vol: "892 ETH", change: "+218%", up: true },
  { avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=72&h=72&fit=crop", name: "PixelKing.eth", vol: "756 ETH", change: "+189%", up: true },
  { avatar: "https://images.unsplash.com/photo-1527980965255-d3b416303d12?w=72&h=72&fit=crop", name: "ArtCollector.eth", vol: "634 ETH", change: "-12%", up: false },
];

export default function MobileNFT() {
  return (
    <div class="mnft">
      <div class="mnft-hero">
        <h1>Discover <span class="mnft-glow">Exclusive</span> <span class="mnft-cyan">NFT</span></h1>
        <p>Explore, collect, and trade unique digital assets on HuoBTC's marketplace.</p>
        <div class="mnft-hero-stats">
          <div class="mnft-hero-stat"><span class="mnft-hero-stat-num">52K+</span><span class="mnft-hero-stat-label">NFTs</span></div>
          <div class="mnft-hero-stat"><span class="mnft-hero-stat-num">12.8K</span><span class="mnft-hero-stat-label">Artists</span></div>
          <div class="mnft-hero-stat"><span class="mnft-hero-stat-num">$180M</span><span class="mnft-hero-stat-label">Volume</span></div>
        </div>
      </div>

      <div class="mnft-sec">
        <h2 class="mnft-sec-title">🔥 Featured</h2>
        <div class="mnft-featured">
          {FEATURED.map(f => (
            <div class="mnft-fc">
              <img src={f.img} alt={f.name} class="mnft-fc-img" loading="lazy" />
              <div class="mnft-fc-overlay"><div class="mnft-fc-name">{f.name}</div><div class="mnft-fc-artist">by {f.artist}</div></div>
              <div class="mnft-fc-price">{f.price}</div>
            </div>
          ))}
        </div>
      </div>

      <div class="mnft-sec">
        <h2 class="mnft-sec-title">🎨 Trending</h2>
        <div class="mnft-grid">
          {GALLERY.map(g => (
            <div class="mnft-card">
              <div class="mnft-card-img-wrap"><img src={g.img} alt={g.name} class="mnft-card-img" loading="lazy" /></div>
              <div class="mnft-card-info">
                <div class="mnft-card-name">{g.name}</div>
                <div class="mnft-card-row"><span class="mnft-card-price">{g.price}</span><span class="mnft-card-bid">{g.bid}</span></div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div class="mnft-sec">
        <h2 class="mnft-sec-title">⚡ Live Auctions</h2>
        <div class="mnft-auctions">
          {AUCTIONS.map(a => (
            <div class="mnft-auc">
              <img src={a.img} alt={a.name} class="mnft-auc-img" loading="lazy" />
              <div class="mnft-auc-body">
                <div class="mnft-auc-name">{a.name}</div>
                <div class="mnft-auc-price">{a.price}</div>
                <span class="mnft-auc-timer">🔥 {a.timer}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div class="mnft-sec">
        <h2 class="mnft-sec-title">🏆 Top Collectors</h2>
        <div class="mnft-ranks">
          {RANKINGS.map((r, i) => (
            <div class="mnft-rank">
              <span class="mnft-rank-num">#{i + 1}</span>
              <img src={r.avatar} alt={r.name} class="mnft-rank-av" loading="lazy" />
              <div class="mnft-rank-info"><div class="mnft-rank-name">{r.name}</div><div class="mnft-rank-vol">{r.vol}</div></div>
              <span class={`mnft-rank-chg ${r.up ? "mnft-rank-up" : "mnft-rank-down"}`}>{r.change}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
