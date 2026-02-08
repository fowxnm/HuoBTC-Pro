export interface TickerData {
  symbol: string;
  price: number;
  prev: number;
  change24h: number;
  volume24h: number;
  timestamp: string;
}

export interface KlineData {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}
