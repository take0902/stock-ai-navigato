export interface Holding {
  code: string;
  name: string;
  shares: number;
  avgCost: number;
  sector: string;
}

const sectorMap: Record<string, string> = {
  "7203": "輸送用機器",
  "8306": "銀行業",
  "9984": "情報・通信業",
  "4881": "医薬品"
};

export function getPortfolio(): Holding[] {
  try {
    const data = localStorage.getItem("stock_portfolio");
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
}

export function savePortfolio(holdings: Holding[]): void {
  try {
    localStorage.setItem("stock_portfolio", JSON.stringify(holdings));
  } catch {}
}

export function addHolding(h: Omit<Holding, 'sector'>): void {
  const holdings = getPortfolio();
  const sector = sectorMap[h.code] || "その他";
  holdings.push({ ...h, sector });
  savePortfolio(holdings);
}

export function removeHolding(code: string): void {
  const holdings = getPortfolio();
  savePortfolio(holdings.filter(h => h.code !== code));
}

export function getFavorites(): string[] {
  try {
    const data = localStorage.getItem("stock_favorites");
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
}

export function saveFavorites(codes: string[]): void {
  try {
    localStorage.setItem("stock_favorites", JSON.stringify(codes));
  } catch {}
}

export function toggleFavorite(code: string): void {
  const favs = getFavorites();
  const idx = favs.indexOf(code);
  if (idx > -1) {
    favs.splice(idx, 1);
  } else {
    favs.push(code);
  }
  saveFavorites(favs);
}
