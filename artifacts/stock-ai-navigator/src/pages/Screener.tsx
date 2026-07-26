import { useState, useMemo } from 'react';
import { useLocation } from 'wouter';
import stockDataJson from '@/stocks.json';
import { computeAIScores, getRecommendation, computeRiskScore } from '@/lib/aiAnalysis';
import { BottomNav } from '@/components/BottomNav';
import { Stock, ScreenerFilters } from '@/lib/types';
import { ErrorBoundary } from '@/components/ErrorBoundary';

const allStocks: Stock[] = stockDataJson.stocks as Stock[];

export default function Screener() {
  const [, setLocation] = useLocation();
  const [showFilters, setShowFilters] = useState(true);
  const [filters, setFilters] = useState<ScreenerFilters>({
    minRSI: 0, maxRSI: 100,
    macdDirection: 'any',
    minAIScore: 0, maxAIScore: 100,
    smaAlignment: 'any',
    sector: ''
  });

  const filteredStocks = useMemo(() => {
    return allStocks.filter(stock => {
      const aiScores = computeAIScores(stock);
      const lastH = stock.history[stock.history.length - 1];
      const rsi = lastH?.rsi || stock.indicators.rsi;
      const macd = lastH?.macd || stock.indicators.macd;
      
      if (rsi < filters.minRSI || rsi > filters.maxRSI) return false;
      if (filters.macdDirection === 'bullish' && macd <= 0) return false;
      if (filters.macdDirection === 'bearish' && macd >= 0) return false;
      if (aiScores.overall < filters.minAIScore || aiScores.overall > filters.maxAIScore) return false;
      
      if (filters.smaAlignment !== 'any') {
        const isBullish = lastH && stock.price > lastH.sma5 && lastH.sma5 > lastH.sma25;
        if (filters.smaAlignment === 'bullish' && !isBullish) return false;
        if (filters.smaAlignment === 'bearish' && isBullish) return false;
      }
      
      if (filters.sector && filters.sector !== '') {
        const sectorMap: Record<string, string> = { "7203": "輸送用機器", "8306": "銀行業", "9984": "情報・通信業", "4881": "医薬品" };
        if (sectorMap[stock.code] !== filters.sector) return false;
      }
      
      return true;
    });
  }, [filters]);

  const updateFilter = <K extends keyof ScreenerFilters>(key: K, value: ScreenerFilters[K]) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const resetFilters = () => {
    setFilters({
      minRSI: 0, maxRSI: 100,
      macdDirection: 'any',
      minAIScore: 0, maxAIScore: 100,
      smaAlignment: 'any',
      sector: ''
    });
  };

  return (
    <ErrorBoundary>
      <header className="hero">
        <div>
          <p className="eyebrow">STOCK AI NAVIGATOR PRO</p>
          <h1>スクリーナー</h1>
          <p className="sub">マルチファクターで最適銘柄を抽出</p>
        </div>
      </header>

      <main className="container" style={{ paddingTop: '20px' }}>
        <div className="card mb-6">
          <div className="flex justify-between items-center cursor-pointer" onClick={() => setShowFilters(!showFilters)}>
            <h3 className="m-0 font-bold flex items-center gap-2">
              <span className="text-xl">⚙️</span> フィルター設定
            </h3>
            <button className="text-sm font-bold text-indigo-600 dark:text-indigo-400 bg-transparent border-0 p-0">{showFilters ? '閉じる' : '開く'}</button>
          </div>
          
          {showFilters && (
            <div className="mt-4 pt-4 border-t border-gray-100 dark:border-gray-800 flex flex-col gap-4">
              <div>
                <label className="block text-xs font-bold text-gray-500 mb-1.5">RSI範囲</label>
                <div className="flex items-center gap-2">
                  <input type="number" value={filters.minRSI} onChange={e => updateFilter('minRSI', Number(e.target.value))} className="w-20 p-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-transparent text-sm font-bold" />
                  <span className="text-gray-400">〜</span>
                  <input type="number" value={filters.maxRSI} onChange={e => updateFilter('maxRSI', Number(e.target.value))} className="w-20 p-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-transparent text-sm font-bold" />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-500 mb-1.5">MACD方向</label>
                <div className="flex gap-2">
                  <button onClick={() => updateFilter('macdDirection', 'any')} className={`px-3 py-1.5 rounded-lg text-sm font-bold ${filters.macdDirection === 'any' ? 'bg-indigo-600 text-white' : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300'}`}>全て</button>
                  <button onClick={() => updateFilter('macdDirection', 'bullish')} className={`px-3 py-1.5 rounded-lg text-sm font-bold ${filters.macdDirection === 'bullish' ? 'bg-indigo-600 text-white' : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300'}`}>買い</button>
                  <button onClick={() => updateFilter('macdDirection', 'bearish')} className={`px-3 py-1.5 rounded-lg text-sm font-bold ${filters.macdDirection === 'bearish' ? 'bg-indigo-600 text-white' : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300'}`}>売り</button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-500 mb-1.5">AIスコア</label>
                <div className="flex items-center gap-2">
                  <input type="number" value={filters.minAIScore} onChange={e => updateFilter('minAIScore', Number(e.target.value))} className="w-20 p-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-transparent text-sm font-bold" />
                  <span className="text-gray-400">〜</span>
                  <input type="number" value={filters.maxAIScore} onChange={e => updateFilter('maxAIScore', Number(e.target.value))} className="w-20 p-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-transparent text-sm font-bold" />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-500 mb-1.5">SMAアライメント</label>
                <div className="flex gap-2 flex-wrap">
                  <button onClick={() => updateFilter('smaAlignment', 'any')} className={`px-3 py-1.5 rounded-lg text-sm font-bold ${filters.smaAlignment === 'any' ? 'bg-indigo-600 text-white' : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300'}`}>全て</button>
                  <button onClick={() => updateFilter('smaAlignment', 'bullish')} className={`px-3 py-1.5 rounded-lg text-sm font-bold ${filters.smaAlignment === 'bullish' ? 'bg-indigo-600 text-white' : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300'}`}>上昇配列</button>
                  <button onClick={() => updateFilter('smaAlignment', 'bearish')} className={`px-3 py-1.5 rounded-lg text-sm font-bold ${filters.smaAlignment === 'bearish' ? 'bg-indigo-600 text-white' : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300'}`}>下降配列</button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-500 mb-1.5">セクター</label>
                <select value={filters.sector} onChange={e => updateFilter('sector', e.target.value)} className="w-full p-2.5 rounded-lg border border-gray-200 dark:border-gray-700 bg-transparent text-sm font-bold outline-none focus:border-indigo-500">
                  <option value="">全て</option>
                  <option value="輸送用機器">輸送用機器</option>
                  <option value="銀行業">銀行業</option>
                  <option value="情報・通信業">情報・通信業</option>
                  <option value="医薬品">医薬品</option>
                </select>
              </div>

              <div className="pt-2">
                <button onClick={resetFilters} className="w-full py-2.5 bg-gray-200 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-lg font-bold text-sm hover:bg-gray-300 dark:hover:bg-gray-700 transition-colors">フィルタークリア</button>
              </div>
            </div>
          )}
        </div>

        <div className="mb-4 flex items-center justify-between px-1">
          <h3 className="m-0 font-bold">検索結果</h3>
          <span className="text-sm font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-900/20 px-3 py-1 rounded-full">{filteredStocks.length} 銘柄がヒット</span>
        </div>

        <div className="grid grid-cols-2 gap-3 mb-6">
          {filteredStocks.map(stock => {
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
        
        {filteredStocks.length === 0 && (
          <div className="card text-center py-12">
            <p className="text-gray-500 font-bold mb-2">条件に一致する銘柄がありません</p>
            <button onClick={resetFilters} className="text-sm text-indigo-600 dark:text-indigo-400 font-bold bg-transparent border-0 p-0 underline">フィルターをリセット</button>
          </div>
        )}
      </main>

      <BottomNav />
    </ErrorBoundary>
  );
}
