import { Stock } from './types';

export interface TechnicalData {
  rsi: number;
  macd: number;
  sma5: number;
  sma25: number;
  sma75: number;
  sma200: number;
  bollingerMid: number;
  bollingerUpper: number;
  bollingerLower: number;
  volume: number;
  support: number;
  resistance: number;
  stopLoss: number;
  targetPrice: number;
}

export function computeTechnicals(stock: Stock): TechnicalData {
  const hLength = stock.history.length;
  
  const recent200 = stock.history.slice(Math.max(0, hLength - 200));
  const sma200 = recent200.reduce((acc, val) => acc + val.close, 0) / recent200.length;

  const recent20 = stock.history.slice(Math.max(0, hLength - 20));
  const bollingerMid = recent20.reduce((acc, val) => acc + val.close, 0) / recent20.length;
  const variance = recent20.reduce((acc, val) => acc + Math.pow(val.close - bollingerMid, 2), 0) / recent20.length;
  const stddev = Math.sqrt(variance);
  
  const bollingerUpper = bollingerMid + 2 * stddev;
  const bollingerLower = bollingerMid - 2 * stddev;

  const minLow20 = Math.min(...recent20.map(h => h.low));
  const maxHigh20 = Math.max(...recent20.map(h => h.high));

  const support = Math.round(minLow20 * 0.99);
  const resistance = Math.round(maxHigh20 * 1.01);
  const stopLoss = Math.round(support * 0.97);
  const targetPrice = Math.round(resistance * 1.03);

  const volume = Math.round(stock.indicators.volumeRatio * 100);
  const lastHistory = stock.history[hLength - 1];

  return {
    rsi: lastHistory?.rsi || stock.indicators.rsi,
    macd: lastHistory?.macd || stock.indicators.macd,
    sma5: lastHistory?.sma5 || 0,
    sma25: lastHistory?.sma25 || 0,
    sma75: lastHistory?.sma75 || 0,
    sma200,
    bollingerMid,
    bollingerUpper,
    bollingerLower,
    volume,
    support,
    resistance,
    stopLoss,
    targetPrice
  };
}

export function computeVWAP(stock: Stock, periods: number): number {
  const recent = stock.history.slice(Math.max(0, stock.history.length - periods));
  if (recent.length === 0) return stock.price;
  let cumTP = 0;
  for (const h of recent) {
    const typical = (h.high + h.low + h.close) / 3;
    cumTP += typical;
  }
  return Math.round((cumTP / recent.length) * 10) / 10;
}

export function computeATR(stock: Stock, period: number = 14): number {
  const recent = stock.history.slice(Math.max(0, stock.history.length - period - 1));
  if (recent.length <= 1) return 0;
  let sumTR = 0;
  for (let i = 1; i < recent.length; i++) {
    const h = recent[i];
    const prevC = recent[i-1].close;
    const tr = Math.max(h.high - h.low, Math.abs(h.high - prevC), Math.abs(h.low - prevC));
    sumTR += tr;
  }
  return Math.round((sumTR / (recent.length - 1)) * 10) / 10;
}

export function computeMultipleSupportResistance(stock: Stock): { supports: number[], resistances: number[] } {
  const recent = stock.history.slice(Math.max(0, stock.history.length - 60));
  const lows: number[] = [];
  const highs: number[] = [];
  for (let i = 1; i < recent.length - 1; i++) {
    if (recent[i].low < recent[i-1].low && recent[i].low < recent[i+1].low) lows.push(recent[i].low);
    if (recent[i].high > recent[i-1].high && recent[i].high > recent[i+1].high) highs.push(recent[i].high);
  }
  
  const cluster = (pts: number[]) => {
    const clusters: { center: number, count: number }[] = [];
    pts.forEach(p => {
      let found = false;
      for (const c of clusters) {
        if (Math.abs(c.center - p) / c.center <= 0.01) {
          c.center = (c.center * c.count + p) / (c.count + 1);
          c.count++;
          found = true;
          break;
        }
      }
      if (!found) clusters.push({ center: p, count: 1 });
    });
    return clusters.sort((a,b) => b.count - a.count).map(c => Math.round(c.center));
  };
  
  const supports = cluster(lows).filter(s => s < stock.price).sort((a,b) => a - b).slice(-3);
  const resistances = cluster(highs).filter(r => r > stock.price).sort((a,b) => a - b).slice(0, 3);
  return { supports, resistances };
}

export interface EntryPoints {
  aggressive: number;
  moderate: number;
  conservative: number;
  target1: number;
  target2: number;
  stopLoss: number;
  riskReward: number;
}

export function computeEntryPoints(stock: Stock, technicals: TechnicalData): EntryPoints {
  const aggressive = stock.price;
  const moderate = Math.round(technicals.bollingerMid);
  const conservative = Math.round(technicals.support);
  const target1 = Math.round(technicals.resistance);
  const target2 = Math.round(target1 * 1.02);
  const stopLoss = Math.round(technicals.stopLoss);
  const riskReward = stopLoss < aggressive ? Math.round(((target1 - aggressive) / (aggressive - stopLoss)) * 10) / 10 : 0;
  return { aggressive, moderate, conservative, target1, target2, stopLoss, riskReward };
}
