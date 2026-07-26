import { Stock, RiskScore, StockRanking, RankingTimeframe, ChartPattern } from './types';

export interface AIScores {
  technical: number;
  fundamental: number;
  momentum: number;
  news: number;
  overall: number;
}

export function computeAIScores(stock: Stock): AIScores {
  const rsi = stock.indicators.rsi;
  let techScore = 30;
  if (rsi >= 40 && rsi <= 60) techScore = 80;
  else if ((rsi >= 30 && rsi < 40) || (rsi > 60 && rsi <= 70)) techScore = 60;

  const macd = stock.indicators.macd;
  if (macd > 0) techScore += 10;
  else if (macd < 0) techScore -= 10;

  const lastHistory = stock.history[stock.history.length - 1];
  if (lastHistory && stock.price > lastHistory.sma5 && lastHistory.sma5 > lastHistory.sma25) {
    techScore += 15;
  }
  techScore = Math.max(0, Math.min(100, techScore));

  let fundScore = stock.score;
  const dev25 = stock.indicators.deviation25;
  if (dev25 > 2) fundScore += 5;
  else if (dev25 < -2) fundScore -= 5;
  
  const fundConstants: Record<string, number> = { "7203": 2, "8306": -1, "9984": -3, "4881": 1 };
  fundScore += (fundConstants[stock.code] || 0);
  fundScore = Math.max(0, Math.min(100, fundScore));

  let momScore = 50;
  if (stock.history.length >= 20) {
    const closes = stock.history.slice(-20).map(h => h.close);
    const currentClose = closes[19];
    const pastClose = closes[9];
    if (pastClose) {
      const roc = ((currentClose - pastClose) / pastClose) * 100;
      if (roc >= 5) momScore = 85;
      else if (roc >= 0) momScore = 65;
      else if (roc >= -5) momScore = 45;
      else momScore = 25;
    }
  }
  
  const volRatio = stock.indicators.volumeRatio;
  if (volRatio > 1.2) momScore += 5;
  else if (volRatio < 0.8) momScore -= 5;
  momScore = Math.max(0, Math.min(100, momScore));

  let newsScore = 50;
  if (stock.news) {
    for (const item of stock.news) {
      if (item.sentiment === "ポジティブ") newsScore += 30;
      else if (item.sentiment === "中立") newsScore += 15;
      else if (item.sentiment === "ネガティブ") newsScore -= 20;
    }
  }
  newsScore = Math.max(0, Math.min(100, newsScore));

  const overall = Math.round(techScore * 0.35 + fundScore * 0.25 + momScore * 0.25 + newsScore * 0.15);

  return {
    technical: Math.round(techScore),
    fundamental: Math.round(fundScore),
    momentum: Math.round(momScore),
    news: Math.round(newsScore),
    overall
  };
}

export interface AIRecommendation {
  stars: 1 | 2 | 3 | 4 | 5;
  label: string;
  labelEn: string;
  color: string;
}

export function getRecommendation(overallScore: number): AIRecommendation {
  if (overallScore >= 80) return { stars: 5, label: "強力買い", labelEn: "Strong Buy", color: "#10b981" };
  if (overallScore >= 65) return { stars: 4, label: "買い", labelEn: "Buy", color: "#22c55e" };
  if (overallScore >= 45) return { stars: 3, label: "保有", labelEn: "Hold", color: "#f59e0b" };
  if (overallScore >= 30) return { stars: 2, label: "利確", labelEn: "Take Profit", color: "#f97316" };
  return { stars: 1, label: "売り", labelEn: "Sell", color: "#ef4444" };
}

export function computeRiskScore(stock: Stock): RiskScore {
  const recent = stock.history.slice(Math.max(0, stock.history.length - 20));
  const returns: number[] = [];
  for (let i = 1; i < recent.length; i++) {
    returns.push((recent[i].close - recent[i-1].close) / recent[i-1].close * 100);
  }
  const mean = returns.reduce((a, b) => a + b, 0) / (returns.length || 1);
  const variance = returns.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / (returns.length || 1);
  const volatility = Math.sqrt(variance) || 0;
  
  const betaProxy = Math.min(2.0, volatility / 1.5);
  const value = Math.min(100, Math.round(volatility * 20));
  
  let label = "高リスク";
  let color = "#ef4444";
  if (value < 30) { label = "低リスク"; color = "#10b981"; }
  else if (value < 60) { label = "中リスク"; color = "#f59e0b"; }
  
  return { value, label, color, volatility, betaProxy };
}

export function computeStockRankings(stocks: Stock[], timeframe: RankingTimeframe): StockRanking[] {
  const scored = stocks.map(stock => {
    const ai = computeAIScores(stock);
    let score = ai.overall;
    if (timeframe === 'short') {
      score = Math.round(ai.technical * 0.5 + ai.momentum * 0.3 + ai.news * 0.2);
    } else if (timeframe === 'long') {
      score = Math.round(ai.fundamental * 0.5 + ai.technical * 0.2 + ai.momentum * 0.2 + ai.news * 0.1);
    }
    const rec = getRecommendation(score);
    return {
      code: stock.code,
      name: stock.name,
      score,
      recommendation: rec.label,
      changePct: stock.changePct,
    };
  });
  
  scored.sort((a, b) => b.score - a.score);
  return scored.map((s, i) => ({ ...s, rank: i + 1 }));
}

export function detectChartPatterns(data: number[]): ChartPattern[] {
  const patterns: ChartPattern[] = [
    { name: "ダブルボトム", nameEn: "Double Bottom", detected: false, confidence: 0, bullish: true },
    { name: "ダブルトップ", nameEn: "Double Top", detected: false, confidence: 0, bullish: false },
    { name: "ヘッドアンドショルダー", nameEn: "Head and Shoulders", detected: false, confidence: 0, bullish: false },
    { name: "逆ヘッドアンドショルダー", nameEn: "Inverse H&S", detected: false, confidence: 0, bullish: true },
    { name: "カップウィズハンドル", nameEn: "Cup with Handle", detected: false, confidence: 0, bullish: true },
    { name: "上昇チャネル", nameEn: "Ascending Channel", detected: false, confidence: 0, bullish: true },
    { name: "下降チャネル", nameEn: "Descending Channel", detected: false, confidence: 0, bullish: false },
  ];

  if (data.length < 60) return patterns;

  const isLocalMin = (i: number) => data[i] < data[i-2] && data[i] < data[i-1] && data[i] < data[i+1] && data[i] < data[i+2];
  const isLocalMax = (i: number) => data[i] > data[i-2] && data[i] > data[i-1] && data[i] > data[i+1] && data[i] > data[i+2];

  const minima: number[] = [];
  const maxima: number[] = [];
  for (let i = 2; i < data.length - 2; i++) {
    if (isLocalMin(i)) minima.push(i);
    if (isLocalMax(i)) maxima.push(i);
  }

  // Double Bottom
  for (let i = 0; i < minima.length - 1; i++) {
    for (let j = i + 1; j < minima.length; j++) {
      const idx1 = minima[i], idx2 = minima[j];
      if (idx2 - idx1 >= 8) {
        const p1 = data[idx1], p2 = data[idx2];
        const diff = Math.abs(p1 - p2);
        if (diff / p1 <= 0.03) {
          const hasMaxBetween = maxima.some(m => m > idx1 && m < idx2);
          if (hasMaxBetween) {
            patterns[0].detected = true;
            patterns[0].confidence = Math.max(0, Math.round(100 - (diff / p1 * 100 * 10)));
          }
        }
      }
    }
  }

  // Double Top
  for (let i = 0; i < maxima.length - 1; i++) {
    for (let j = i + 1; j < maxima.length; j++) {
      const idx1 = maxima[i], idx2 = maxima[j];
      if (idx2 - idx1 >= 8) {
        const p1 = data[idx1], p2 = data[idx2];
        const diff = Math.abs(p1 - p2);
        if (diff / p1 <= 0.03) {
          const hasMinBetween = minima.some(m => m > idx1 && m < idx2);
          if (hasMinBetween) {
            patterns[1].detected = true;
            patterns[1].confidence = Math.max(0, Math.round(100 - (diff / p1 * 100 * 10)));
          }
        }
      }
    }
  }

  // Head and Shoulders
  for (let i = 0; i < maxima.length - 2; i++) {
    const idx1 = maxima[i], idx2 = maxima[i+1], idx3 = maxima[i+2];
    const p1 = data[idx1], p2 = data[idx2], p3 = data[idx3];
    if (p2 > p1 && p2 > p3) {
      if (Math.abs(p1 - p3) / p1 <= 0.05) {
        patterns[2].detected = true;
        patterns[2].confidence = 85;
      }
    }
  }

  // Inverse H&S
  for (let i = 0; i < minima.length - 2; i++) {
    const idx1 = minima[i], idx2 = minima[i+1], idx3 = minima[i+2];
    const p1 = data[idx1], p2 = data[idx2], p3 = data[idx3];
    if (p2 < p1 && p2 < p3) {
      if (Math.abs(p1 - p3) / p1 <= 0.05) {
        patterns[3].detected = true;
        patterns[3].confidence = 85;
      }
    }
  }

  // Cup with Handle
  const cupData = data.slice(0, 40);
  const cupMin = Math.min(...cupData);
  const handleData = data.slice(40, 55);
  const handleMin = Math.min(...handleData);
  if (cupMin < data[0] * 0.95 && cupMin < data[39] * 0.95) {
    if (handleMin > cupMin && handleMin < data[39]) {
      patterns[4].detected = true;
      patterns[4].confidence = 75;
    }
  }

  // Channels
  let sumX = 0, sumY = 0, sumXY = 0, sumX2 = 0;
  const n = data.length;
  for (let i = 0; i < n; i++) {
    sumX += i; sumY += data[i]; sumXY += i * data[i]; sumX2 += i * i;
  }
  const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);

  if (slope > 0.05) {
    patterns[5].detected = true;
    patterns[5].confidence = Math.min(100, Math.round(50 + slope * 500));
  }
  if (slope < -0.05) {
    patterns[6].detected = true;
    patterns[6].confidence = Math.min(100, Math.round(50 + Math.abs(slope) * 500));
  }

  return patterns;
}
