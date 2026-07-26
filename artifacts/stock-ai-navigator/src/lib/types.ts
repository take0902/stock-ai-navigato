export interface ChartPattern {
  name: string;
  nameEn: string;
  detected: boolean;
  confidence: number;
  bullish: boolean;
}

export interface RiskScore {
  value: number;
  label: string;
  color: string;
  volatility: number;
  betaProxy: number;
}

export interface StockRanking {
  code: string;
  name: string;
  score: number;
  recommendation: string;
  changePct: number;
  rank: number;
}

export type RankingTimeframe = 'short' | 'mid' | 'long';

export interface ScreenerFilters {
  minRSI: number;
  maxRSI: number;
  macdDirection: 'any' | 'bullish' | 'bearish';
  minAIScore: number;
  maxAIScore: number;
  smaAlignment: 'any' | 'bullish' | 'bearish';
  sector: string;
}

export type Stock = {
  code: string;
  name: string;
  price: number;
  change: number;
  changePct: number;
  score: number;
  sector?: string;
  volume?: number;
  probabilities: { up: number; flat: number; down: number };
  forecasts: {
    next: { low: number; high: number };
    five: { low: number; high: number };
    twenty: { low: number; high: number };
  };
  indicators: {
    rsi: number;
    macd: number;
    volumeRatio: number;
    deviation25: number;
  };
  signal: string;
  reasons: string[];
  cautions: string[];
  news: Array<{
    sentiment: "ポジティブ" | "中立" | "ネガティブ";
    title: string;
    summary: string;
  }>;
  history: Array<{
    open: number;
    high: number;
    low: number;
    close: number;
    sma5: number;
    sma25: number;
    sma75: number;
    rsi: number;
    macd: number;
  }>;
};
