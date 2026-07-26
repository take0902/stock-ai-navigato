import { describe, it, expect } from 'vitest';
import { computeTechnicals, computeVWAP, computeATR, computeEntryPoints } from '../technicals';
import { Stock } from '../types';

const mockHistory = Array.from({ length: 260 }, (_, i) => ({
  open: 980 + Math.sin(i * 0.3) * 20,
  high: 1010 + Math.sin(i * 0.3) * 20,
  low: 970 + Math.sin(i * 0.3) * 20,
  close: 1000 + Math.sin(i * 0.3) * 15,
  sma5: 998 + Math.sin(i * 0.3) * 10,
  sma25: 995 + Math.sin(i * 0.3) * 8,
  sma75: 990 + Math.sin(i * 0.3) * 5,
  rsi: 50 + Math.sin(i * 0.5) * 15,
  macd: Math.sin(i * 0.2) * 10
}));

const mockStock: Stock = {
  code: '0000', name: 'テスト', price: 1000, change: 5, changePct: 0.5,
  score: 65, probabilities: { up: 50, flat: 30, down: 20 },
  forecasts: { next: {low:990,high:1010}, five:{low:980,high:1020}, twenty:{low:960,high:1050} },
  indicators: { rsi: 52, macd: 3, volumeRatio: 1.1, deviation25: 2 },
  signal: '', reasons: [], cautions: [], news: [], history: mockHistory
};

describe('computeTechnicals', () => {
  it('sma200 is reasonable', () => {
    const t = computeTechnicals(mockStock);
    expect(t.sma200).toBeGreaterThan(900);
    expect(t.sma200).toBeLessThan(1100);
  });
  it('bollinger upper > lower', () => {
    const t = computeTechnicals(mockStock);
    expect(t.bollingerUpper).toBeGreaterThan(t.bollingerLower);
  });
  it('resistance > support', () => {
    const t = computeTechnicals(mockStock);
    expect(t.resistance).toBeGreaterThan(t.support);
  });
});

describe('computeVWAP', () => {
  it('returns a reasonable price', () => {
    const vwap = computeVWAP(mockStock, 22);
    expect(vwap).toBeGreaterThan(900);
    expect(vwap).toBeLessThan(1100);
  });
});

describe('computeATR', () => {
  it('returns positive ATR', () => {
    const atr = computeATR(mockStock, 14);
    expect(atr).toBeGreaterThan(0);
  });
});