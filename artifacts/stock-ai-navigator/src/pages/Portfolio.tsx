import { useEffect, useState, FormEvent } from 'react';
import { getPortfolio, savePortfolio, addHolding, removeHolding, Holding } from '@/lib/storage';
import stockDataJson from '@/stocks.json';
import { computeAIScores } from '@/lib/aiAnalysis';
import { BottomNav } from '@/components/BottomNav';
import { Stock } from '@/lib/types';
import { ErrorBoundary } from '@/components/ErrorBoundary';

const allStocks: Stock[] = stockDataJson.stocks as Stock[];

export default function Portfolio() {
  const [holdings, setHoldings] = useState<Holding[]>([]);
  const [showForm, setShowForm] = useState(false);

  const [code, setCode] = useState('');
  const [shares, setShares] = useState('');
  const [avgCost, setAvgCost] = useState('');

  useEffect(() => {
    setHoldings(getPortfolio());
  }, []);

  const handleAdd = (e: FormEvent) => {
    e.preventDefault();
    const stock = allStocks.find(s => s.code === code);
    if (!stock) {
      alert('無効な証券コードです');
      return;
    }
    const s = parseInt(shares, 10);
    const cost = parseFloat(avgCost);
    if (isNaN(s) || isNaN(cost)) {
      alert('数値を入力してください');
      return;
    }

    addHolding({
      code: stock.code,
      name: stock.name,
      shares: s,
      avgCost: cost
    });
    setHoldings(getPortfolio());
    setCode('');
    setShares('');
    setAvgCost('');
    setShowForm(false);
  };

  const handleRemove = (codeToRemove: string) => {
    if (window.confirm('この保有銘柄を削除しますか？')) {
      removeHolding(codeToRemove);
      setHoldings(getPortfolio());
    }
  };

  let totalValue = 0;
  let totalCost = 0;
  
  const enrichedHoldings = holdings.map(h => {
    const stock = allStocks.find(s => s.code === h.code);
    const currentPrice = stock ? stock.price : h.avgCost;
    const value = currentPrice * h.shares;
    const cost = h.avgCost * h.shares;
    const profit = value - cost;
    const profitPct = cost > 0 ? (profit / cost) * 100 : 0;
    
    totalValue += value;
    totalCost += cost;

    let risk = "中";
    if (stock) {
      const aiScore = computeAIScores(stock).overall;
      if (aiScore > 70) risk = "低";
      else if (aiScore < 45) risk = "高";
    }

    return { ...h, currentPrice, profit, profitPct, risk, value };
  });

  const totalProfit = totalValue - totalCost;
  const totalProfitPct = totalCost > 0 ? (totalProfit / totalCost) * 100 : 0;

  return (
    <ErrorBoundary>
      <header className="hero">
        <div>
          <p className="eyebrow">STOCK AI NAVIGATOR PRO</p>
          <h1>ポートフォリオ</h1>
        </div>
      </header>

      <main className="container" style={{ paddingTop: '20px' }}>
        <div className="card mb-6">
          <div className="flex justify-between items-center mb-4">
            <h3 className="m-0 font-bold">保有状況</h3>
            <button 
              onClick={() => setShowForm(!showForm)}
              className="text-sm bg-indigo-600 hover:bg-indigo-700 text-white px-3 py-1.5 rounded-lg font-bold transition-colors"
            >
              {showForm ? 'キャンセル' : '保有株を追加'}
            </button>
          </div>

          {showForm && (
            <form onSubmit={handleAdd} className="bg-gray-50 dark:bg-gray-800 p-4 rounded-xl mb-4 flex flex-col gap-3">
              <input 
                type="text" 
                placeholder="証券コード (例: 7203)" 
                value={code} onChange={e => setCode(e.target.value)}
                className="w-full p-2.5 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 font-bold portfolio-input outline-none focus:border-indigo-500"
                required
              />
              <div className="flex gap-2">
                <input 
                  type="number" 
                  placeholder="株数" 
                  value={shares} onChange={e => setShares(e.target.value)}
                  className="flex-1 p-2.5 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 font-bold portfolio-input outline-none focus:border-indigo-500"
                  required
                />
                <input 
                  type="number" 
                  placeholder="取得単価 (円)" 
                  value={avgCost} onChange={e => setAvgCost(e.target.value)}
                  className="flex-1 p-2.5 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 font-bold portfolio-input outline-none focus:border-indigo-500"
                  required
                />
              </div>
              <button type="submit" className="w-full bg-indigo-600 hover:bg-indigo-700 text-white p-2.5 rounded-lg font-bold transition-colors mt-1">追加する</button>
            </form>
          )}

          <div className="bg-indigo-50 dark:bg-indigo-900/20 p-5 rounded-xl mb-4 border border-indigo-100 dark:border-indigo-800/50">
            <p className="text-sm font-bold text-gray-500 dark:text-indigo-300 mb-1">総評価額</p>
            <h2 className="text-4xl font-extrabold m-0 mb-3 text-indigo-900 dark:text-indigo-100 tracking-tight">¥{totalValue.toLocaleString()}</h2>
            <div className="flex justify-between items-end border-t border-indigo-200/50 dark:border-indigo-800 pt-3">
              <span className="text-sm font-bold text-gray-600 dark:text-indigo-300">総損益</span>
              <strong className={`text-xl ${totalProfit >= 0 ? 'text-red-500' : 'text-blue-500'}`}>
                {totalProfit >= 0 ? '+' : ''}¥{totalProfit.toLocaleString()} <span className="text-sm ml-1">({totalProfit >= 0 ? '+' : ''}{totalProfitPct.toFixed(2)}%)</span>
              </strong>
            </div>
          </div>

          <div className="mt-5">
            <p className="text-xs font-bold text-gray-500 mb-2">アロケーション (評価額比)</p>
            <div className="h-3 w-full bg-gray-200 dark:bg-gray-800 rounded-full flex overflow-hidden">
              {enrichedHoldings.map((h, i) => {
                const width = totalValue > 0 ? (h.value / totalValue) * 100 : 0;
                const colors = ['bg-indigo-500', 'bg-blue-500', 'bg-teal-500', 'bg-emerald-500', 'bg-orange-500'];
                return width > 0 ? (
                  <div key={h.code} style={{ width: `${width}%` }} className={colors[i % colors.length]} title={`${h.name} ${width.toFixed(1)}%`} />
                ) : null;
              })}
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-4">
          {enrichedHoldings.map(h => (
            <div key={h.code} className="card relative">
              <div className="flex justify-between items-start mb-2">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-[10px] bg-gray-100 dark:bg-gray-800 font-bold px-2 py-0.5 rounded text-gray-600 dark:text-gray-300">{h.sector}</span>
                    <span className="text-xs font-bold text-gray-400">{h.code}</span>
                  </div>
                  <h4 className="m-0 mt-1 text-lg font-bold">{h.name}</h4>
                </div>
                <button 
                  onClick={() => handleRemove(h.code)}
                  className="text-gray-300 hover:text-red-500 transition-colors text-2xl -mt-1 p-2"
                  aria-label="削除"
                >
                  ×
                </button>
              </div>
              <div className="grid grid-cols-2 gap-y-3 gap-x-4 text-sm mt-3 pt-3 border-t border-gray-100 dark:border-gray-800">
                <div>
                  <span className="text-gray-500 font-bold block text-xs mb-0.5">保有株数</span>
                  <strong className="text-base">{h.shares.toLocaleString()}株</strong>
                </div>
                <div>
                  <span className="text-gray-500 font-bold block text-xs mb-0.5">取得単価</span>
                  <strong className="text-base">¥{h.avgCost.toLocaleString()}</strong>
                </div>
                <div>
                  <span className="text-gray-500 font-bold block text-xs mb-0.5">現在株価</span>
                  <strong className="text-base">¥{h.currentPrice.toLocaleString()}</strong>
                </div>
                <div>
                  <span className="text-gray-500 font-bold block text-xs mb-0.5">損益</span>
                  <strong className={`text-base ${h.profit >= 0 ? 'text-red-500' : 'text-blue-500'}`}>
                    {h.profit >= 0 ? '+' : ''}¥{h.profit.toLocaleString()} <br/>
                    <small className="text-xs">({h.profit >= 0 ? '+' : ''}{h.profitPct.toFixed(1)}%)</small>
                  </strong>
                </div>
                <div className="col-span-2 mt-1">
                  <span className="text-gray-500 font-bold block text-xs mb-1">AIリスク判定</span>
                  <span className={`inline-block px-2.5 py-1 rounded text-xs font-bold ${
                    h.risk === '低' ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300' : 
                    h.risk === '中' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/40 dark:text-yellow-300' : 
                    'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300'
                  }`}>
                    {h.risk}
                  </span>
                </div>
              </div>
            </div>
          ))}
          {enrichedHoldings.length === 0 && !showForm && (
            <div className="card text-center py-10 text-gray-500 font-bold">
              保有株はありません。<br/>「保有株を追加」から登録してください。
            </div>
          )}
        </div>
      </main>

      <BottomNav />
    </ErrorBoundary>
  );
}
