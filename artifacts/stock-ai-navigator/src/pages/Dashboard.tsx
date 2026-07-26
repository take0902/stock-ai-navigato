import { useState } from 'react';
import { useLocation } from 'wouter';
import stockDataJson from '@/stocks.json';
import { computeAIScores, computeStockRankings, getRecommendation, computeRiskScore } from '@/lib/aiAnalysis';
import { BottomNav } from '@/components/BottomNav';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { Stock, RankingTimeframe } from '@/lib/types';

const allStocks: Stock[] = stockDataJson.stocks as Stock[];

export default function Dashboard() {
  const [, setLocation] = useLocation();
  const [rankTab, setRankTab] = useState<RankingTimeframe>('mid');
  
  const rankings = computeStockRankings(allStocks, rankTab);
  const averageScore = allStocks.reduce((sum, stock) => sum + computeAIScores(stock).overall, 0) / allStocks.length;
  
  const sentiment = averageScore > 65 ? { label: '強気', color: 'green' } : averageScore < 45 ? { label: '弱気', color: 'red' } : { label: '中立', color: 'amber' };

  return (
    <ErrorBoundary>
      <header className="hero">
        <div>
          <p className="eyebrow">
            STOCK AI NAVIGATOR PRO 
            <span className="inline-block ml-2 px-2 py-0.5 bg-white/20 rounded-full text-[10px] align-middle tracking-normal font-bold shadow-sm">v4.1</span>
          </p>
          <h1>マーケットダッシュボード</h1>
          <p className="sub">AIが分析する今日の日本株市場</p>
        </div>
      </header>

      <main className="container">
        <section className="marketGrid">
          <article className="market red">
            <span>日経平均</span>
            <strong>39,820.10</strong>
            <small>+0.84%</small>
          </article>
          <article className="market blue">
            <span>TOPIX</span>
            <strong>2,842.66</strong>
            <small>+0.52%</small>
          </article>
          <article className={`market ${sentiment.color}`}>
            <span>市場センチメント</span>
            <strong>{sentiment.label}</strong>
            <small>平均スコア {averageScore.toFixed(1)}</small>
          </article>
        </section>

        <section className="mb-6">
          <div className="flex justify-between items-center mb-3">
            <h3 className="m-0 font-bold text-lg">AI銘柄ランキング</h3>
          </div>
          <div className="flex gap-2 mb-3 bg-gray-100 dark:bg-gray-800 p-1 rounded-lg">
            {(['short', 'mid', 'long'] as RankingTimeframe[]).map(tab => (
              <button 
                key={tab}
                className={`flex-1 py-1.5 text-xs font-bold rounded-md transition-colors ${rankTab === tab ? 'bg-white dark:bg-gray-700 shadow-sm text-indigo-600 dark:text-indigo-400' : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'}`}
                onClick={() => setRankTab(tab)}
              >
                {tab === 'short' ? '短期' : tab === 'mid' ? '中期' : '長期'}
              </button>
            ))}
          </div>
          <div className="flex flex-col gap-2">
            {rankings.map(r => (
              <div key={r.code} className="card !mb-0 !p-3 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors" onClick={() => setLocation('/stock?code=' + r.code)}>
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full flex items-center justify-center font-extrabold text-sm flex-shrink-0"
                       style={{ background: r.rank === 1 ? '#f59e0b' : r.rank === 2 ? '#9ca3af' : r.rank === 3 ? '#cd7c2f' : '#e5e7eb', color: r.rank <= 3 ? '#fff' : '#374151' }}>
                    {r.rank}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-extrabold text-sm truncate">{r.name}</div>
                    <div className="text-xs text-gray-500 font-bold">{r.code}</div>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <div className="font-extrabold text-sm" style={{ color: getRecommendation(r.score).color }}>{r.recommendation}</div>
                    <div className={`text-xs font-bold ${r.changePct >= 0 ? 'text-red-500' : 'text-blue-500'}`}>
                      {r.changePct >= 0 ? '+' : ''}{r.changePct.toFixed(2)}%
                    </div>
                  </div>
                </div>
                <div className="mt-2">
                  <div className="flex justify-between text-xs text-gray-400 font-bold mb-0.5">
                    <span>AIスコア</span><span>{r.score}/100</span>
                  </div>
                  <div className="h-1.5 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                    <div className="h-full rounded-full transition-all" style={{ width: `${r.score}%`, backgroundColor: getRecommendation(r.score).color }} />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="mb-6">
          <h3 className="m-0 font-bold text-lg mb-3">注目銘柄ボード</h3>
          <div className="grid grid-cols-2 gap-3">
            {allStocks.map(stock => {
              const scores = computeAIScores(stock);
              const rec = getRecommendation(scores.overall);
              const risk = computeRiskScore(stock);
              return (
                <div key={stock.code} className="card !mb-0 !p-3 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors" onClick={() => setLocation('/stock?code=' + stock.code)}>
                  <div className="text-xs font-bold text-gray-400">{stock.code}</div>
                  <div className="font-extrabold text-sm truncate mt-0.5" title={stock.name}>{stock.name.length > 8 ? stock.name.slice(0,8)+'…' : stock.name}</div>
                  <div className="text-lg font-extrabold mt-1">{stock.price.toLocaleString()}<span className="text-[10px] ml-0.5">円</span></div>
                  <div className={`text-xs font-bold ${stock.change >= 0 ? 'text-red-500' : 'text-blue-500'}`}>
                    {stock.change >= 0 ? '+' : ''}{stock.changePct.toFixed(2)}%
                  </div>
                  <div className="flex items-center justify-between mt-2.5 pt-2 border-t border-gray-100 dark:border-gray-800">
                    <span className="text-[10px] font-bold" style={{ color: rec.color }}>{rec.label}</span>
                    <span className="text-[10px] font-bold" style={{ color: risk.color }}>{risk.label}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

      </main>

      <BottomNav />
    </ErrorBoundary>
  );
}
