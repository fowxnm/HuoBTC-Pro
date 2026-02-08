/**
 * Shared coin icon component.
 * Returns a circular icon with the coin's brand color and letter/logo.
 * Used across all pages: Market, Trade, Home, Assets, Admin.
 */

const COIN_COLORS: Record<string, string> = {
  BTC:   "#F7931A",
  ETH:   "#627EEA",
  SOL:   "#9945FF",
  BNB:   "#F3BA2F",
  XRP:   "#23292F",
  DOGE:  "#C2A633",
  ADA:   "#0033AD",
  AVAX:  "#E84142",
  DOT:   "#E6007A",
  MATIC: "#8247E5",
  LINK:  "#2A5ADA",
  UNI:   "#FF007A",
  USDT:  "#26A17B",
  USDC:  "#2775CA",
  DAI:   "#F5AC37",
  WETH:  "#627EEA",
  LTC:   "#345D9D",
  ATOM:  "#2E3148",
  FIL:   "#0090FF",
  NEAR:  "#00C1DE",
};

const COIN_SVGS: Record<string, (size: number) => any> = {
  BTC: (s) => (
    <svg viewBox="0 0 32 32" width={s} height={s}>
      <circle cx="16" cy="16" r="16" fill="#F7931A"/>
      <path fill="#fff" d="M22.5 14.2c.3-2-1.2-3.1-3.3-3.8l.7-2.7-1.7-.4-.7 2.6c-.4-.1-.9-.2-1.4-.3l.7-2.7-1.7-.4-.7 2.7c-.3-.1-.7-.2-1-.2l-2.3-.6-.4 1.8s1.2.3 1.2.3c.7.2.8.6.8 1l-.8 3.2c0 0 .1 0 .1 0l-.1 0-1.1 4.5c-.1.2-.3.5-.7.4 0 0-1.2-.3-1.2-.3l-.8 1.9 2.2.5c.4.1.8.2 1.2.3l-.7 2.8 1.7.4.7-2.7c.5.1.9.2 1.4.3l-.7 2.7 1.7.4.7-2.7c2.8.5 5 .3 5.9-2.2.7-2-.1-3.2-1.5-3.9 1.1-.3 1.9-1 2.1-2.5zm-3.8 5.3c-.5 2-4 .9-5.1.7l.9-3.7c1.1.3 4.7.8 4.2 3zm.5-5.4c-.5 1.8-3.3.9-4.3.7l.8-3.3c1 .2 4 .7 3.5 2.6z"/>
    </svg>
  ),
  ETH: (s) => (
    <svg viewBox="0 0 32 32" width={s} height={s}>
      <circle cx="16" cy="16" r="16" fill="#627EEA"/>
      <path fill="#fff" fill-opacity=".6" d="M16.5 4v8.9l7.5 3.3z"/>
      <path fill="#fff" d="M16.5 4L9 16.2l7.5-3.3z"/>
      <path fill="#fff" fill-opacity=".6" d="M16.5 21.9v6.1l7.5-10.4z"/>
      <path fill="#fff" d="M16.5 28v-6.1L9 17.6z"/>
      <path fill="#fff" fill-opacity=".2" d="M16.5 20.6l7.5-4.4-7.5-3.3z"/>
      <path fill="#fff" fill-opacity=".6" d="M9 16.2l7.5 4.4v-7.7z"/>
    </svg>
  ),
  SOL: (s) => (
    <svg viewBox="0 0 32 32" width={s} height={s}>
      <circle cx="16" cy="16" r="16" fill="#000"/>
      <defs><linearGradient id="sg" x1="6" y1="24" x2="26" y2="8" gradientUnits="userSpaceOnUse"><stop stop-color="#9945FF"/><stop offset="1" stop-color="#14F195"/></linearGradient></defs>
      <path fill="url(#sg)" d="M9.5 20.5a.6.6 0 01.4-.2h14.6a.3.3 0 01.2.5l-2.4 2.4a.6.6 0 01-.4.2H7.3a.3.3 0 01-.2-.5l2.4-2.4zm0-11.7a.6.6 0 01.4-.2h14.6a.3.3 0 01.2.5l-2.4 2.4a.6.6 0 01-.4.2H7.3a.3.3 0 01-.2-.5l2.4-2.4zm12.8 5.7a.6.6 0 00-.4-.2H7.3a.3.3 0 00-.2.5l2.4 2.4a.6.6 0 00.4.2h14.6a.3.3 0 00.2-.5l-2.4-2.4z"/>
    </svg>
  ),
  BNB: (s) => (
    <svg viewBox="0 0 32 32" width={s} height={s}>
      <circle cx="16" cy="16" r="16" fill="#F3BA2F"/>
      <path fill="#fff" d="M12.1 14.1L16 10.2l3.9 3.9 2.3-2.3L16 5.6l-6.2 6.2 2.3 2.3zm-6.5 1.9l2.3-2.3 2.3 2.3-2.3 2.3-2.3-2.3zm6.5 1.9L16 21.8l3.9-3.9 2.3 2.3L16 26.4l-6.2-6.2 2.3-2.3zm8.8-1.9l2.3-2.3 2.3 2.3-2.3 2.3-2.3-2.3zM18.6 16L16 13.4 13.4 16 16 18.6 18.6 16z"/>
    </svg>
  ),
  XRP: (s) => (
    <svg viewBox="0 0 32 32" width={s} height={s}>
      <circle cx="16" cy="16" r="16" fill="#23292F"/>
      <path fill="#fff" d="M23.1 8h2.5l-5.8 5.7a5.3 5.3 0 01-7.4 0L6.5 8H9l4.5 4.4a3.4 3.4 0 004.8 0L23.1 8zM9 24h-2.6l5.8-5.7a5.3 5.3 0 017.4 0L25.6 24h-2.5l-4.5-4.4a3.4 3.4 0 00-4.8 0L9 24z"/>
    </svg>
  ),
  DOGE: (s) => (
    <svg viewBox="0 0 32 32" width={s} height={s}>
      <circle cx="16" cy="16" r="16" fill="#C2A633"/>
      <path fill="#fff" d="M13.3 8.4h4.4c4.6 0 7 2.8 7 7.6s-2.4 7.6-7 7.6h-4.4V8.4zm2.5 2.3v10.5h2c3 0 4.5-1.8 4.5-5.3s-1.5-5.2-4.5-5.2h-2z"/>
    </svg>
  ),
  ADA: (s) => (
    <svg viewBox="0 0 32 32" width={s} height={s}>
      <circle cx="16" cy="16" r="16" fill="#0033AD"/>
      <g fill="#fff">
        <circle cx="16" cy="16" r="1.8"/>
        <circle cx="16" cy="10" r="1.2"/><circle cx="16" cy="22" r="1.2"/>
        <circle cx="10.8" cy="13" r="1.2"/><circle cx="21.2" cy="13" r="1.2"/>
        <circle cx="10.8" cy="19" r="1.2"/><circle cx="21.2" cy="19" r="1.2"/>
        <circle cx="13" cy="8" r=".7"/><circle cx="19" cy="8" r=".7"/>
        <circle cx="13" cy="24" r=".7"/><circle cx="19" cy="24" r=".7"/>
        <circle cx="8" cy="11" r=".7"/><circle cx="24" cy="11" r=".7"/>
        <circle cx="8" cy="21" r=".7"/><circle cx="24" cy="21" r=".7"/>
        <circle cx="8.5" cy="16" r=".7"/><circle cx="23.5" cy="16" r=".7"/>
      </g>
    </svg>
  ),
  AVAX: (s) => (
    <svg viewBox="0 0 32 32" width={s} height={s}>
      <circle cx="16" cy="16" r="16" fill="#E84142"/>
      <path fill="#fff" d="M20.6 21.2h3.2L16 8.4 12.3 15.4h0l-1.5 2.8h0L8.2 21.2h3.2l4.6-8.5 4.6 8.5zm-7.3 0h3.2l-1.6-3-1.6 3z"/>
    </svg>
  ),
  DOT: (s) => (
    <svg viewBox="0 0 32 32" width={s} height={s}>
      <circle cx="16" cy="16" r="16" fill="#E6007A"/>
      <g fill="#fff">
        <circle cx="16" cy="7.5" r="3"/>
        <circle cx="16" cy="24.5" r="3"/>
        <ellipse cx="16" cy="16" rx="5.5" ry="10" fill="none" stroke="#fff" stroke-width="2"/>
      </g>
    </svg>
  ),
  MATIC: (s) => (
    <svg viewBox="0 0 32 32" width={s} height={s}>
      <circle cx="16" cy="16" r="16" fill="#8247E5"/>
      <path fill="#fff" d="M21.2 12.6c-.4-.2-.9-.2-1.2 0l-2.9 1.7-2 1.1-2.9 1.7c-.4.2-.9.2-1.2 0l-2.3-1.3c-.4-.2-.6-.6-.6-1.1v-2.6c0-.4.2-.9.6-1.1l2.2-1.3c.4-.2.9-.2 1.2 0l2.2 1.3c.4.2.6.6.6 1.1v1.7l2-1.1v-1.7c0-.4-.2-.9-.6-1.1l-4.2-2.4c-.4-.2-.9-.2-1.2 0l-4.3 2.5c-.4.2-.6.6-.6 1v4.8c0 .4.2.9.6 1.1l4.3 2.4c.4.2.9.2 1.2 0l2.9-1.7 2-1.1 2.9-1.7c.4-.2.9-.2 1.2 0l2.2 1.3c.4.2.6.6.6 1.1v2.6c0 .4-.2.9-.6 1.1l-2.2 1.3c-.4.2-.9.2-1.2 0l-2.2-1.3c-.4-.2-.6-.6-.6-1.1v-1.7l-2 1.1v1.7c0 .4.2.9.6 1.1l4.3 2.4c.4.2.9.2 1.2 0l4.3-2.4c.4-.2.6-.6.6-1.1v-4.8c0-.4-.2-.9-.6-1.1l-4.4-2.5z"/>
    </svg>
  ),
  LINK: (s) => (
    <svg viewBox="0 0 32 32" width={s} height={s}>
      <circle cx="16" cy="16" r="16" fill="#2A5ADA"/>
      <path fill="#fff" d="M16 6l-2 1.2-6 3.5L6 11.8v8.4l2 1.2 6 3.5 2 1.2 2-1.2 6-3.5 2-1.2v-8.4l-2-1.2-6-3.5L16 6zm-4 15.3l-4-2.3v-5.9l4-2.3 4 2.3v5.9l-4 2.3zm4-2.4l4-2.3v-1.2l-4-2.3-4 2.3v1.2l4 2.3zm6-3.5l-4 2.3v-5.9l4-2.3v5.9z"/>
    </svg>
  ),
  UNI: (s) => (
    <svg viewBox="0 0 32 32" width={s} height={s}>
      <circle cx="16" cy="16" r="16" fill="#FF007A"/>
      <g fill="#fff">
        <path d="M13.5 8c.3 0 .5.1.6.2.1.3-.1.6-.1.9 0 .5.3.8.5 1.2.3.5.5 1 .4 1.7 0 .3-.2.6-.3.8-.2.3-.4.5-.6.6l-.1.2c.2.2.5.2.8.2.5 0 1-.2 1.3-.5.3-.2.5-.5.8-.6.2-.1.5-.1.7 0 .3.1.4.4.5.6.1.4 0 .8-.2 1.2-.2.4-.4.8-.7 1.1-.5.5-1.1.9-1.8 1.1-.4.1-.8.1-1.1 0-.3-.1-.5-.3-.7-.6-.2-.3-.2-.7-.2-1 0-.5.2-.9.3-1.4.1-.3.1-.7 0-1-.1-.2-.3-.3-.5-.3-.3 0-.5.2-.6.5-.2.4-.2.8-.2 1.3 0 .6.1 1.2-.1 1.7-.1.3-.3.5-.6.6-.4.2-.9.1-1.2-.2-.3-.3-.5-.6-.6-1-.2-.7-.2-1.5 0-2.2.1-.5.4-.9.7-1.3.4-.4.9-.6 1.4-.7.3 0 .5-.1.7-.3.1-.1.2-.3.2-.5 0-.3-.1-.5-.2-.8-.1-.2-.2-.5-.1-.7.1-.3.3-.4.6-.4z"/>
        <circle cx="15" cy="9.5" r=".6"/>
        <path d="M16 16c0 1.5.4 2.8 1.2 4 .7 1.1 1.7 1.8 2.9 2.2.3.1.6.1.8 0 .3-.1.4-.4.3-.7-.1-.2-.3-.3-.5-.3-.8-.3-1.5-.8-2-1.6-.6-.9-.9-1.9-.9-3 0-.3-.1-.5-.3-.7-.2-.2-.5-.2-.7-.1-.5.1-.8.5-.8 1v.2z"/>
      </g>
    </svg>
  ),
  USDT: (s) => (
    <svg viewBox="0 0 32 32" width={s} height={s}>
      <circle cx="16" cy="16" r="16" fill="#26A17B"/>
      <path fill="#fff" d="M17.9 17v0c-.1 0-.7.1-2 .1-1 0-1.7 0-1.9-.1v0c-3.9-.2-6.8-.9-6.8-1.8s2.9-1.6 6.8-1.8v2.8c.3 0 1 .1 2 .1 1.2 0 1.8-.1 1.9-.1v-2.8c3.9.2 6.7.9 6.7 1.8s-2.8 1.6-6.7 1.8zM17.9 12.8v-2.5h5v-3h-13.7v3h5v2.5c-4.4.2-7.7 1.1-7.7 2.2s3.3 2 7.7 2.2v7.8h2v-7.8c4.4-.2 7.6-1.1 7.6-2.2s-3.2-2-7.6-2.2h-.3z"/>
    </svg>
  ),
  USDC: (s) => (
    <svg viewBox="0 0 32 32" width={s} height={s}>
      <circle cx="16" cy="16" r="16" fill="#2775CA"/>
      <path fill="#fff" d="M20.5 18.5c0-2.1-1.3-2.8-3.8-3.1-1.8-.3-2.1-.7-2.1-1.5s.7-1.3 1.9-1.3c1.1 0 1.7.4 2 1.3.1.1.2.2.3.2h1.1c.2 0 .3-.2.3-.3-.3-1.3-1.1-2.2-2.5-2.5V10c0-.2-.1-.3-.3-.3h-1c-.2 0-.3.1-.3.3v1.3c-1.8.3-2.9 1.4-2.9 2.8 0 2 1.2 2.7 3.7 3.1 1.7.3 2.2.8 2.2 1.6 0 .9-.8 1.5-2 1.5-1.5 0-2.1-.6-2.3-1.5 0-.2-.2-.2-.3-.2h-1.1c-.2 0-.3.2-.3.3.3 1.5 1.2 2.4 3 2.7V22c0 .2.1.3.3.3h1c.2 0 .3-.1.3-.3v-1.3c1.8-.3 3-1.4 3-3z"/>
      <path fill="#fff" d="M13.1 24.3c-4.5-1.6-6.8-6.5-5.2-11 .6-1.8 1.8-3.3 3.5-4.2.1-.1.2-.3.2-.4v-1c0-.2-.1-.3-.2-.3-.1 0-.1 0-.2.1-5 2-7.5 7.6-5.4 12.7.8 2 2.3 3.5 4.3 4.3.1 0 .3 0 .3-.1.1-.1.1-.2.1-.3v-1c0 .1-.2-.1-.4-.2-.1.1 0 .3 0 .4zm7.1-16.7c-.1 0-.3 0-.3.1-.1.1-.1.2-.1.3v1c0 .2.2.3.3.5 4.5 1.6 6.8 6.5 5.2 11-.6 1.8-1.8 3.3-3.5 4.2-.1.1-.2.3-.2.4v1c0 .2.1.3.2.3.1 0 .1 0 .2-.1 5-2 7.5-7.6 5.4-12.7-.7-2-2.3-3.5-4.2-4.3-.1.1.1-.4 0-.7z"/>
    </svg>
  ),
  DAI: (s) => (
    <svg viewBox="0 0 32 32" width={s} height={s}>
      <circle cx="16" cy="16" r="16" fill="#F5AC37"/>
      <path fill="#fff" d="M16 6.5l-8 9.5 8 9.5 8-9.5-8-9.5zm0 3.3l5 5.9h-10l5-5.9zm-5.5 7.5h11l-5.5 6.5-5.5-6.5z"/>
    </svg>
  ),
  WETH: (s) => (
    <svg viewBox="0 0 32 32" width={s} height={s}>
      <circle cx="16" cy="16" r="16" fill="#627EEA"/>
      <path fill="#fff" fill-opacity=".6" d="M16.5 4v8.9l7.5 3.3z"/>
      <path fill="#fff" d="M16.5 4L9 16.2l7.5-3.3z"/>
      <path fill="#fff" fill-opacity=".6" d="M16.5 21.9v6.1l7.5-10.4z"/>
      <path fill="#fff" d="M16.5 28v-6.1L9 17.6z"/>
      <path fill="#fff" fill-opacity=".2" d="M16.5 20.6l7.5-4.4-7.5-3.3z"/>
      <path fill="#fff" fill-opacity=".6" d="M9 16.2l7.5 4.4v-7.7z"/>
    </svg>
  ),
  LTC: (s) => (
    <svg viewBox="0 0 32 32" width={s} height={s}>
      <circle cx="16" cy="16" r="16" fill="#345D9D"/>
      <path fill="#fff" d="M11.5 24h11.3v-2.7h-7l3.5-8.3 2.5-1-.7-2-2.3.9L21 5h-3.2l-2 8.4-2.5 1 .7 2 2.3-.9-2.5 5.8h-2.3V24z"/>
    </svg>
  ),
  ATOM: (s) => (
    <svg viewBox="0 0 32 32" width={s} height={s}>
      <circle cx="16" cy="16" r="16" fill="#2E3148"/>
      <g fill="none" stroke="#fff" stroke-width="1.2">
        <ellipse cx="16" cy="16" rx="10" ry="4"/>
        <ellipse cx="16" cy="16" rx="10" ry="4" transform="rotate(60 16 16)"/>
        <ellipse cx="16" cy="16" rx="10" ry="4" transform="rotate(120 16 16)"/>
      </g>
      <circle cx="16" cy="16" r="2" fill="#fff"/>
    </svg>
  ),
  FIL: (s) => (
    <svg viewBox="0 0 32 32" width={s} height={s}>
      <circle cx="16" cy="16" r="16" fill="#0090FF"/>
      <path fill="#fff" d="M16.8 8h-1.3l-.4 3.3-3.4.8.2 1.2 3.2-.7-.6 4.2-3.4.8.2 1.2 3.2-.7-.5 3.5h1.3l.5-3.7 3.3-.8-.2-1.2-3.2.8.6-4.3 3.3-.8-.2-1.2-3.1.7.4-3.1z"/>
    </svg>
  ),
  NEAR: (s) => (
    <svg viewBox="0 0 32 32" width={s} height={s}>
      <circle cx="16" cy="16" r="16" fill="#00C1DE"/>
      <path fill="#fff" d="M21.8 7.5l-4.4 6.5c-.2.3.2.6.4.4l4.3-3.6c.1-.1.3 0 .3.1v10.9c0 .2-.2.2-.3.1l-11.2-14c-.5-.6-1.2-1-2-1H8.4c-1 0-1.8.8-1.8 1.8v13.4c0 1 .8 1.8 1.8 1.8h.5c.7 0 1.3-.3 1.7-1l4.4-6.5c.2-.3-.2-.6-.4-.4l-4.3 3.6c-.1.1-.3 0-.3-.1V8.6c0-.2.2-.2.3-.1l11.2 14c.5.6 1.2 1 2 1h.5c1 0 1.8-.8 1.8-1.8V8.3c0-1-.8-1.8-1.8-1.8h-.5c-.6 0-1.2.3-1.6 1z"/>
    </svg>
  ),
};

/** Generic fallback: circle with first letter */
function FallbackIcon(props: { symbol: string; size: number }) {
  const color = COIN_COLORS[props.symbol] || "#555";
  return (
    <svg viewBox="0 0 32 32" width={props.size} height={props.size}>
      <circle cx="16" cy="16" r="16" fill={color} />
      <text x="16" y="22" text-anchor="middle" fill="#fff" font-size="16" font-weight="700" font-family="system-ui,sans-serif">
        {props.symbol.charAt(0)}
      </text>
    </svg>
  );
}

export interface CoinIconProps {
  symbol: string;
  size?: number;
  iconUrl?: string | null;
}

export default function CoinIcon(props: CoinIconProps) {
  const s = props.size ?? 24;
  const sym = props.symbol.toUpperCase();
  const renderer = COIN_SVGS[sym];

  // Priority: backend-uploaded icon > hardcoded SVG > fallback letter
  if (props.iconUrl) {
    return (
      <span style={{ display: "inline-flex", "align-items": "center", "justify-content": "center", "flex-shrink": "0", width: `${s}px`, height: `${s}px`, "border-radius": "50%", overflow: "hidden" }}>
        <img src={props.iconUrl} alt={sym} width={s} height={s} style={{ width: "100%", height: "100%", "object-fit": "cover" }} />
      </span>
    );
  }

  return (
    <span style={{ display: "inline-flex", "align-items": "center", "justify-content": "center", "flex-shrink": "0", width: `${s}px`, height: `${s}px`, "border-radius": "50%", overflow: "hidden" }}>
      {renderer ? renderer(s) : <FallbackIcon symbol={sym} size={s} />}
    </span>
  );
}

/** Get brand color for a coin symbol */
export function getCoinColor(symbol: string): string {
  return COIN_COLORS[symbol.toUpperCase()] || "#555";
}
