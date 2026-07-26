import { useState, KeyboardEvent, useEffect, useMemo } from 'react';
import { StockChart } from '@/components/StockChart';
import stockDataJson from '@/stocks.json';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { BottomNav } from '@/components/BottomNav';
import { ScoreBar } from '@/components/ScoreBar';
import { SentimentBadge } from '@/components/SentimentBadge';
import { computeAIScores, getRecommendation, detectChartPatterns, computeRiskScore } from '@/lib/aiAnalysis';
import { computeTechnicals, computeVWAP, computeATR, computeEntryPoints } from '@/lib/technicals';
import { getFavorites, toggleFavorite } from '@/lib/storage';
import { Stock } from '@/lib/types';

const allStocks: Stock[] = stockDataJson.stocks as Stock[];

function seeded(seed: string) {
  let h = 2166136261;
  for (const c of seed) h = Math.imul(h ^ c.charCodeAt(0), 16777619);
  return () => ((h = Math.imul(h ^ (h >>> 15), 2246822519)) >>> 0) / 4294967296;
}

function generateSeededData(seed: string) {
  const rnd = seeded(seed);
  let v = 100;
  const data: number[] = [];
  for (let i = 0; i < 70; i++) {
    v += (rnd() - 0.46) * 4;
    data.push(v);
  }
  return data;
}

export default function Home() {
  const [theme, setTheme] = useState<'light' | 'dark'>('light');
  const [searchQuery, setSearchQuery] = useState('');
  const [currentStock, setCurrentStock] = useState<Stock | null>(null);
  const [period, setPeriod] = useState('3か月');
  const [bollinger, setBollinger] = useState(false);
  const [chartMode, setChartMode] = useState<'line' | 'candle'>('line');
  const [showVWAP, setShowVWAP] = useState(false);
  const [showSMA200, setShowSMA200] = useState(false);
  const [favorites, setFavorites] = useState<string[]>([]);
  const [isOffline, setIsOffline] = useState(false);
  const [searchAttempted, setSearchAttempted] = useState(false);
  const [newsKey, setNewsKey] = useState(0);

  useEffect(() => {
    setIsOffline(!navigator.onLine);
    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    setFavorites(getFavorites());
    
    const params = new URLSearchParams(window.location.search);
    const code = params.get('code');
    if (code) {
      const found = allStocks.find((s) => s.code === code);
      if (found) {
        setCurrentStock(found);
      }
    } else {
      setCurrentStock(allStocks[0] || null);
    }
    
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [theme]);

  const toggleTheme = () => {
    setTheme((prev) => (prev === 'light' ? 'dark' : 'light'));
  };

  const handleSearch = () => {
    const q = searchQuery.trim();
    if (!q) return;
    setSearchAttempted(true);
    const found = allStocks.find((s) => s.code === q || s.name.includes(q));
    if (found) {
      setCurrentStock(found);
    } else {
      setCurrentStock(null);
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  const handleToggleFavorite = () => {
    if (currentStock) {
      toggleFavorite(currentStock.code);
      setFavorites(getFavorites());
    }
  };

  const patterns = useMemo(() => {
    if (!currentStock) return [];
    return detectChartPatterns(generateSeededData(currentStock.code + period));
  }, [currentStock, period]);

  if (!currentStock && searchAttempted) {
    return (
      <ErrorBoundary>
        <div className="container mt-8" data-testid="not-found-message">
          <div className="card border-red-500 p-8 text-center">
            <p className="text-red-500 font-bold mb-4">「{searchQuery}」は見つかりませんでした。<br/>別のコードで検索してください。</p>
            <button 
              onClick={() => { setSearchAttempted(false); setCurrentStock(allStocks[0] || null); }} 
              className="px-4 py-2 bg-gray-200 dark:bg-gray-800 text-gray-800 dark:text-gray-200 rounded-lg font-bold"
            >
              戻る
            </button>
          </div>
        </div>
        <BottomNav />
      </ErrorBoundary>
    );
  } else if (!currentStock) {
    return (
      <ErrorBoundary>
         <LoadingSpinner message="データを読み込み中..." />
         <BottomNav />
      </ErrorBoundary>
    );
  }

  const isUp = currentStock.change >= 0;
  const changeSign = isUp ? '+' : '';
  const priceStr = currentStock.price.toLocaleString('en-US', {
    minimumFractionDigits: Number.isInteger(currentStock.price) ? 0 : 1,
    maximumFractionDigits: 1,
  }) + '円';
  const changePctStr = changeSign + currentStock.changePct.toFixed(2) + '%';

  const aiScores = computeAIScores(currentStock);
  const recommendation = getRecommendation(aiScores.overall);
  const riskScore = computeRiskScore(currentStock);
  const technicals = computeTechnicals(currentStock);
  
  const periodBars: Record<string, number> = { '1か月': 22, '3か月': 66, '6か月': 130, '1年': 260 };
  const bars = periodBars[period] || 66;
  const vwap = computeVWAP(currentStock, bars);
  const atr = computeATR(currentStock, 14);
  const entries = computeEntryPoints(currentStock, technicals);
  const slicedHistory = currentStock.history.slice(Math.max(0, currentStock.history.length - bars));

  const isFavorite = favorites.includes(currentStock.code);
  
  const posCount = currentStock.news?.filter(n => n.sentiment === 'ポジティブ').length || 0;
  const neuCount = currentStock.news?.filter(n => n.sentiment === '中立').length || 0;
  const negCount = currentStock.news?.filter(n => n.sentiment === 'ネガティブ').length || 0;
  
  const counts = [];
  if (posCount > 0) counts.push(`${posCount}件のポジティブ`);
  if (neuCount > 0) counts.push(`${neuCount}件の中立`);
  if (negCount > 0) counts.push(`${negCount}件のネガティブ`);
  
  let newsSummary = counts.length > 0 ? `${counts.join('、')}ニュースを検出。` : "関連ニュースはありません。";
  if (counts.length > 0) {
    if (posCount > negCount) newsSummary += "全体的に強気シグナル。";
    else if (negCount > posCount) newsSummary += "全体的に弱気シグナル。";
    else newsSummary += "全体的に中立シグナル。";
  }

  const rsi = technicals.rsi;
  const rsiText = rsi > 70 ? '買われすぎ' : rsi < 30 ? '売られすぎ' : '中立';
  
  const macdVal = technicals.macd;
  const macdText = macdVal > 0 ? '買い' : '売り';
  const macdSub = macdVal > 0 ? '上向き' : '下向き';

  const volRatio = currentStock.indicators.volumeRatio;
  const volText = volRatio > 1 ? '増加' : '減少';
  const volSub = `前週比 ${volRatio > 1 ? '+' : ''}${((volRatio - 1) * 100).toFixed(0)}%`;

  const dev25 = currentStock.indicators.deviation25;
  const devText = dev25 > 0 ? '上向き' : '下向き';
  const devSub = dev25 > 0 ? '株価は上側' : '株価は下側';

  return (
    <ErrorBoundary>
      {isOffline && (
        <div className="fixed top-0 left-0 right-0 bg-yellow-400 text-yellow-900 px-4 py-2 text-center text-sm font-bold z-50 shadow-md">
          オフライン：データを更新できません
        </div>
      )}
      <header className="hero">
        <div>
          <p className="eyebrow">
            STOCK AI NAVIGATOR PRO 
            <span className="inline-block ml-2 px-2 py-0.5 bg-white/20 rounded-full text-[10px] align-middle tracking-normal font-bold shadow-sm">v4.1</span>
          </p>
          <h1>日本株を、見やすく分析。</h1>
          <p className="sub">チャート・テクニカル・短期シナリオを1画面で確認</p>
        </div>
        <button 
          id="themeBtn" 
          className="iconBtn" 
          aria-label="テーマ切替"
          data-testid="theme-toggle"
          onClick={toggleTheme}
        >
          ◐
        </button>
      </header>

      <main className="container">
        <section className="searchCard card">
          <input 
            id="searchInput" 
            type="search" 
            placeholder="証券コード・会社名で検索（例：7203）" 
            data-testid="search-input"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={handleKeyDown}
          />
          <button 
            id="searchBtn" 
            data-testid="search-button"
            onClick={handleSearch}
          >
            表示
          </button>
        </section>

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
          <article className="market green">
            <span>ドル円</span>
            <strong>146.32</strong>
            <small>-0.18%</small>
          </article>
        </section>

        <section className="card stockHead">
          <div>
            <p id="stockCode" className="muted" data-testid="stock-code">{currentStock.code}</p>
            <div className="flex items-center gap-2">
              <h2 id="stockName" data-testid="stock-name" className="m-0 text-xl font-bold">{currentStock.name}</h2>
              <button 
                data-testid="favorite-toggle" 
                onClick={handleToggleFavorite}
                className="text-2xl text-yellow-500 focus:outline-none transition-transform hover:scale-110 active:scale-95"
                style={{ background: 'transparent', border: 'none', cursor: 'pointer', padding: 0 }}
              >
                {isFavorite ? '★' : '☆'}
              </button>
            </div>
          </div>
          <div className="priceBox">
            <strong id="stockPrice" data-testid="stock-price">{priceStr}</strong>
            <span id="stockChange" className={isUp ? 'up' : 'down'} data-testid="stock-change">
              {changePctStr}
            </span>
          </div>
        </section>

        <section className="scoreGrid">
          <article className="card scoreCard relative overflow-hidden">
            <div className="flex justify-between items-start mb-2">
               <span className="text-sm font-bold text-gray-500 dark:text-gray-400">AI総合評価</span>
               <div className="text-right">
                 <span className="text-xl font-extrabold block" style={{ color: recommendation.color }}>{recommendation.label}</span>
               </div>
            </div>
            <strong id="score" data-testid="ai-score" style={{ color: recommendation.color, fontSize: '52px', lineHeight: 1 }}>{aiScores.overall}</strong>
            <small className="text-gray-400 ml-1 font-bold">/100</small>
            
            <div className="text-2xl tracking-wider mt-1" style={{ color: recommendation.color }}>
              {'★'.repeat(recommendation.stars)}{'☆'.repeat(5 - recommendation.stars)}
            </div>
            <div className="text-xs font-bold text-gray-500 mt-0.5">{recommendation.labelEn}</div>
            
            <div className="mt-5 text-left flex flex-col gap-1.5">
              <ScoreBar label="テクニカル" score={aiScores.technical} />
              <ScoreBar label="ファンダメンタル" score={aiScores.fundamental} />
              <ScoreBar label="モメンタム" score={aiScores.momentum} />
              <ScoreBar label="ニュース" score={aiScores.news} />
            </div>

            <div className="mt-4 pt-4 border-t border-gray-100 dark:border-gray-800 text-left">
              <div className="flex justify-between items-center">
                <span className="text-xs font-bold text-gray-500">AIリスクスコア</span>
                <span className="font-extrabold text-sm" style={{ color: riskScore.color }}>{riskScore.label}</span>
              </div>
              <div className="mt-1 h-2 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                <div className="h-full rounded-full transition-all" style={{ width: `${riskScore.value}%`, backgroundColor: riskScore.color }} />
              </div>
              <div className="text-xs text-gray-400 mt-1 font-bold">ボラティリティ {riskScore.volatility.toFixed(2)}%</div>
            </div>
          </article>
          <article className="card signalCard flex flex-col justify-center gap-3">
            <div>
              <span className="text-sm font-bold">上昇</span>
              <strong id="upProb" data-testid="up-prob">{currentStock.probabilities.up}%</strong>
            </div>
            <div>
              <span className="text-sm font-bold">横ばい</span>
              <strong id="flatProb" data-testid="flat-prob">{currentStock.probabilities.flat}%</strong>
            </div>
            <div>
              <span className="text-sm font-bold">下落</span>
              <strong id="downProb" data-testid="down-prob">{currentStock.probabilities.down}%</strong>
            </div>
          </article>
        </section>

        <section className="card">
          <div className="sectionTitle">
            <h3>株価チャート</h3>
            <div className="flex items-center gap-2 flex-wrap justify-end">
              <label className="text-[10px] flex items-center gap-1 cursor-pointer font-bold bg-gray-100 dark:bg-gray-800 px-1.5 py-1 rounded select-none hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors">
                <input type="checkbox" checked={chartMode === 'candle'} onChange={(e) => setChartMode(e.target.checked ? 'candle' : 'line')} className="accent-indigo-500" />
                ローソク足
              </label>
              <label className="text-[10px] flex items-center gap-1 cursor-pointer font-bold bg-gray-100 dark:bg-gray-800 px-1.5 py-1 rounded select-none hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors">
                <input type="checkbox" checked={bollinger} onChange={(e) => setBollinger(e.target.checked)} className="accent-indigo-500" />
                BB
              </label>
              {chartMode === 'candle' && (
                <>
                  <label className="text-[10px] flex items-center gap-1 cursor-pointer font-bold bg-gray-100 dark:bg-gray-800 px-1.5 py-1 rounded select-none hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors">
                    <input type="checkbox" checked={showVWAP} onChange={(e) => setShowVWAP(e.target.checked)} className="accent-indigo-500" />
                    VWAP
                  </label>
                  <label className="text-[10px] flex items-center gap-1 cursor-pointer font-bold bg-gray-100 dark:bg-gray-800 px-1.5 py-1 rounded select-none hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors">
                    <input type="checkbox" checked={showSMA200} onChange={(e) => setShowSMA200(e.target.checked)} className="accent-indigo-500" />
                    SMA200
                  </label>
                </>
              )}
            </div>
          </div>
          <div className="periods" id="periods">
            <span id="periodLabel" className="font-bold mr-2 text-sm text-gray-500 hidden">{period}</span>
            {['1か月', '3か月', '6か月', '1年'].map((p) => (
              <button 
                key={p}
                className={period === p ? 'active' : ''} 
                data-period={p}
                data-testid={`period-button-${p}`}
                onClick={() => setPeriod(p)}
              >
                {p}
              </button>
            ))}
          </div>
          <StockChart 
            seed={`${currentStock.code}${period}`} 
            bollinger={bollinger} 
            mode={chartMode} 
            history={slicedHistory} 
            showVWAP={showVWAP} 
            showSMA200={showSMA200} 
          />
          <div className="legend font-bold flex flex-wrap gap-x-4 gap-y-2">
            {chartMode === 'candle' ? (
              <>
                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-red-500 block"></span>SMA5</span>
                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-blue-600 block"></span>SMA25</span>
                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-emerald-500 block"></span>SMA75</span>
                {showVWAP && <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-cyan-500 block"></span>VWAP</span>}
                {showSMA200 && <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-orange-500 block"></span>SMA200</span>}
                {bollinger && <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-purple-500 block"></span>ボリンジャー</span>}
              </>
            ) : (
              <>
                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-red-500 block"></span>5日線</span>
                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-blue-600 block"></span>25日線</span>
                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-emerald-500 block"></span>75日線</span>
                {bollinger && <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-purple-500 block"></span>ボリンジャー</span>}
              </>
            )}
          </div>
        </section>

        <section className="card">
          <div className="sectionTitle">
            <h3>AIチャートパターン検出</h3>
            <span>自動判定</span>
          </div>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {patterns.map(p => (
              <div key={p.nameEn} className={`rounded-xl p-3 border ${p.detected ? (p.bullish ? 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800' : 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800') : 'bg-gray-50 dark:bg-gray-800/50 border-gray-100 dark:border-gray-800 opacity-60'}`}>
                <div className="text-xs font-bold text-gray-500">{p.nameEn}</div>
                <div className="text-sm font-extrabold mt-0.5" style={{ color: p.detected ? (p.bullish ? '#10b981' : '#ef4444') : '#9ca3af' }}>
                  {p.name}
                </div>
                {p.detected && <div className="text-xs mt-1 font-bold text-gray-500">確信度 {p.confidence}%</div>}
              </div>
            ))}
          </div>
        </section>

        <section className="card">
          <div className="sectionTitle">
            <h3>サポート・レジスタンス</h3>
            <span>自動算出</span>
          </div>
          <div className="forecastRows font-bold">
            <div>
              <span className="text-gray-600 dark:text-gray-400">サポート</span>
              <strong className="text-emerald-600 dark:text-emerald-400 text-lg">{technicals.support.toLocaleString()}円</strong>
            </div>
            <div>
              <span className="text-gray-600 dark:text-gray-400">レジスタンス</span>
              <strong className="text-red-500 dark:text-red-400 text-lg">{technicals.resistance.toLocaleString()}円</strong>
            </div>
          </div>
        </section>

        <section className="card">
          <div className="sectionTitle">
            <h3>エントリー提案</h3>
            <span>AI算出</span>
          </div>
          <div className="forecastRows font-bold">
            <div>
              <span className="text-gray-600 dark:text-gray-400">積極エントリー</span>
              <strong className="text-blue-600">{entries.aggressive.toLocaleString()}円</strong>
            </div>
            <div>
              <span className="text-gray-600 dark:text-gray-400">標準エントリー</span>
              <strong>{entries.moderate.toLocaleString()}円</strong>
            </div>
            <div>
              <span className="text-gray-600 dark:text-gray-400">保守エントリー</span>
              <strong className="text-gray-500">{entries.conservative.toLocaleString()}円</strong>
            </div>
            <div>
              <span className="text-gray-600 dark:text-gray-400">目標①</span>
              <strong className="text-emerald-600">{entries.target1.toLocaleString()}円</strong>
            </div>
            <div>
              <span className="text-gray-600 dark:text-gray-400">目標②</span>
              <strong className="text-emerald-600">{entries.target2.toLocaleString()}円</strong>
            </div>
            <div>
              <span className="text-gray-600 dark:text-gray-400">損切り</span>
              <strong className="text-red-500">{entries.stopLoss.toLocaleString()}円</strong>
            </div>
            <div>
              <span className="text-gray-600 dark:text-gray-400">リスクリワード比</span>
              <strong className={entries.riskReward >= 2 ? 'text-emerald-600' : entries.riskReward >= 1 ? 'text-amber-500' : 'text-red-500'}>
                1:{entries.riskReward.toFixed(1)}
              </strong>
            </div>
          </div>
        </section>

        <section className="card">
          <div className="sectionTitle">
            <h3>関連ニュース分析</h3>
            <button onClick={() => setNewsKey(n => n + 1)} className="text-xs bg-gray-100 dark:bg-gray-800 px-3 py-1 rounded font-bold hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors">更新</button>
          </div>
          <div key={newsKey} className="bg-gray-50 dark:bg-gray-800/50 p-3 rounded-lg mb-4 text-sm font-bold text-gray-700 dark:text-gray-300 leading-relaxed border border-gray-100 dark:border-gray-800 animate-in fade-in slide-in-from-top-1 duration-300">
            {newsSummary}
          </div>
          <div className="flex flex-col gap-4">
            {currentStock.news?.map((item, idx) => (
              <div key={idx} className="border-b border-gray-100 dark:border-gray-800 pb-3 last:border-0 last:pb-0">
                <div className="mb-2"><SentimentBadge sentiment={item.sentiment} /></div>
                <h4 className="font-bold text-sm mb-1 text-gray-900 dark:text-gray-100">{item.title}</h4>
                <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed font-medium">{item.summary}</p>
              </div>
            ))}
            {(!currentStock.news || currentStock.news.length === 0) && (
              <p className="text-sm text-gray-500 font-bold text-center py-4">最新のニュースはありません。</p>
            )}
          </div>
        </section>

        <section className="card">
          <div className="sectionTitle">
            <h3>テクニカル分析</h3>
            <span>自動判定</span>
          </div>
          <div className="metrics font-bold">
            <div>
              <span>RSI</span>
              <strong className="text-lg">{rsi.toFixed(1)}</strong>
              <small>{rsiText}</small>
            </div>
            <div>
              <span>MACD</span>
              <strong className="text-lg">{macdText}</strong>
              <small>{macdSub}</small>
            </div>
            <div>
              <span>VWAP</span>
              <strong className="text-lg">{vwap.toLocaleString()}円</strong>
              <small>{currentStock.price > vwap ? '株価↑' : '株価↓'}</small>
            </div>
            <div>
              <span>ATR(14)</span>
              <strong className="text-lg">{atr.toFixed(1)}</strong>
              <small>ボラティリティ</small>
            </div>
            <div>
              <span>出来高</span>
              <strong className="text-lg">{volText}</strong>
              <small>{volSub}</small>
            </div>
            <div>
              <span>25日線</span>
              <strong className="text-lg">{devText}</strong>
              <small>{devSub}</small>
            </div>
          </div>
        </section>

        <section className="card forecast">
          <div className="sectionTitle">
            <h3>直近シナリオ</h3>
            <span>参考値</span>
          </div>
          <div className="forecastRows font-bold">
            <div>
              <span className="text-gray-600 dark:text-gray-400">翌営業日</span>
              <strong className="text-lg">
                {currentStock.forecasts.next.low.toLocaleString()}〜{currentStock.forecasts.next.high.toLocaleString()}円
              </strong>
            </div>
            <div>
              <span className="text-gray-600 dark:text-gray-400">5営業日</span>
              <strong className="text-lg">
                {currentStock.forecasts.five.low.toLocaleString()}〜{currentStock.forecasts.five.high.toLocaleString()}円
              </strong>
            </div>
            <div>
              <span className="text-gray-600 dark:text-gray-400">20営業日</span>
              <strong className="text-lg">
                {currentStock.forecasts.twenty.low.toLocaleString()}〜{currentStock.forecasts.twenty.high.toLocaleString()}円
              </strong>
            </div>
          </div>
          <p className="note mt-3 font-bold">
            予測値はサンプルデータとテクニカル評価による参考表示です。将来の値動きを保証しません。
          </p>
        </section>
      </main>

      <BottomNav />
    </ErrorBoundary>
  );
}
