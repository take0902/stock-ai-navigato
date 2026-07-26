import { describe, it, expect } from 'vitest';
import { computeAIScores, getRecommendation, computeRiskScore, computeStockRankings } from '../aiAnalysis';
import { Stock } from '../types';

// Minimal mock stock that satisfies the Stock type
const mockStock: Stock = {
  code: '0000',
  name: 'テスト株式',
  price: 1000,
  change: 10,
  changePct: 1.0,
  score: 70,
  probabilities: { up: 55, flat: 25, down: 20 },
  forecasts: {
    next: { low: 990, high: 1010 },
    five: { low: 970, high: 1030 },
    twenty: { low: 950, high: 1100 }
  },
  indicators: { rsi: 55, macd: 5, volumeRatio: 1.2, deviation25: 3 },
  signal: 'テスト',
  reasons: ['理由1'],
  cautions: ['注意1'],
  news: [{ sentiment: 'ポジティブ', title: 'ニュース1', summary: '要約1' }],
  history: Array.from({ length: 260 }, (_, i) => ({
    open: 980 + i * 0.1,
    high: 1010 + i * 0.1,
    low: 970 + i * 0.1,
    close: 1000 + i * 0.1,
    sma5: 995 + i * 0.1,
    sma25: 990 + i * 0.1,
    sma75: 980 + i * 0.1,
    rsi: 55,
    macd: 5
  }))
};

describe('computeAIScores', () => {
  it('returns scores in 0-100 range', () => {
    const s = computeAIScores(mockStock);
    expect(s.technical).toBeGreaterThanOrEqual(0);
    expect(s.technical).toBeLessThanOrEqual(100);
    expect(s.overall).toBeGreaterThanOrEqual(0);
    expect(s.overall).toBeLessThanOrEqual(100);
  });

  it('overall is weighted average of dimensions', () => {
    const s = computeAIScores(mockStock);
    const weighted = Math.round(s.technical * 0.35 + s.fundamental * 0.25 + s.momentum * 0.25 + s.news * 0.15);
    expect(s.overall).toBe(weighted);
  });
});

describe('getRecommendation', () => {
  it('returns Strong Buy for score >= 80', () => {
    const r = getRecommendation(85);
    expect(r.stars).toBe(5);
    expect(r.label).toBe('強力買い');
  });
  it('returns Sell for score < 30', () => {
    const r = getRecommendation(20);
    expect(r.stars).toBe(1);
    expect(r.label).toBe('売り');
  });
});

describe('computeRiskScore', () => {
  it('returns value in 0-100 range', () => {
    const r = computeRiskScore(mockStock);
    expect(r.value).toBeGreaterThanOrEqual(0);
    expect(r.value).toBeLessThanOrEqual(100);
  });
  it('returns a label', () => {
    const r = computeRiskScore(mockStock);
    expect(['低リスク', '中リスク', '高リスク']).toContain(r.label);
  });
});

describe('computeStockRankings', () => {
  it('ranks stocks correctly', () => {
    const rankings = computeStockRankings([mockStock, mockStock], 'mid');
    expect(rankings).toHaveLength(2);
    expect(rankings[0].rank).toBe(1);
    expect(rankings[1].rank).toBe(2);
  });
});
