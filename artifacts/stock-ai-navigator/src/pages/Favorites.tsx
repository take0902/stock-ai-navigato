import { useEffect, useState } from 'react';
import { Link } from 'wouter';
import { getFavorites } from '@/lib/storage';
import { computeAIScores } from '@/lib/aiAnalysis';
import stockDataJson from '@/stocks.json';
import { BottomNav } from '@/components/BottomNav';
import { Stock } from '@/lib/types';
import { ErrorBoundary } from '@/components/ErrorBoundary';

const allStocks: Stock[] = stockDataJson.stocks as Stock[];

export default function Favorites() {
  const [favoriteStocks, setFavoriteStocks] = useState<Stock[]>([]);

  useEffect(() => {
    const codes = getFavorites();
    const stocks = codes.map(code => allStocks.find(s => s.code === code)).filter(Boolean) as Stock[];
    setFavoriteStocks(stocks);
  }, []);

  return (
    <ErrorBoundary>
      <header className="hero">
        <div>
          <p className="eyebrow">STOCK AI NAVIGATOR PRO</p>
          <h1>お気に入り</h1>
        </div>
      </header>

      <main className="container" style={{ paddingTop: '20px' }}>
        {favoriteStocks.length === 0 ? (
          <div className="card text-center py-12">
            <p className="text-gray-500 font-bold">お気に入りはまだありません</p>
            <p className="text-xs text-gray-400 mt-2">銘柄詳細ページの「☆」をタップして追加できます</p>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            {favoriteStocks.map(stock => {
              const aiScores = computeAIScores(stock);
              const isUp = stock.change >= 0;
              return (
                <Link key={stock.code} href={`/stock?code=${stock.code}`} className="card block hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors" style={{ textDecoration: 'none', color: 'inherit', marginBottom: 0 }}>
                  <div className="flex justify-between items-center">
                    <div>
                      <p className="muted text-sm m-0 font-bold">{stock.code}</p>
                      <h3 className="m-0 text-lg font-bold">{stock.name}</h3>
                    </div>
                    <div className="text-right">
                      <strong className="block text-2xl font-bold">{stock.price.toLocaleString()}円</strong>
                      <span className={`text-sm font-bold ${isUp ? 'text-red-500' : 'text-blue-500'}`}>
                        {isUp ? '+' : ''}{stock.changePct.toFixed(2)}%
                      </span>
                    </div>
                  </div>
                  <div className="mt-3 pt-3 border-t border-gray-100 dark:border-gray-800 flex justify-between items-center">
                    <span className="text-sm font-bold text-gray-500">AIスコア</span>
                    <strong className="text-indigo-600 dark:text-indigo-400 text-xl font-bold">{aiScores.overall} <span className="text-sm text-gray-400 font-normal">/ 100</span></strong>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </main>

      <BottomNav />
    </ErrorBoundary>
  );
}
