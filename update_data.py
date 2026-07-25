from __future__ import annotations
import json, math, time
from pathlib import Path
from datetime import datetime, timezone
import numpy as np
import pandas as pd
import requests
import yfinance as yf

ROOT = Path(__file__).resolve().parent
CONFIG = json.loads((ROOT / "config.json").read_text(encoding="utf-8"))
OUT = ROOT / "stocks.json"


def finite(v, default=0.0):
    try:
        v = float(v)
        return v if math.isfinite(v) else default
    except Exception:
        return default


def fetch_yfinance(ticker: str) -> pd.DataFrame:
    df = yf.download(ticker, period=CONFIG["period"], interval=CONFIG["interval"],
                     auto_adjust=False, progress=False, threads=False, timeout=20)
    if isinstance(df.columns, pd.MultiIndex):
        df.columns = df.columns.get_level_values(0)
    return df.dropna(subset=["Close"])


def fetch_stooq(code: str) -> pd.DataFrame:
    # Stooqの日本株コード表記は変更される可能性があるため複数候補を試す。
    for symbol in (f"{code}.jp", f"{code}.j", code):
        url = f"https://stooq.com/q/d/l/?s={symbol}&i=d"
        r = requests.get(url, timeout=20, headers={"User-Agent": "Mozilla/5.0"})
        if r.ok and "Date,Open,High,Low,Close" in r.text:
            from io import StringIO
            df = pd.read_csv(StringIO(r.text))
            if len(df) > 30:
                df["Date"] = pd.to_datetime(df["Date"])
                df = df.set_index("Date")
                if "Volume" not in df: df["Volume"] = 0
                return df
    return pd.DataFrame()


def indicators(df: pd.DataFrame) -> pd.DataFrame:
    x = df.copy()
    close = x["Close"].astype(float)
    x["SMA5"] = close.rolling(5).mean()
    x["SMA25"] = close.rolling(25).mean()
    x["SMA75"] = close.rolling(75).mean()
    delta = close.diff()
    gain = delta.clip(lower=0).ewm(alpha=1/14, adjust=False).mean()
    loss = (-delta.clip(upper=0)).ewm(alpha=1/14, adjust=False).mean()
    rs = gain / loss.replace(0, np.nan)
    x["RSI"] = 100 - (100 / (1 + rs))
    ema12 = close.ewm(span=12, adjust=False).mean()
    ema26 = close.ewm(span=26, adjust=False).mean()
    x["MACD"] = ema12 - ema26
    x["SIGNAL"] = x["MACD"].ewm(span=9, adjust=False).mean()
    mid = close.rolling(20).mean(); std = close.rolling(20).std()
    x["BBU"] = mid + 2*std; x["BBL"] = mid - 2*std
    tr = pd.concat([(x["High"]-x["Low"]), (x["High"]-close.shift()).abs(), (x["Low"]-close.shift()).abs()], axis=1).max(axis=1)
    x["ATR"] = tr.rolling(14).mean()
    return x


def score_and_forecast(df: pd.DataFrame):
    r = df.iloc[-1]; prev = df.iloc[-2]
    score = 50
    reasons=[]; cautions=[]
    if r.Close > r.SMA25: score += 10; reasons.append("株価が25日移動平均線を上回っています")
    else: score -= 10; cautions.append("株価が25日移動平均線を下回っています")
    if r.SMA5 > r.SMA25: score += 10; reasons.append("5日線が25日線を上回っています")
    else: score -= 8
    if r.MACD > r.SIGNAL: score += 10; reasons.append("MACDがシグナルを上回っています")
    else: score -= 8
    if 40 <= r.RSI <= 65: score += 7; reasons.append("RSIは過熱感の少ない範囲です")
    elif r.RSI >= 75: score -= 10; cautions.append("RSIが高く、短期的な過熱に注意が必要です")
    elif r.RSI <= 30: score += 3; cautions.append("売られ過ぎ水準ですが、下降継続の可能性もあります")
    vol20 = df["Volume"].tail(20).mean()
    if finite(r.Volume) > finite(vol20) * 1.3: score += 6; reasons.append("出来高が20日平均より増加しています")
    ret5 = r.Close / df.iloc[-6].Close - 1 if len(df)>=6 else 0
    score += max(-10, min(10, ret5*100))
    score = int(max(5, min(95, round(score))))
    # 評価値。実際の統計確率ではないことをUIで明記する。
    up = int(max(10, min(80, 20 + score*0.55)))
    down = int(max(8, min(70, 65 - score*0.55)))
    flat = 100-up-down
    atr = finite(r.ATR, finite(r.Close)*0.02)
    horizons = {}
    for days, key, factor in [(1,"next",1.0),(5,"five",2.2),(20,"twenty",4.5)]:
        drift = (score-50)/50 * atr * math.sqrt(days) * 0.45
        spread = atr * factor
        mid = finite(r.Close)+drift
        horizons[key] = {"days":days,"low":round(mid-spread,1),"mid":round(mid,1),"high":round(mid+spread,1)}
    return score, {"up":up,"flat":flat,"down":down}, horizons, reasons[:4], cautions[:3]


def serialize(symbol, df, source):
    df = indicators(df).dropna().tail(260)
    score, probs, forecasts, reasons, cautions = score_and_forecast(df)
    rows=[]
    for idx,r in df.tail(180).iterrows():
        rows.append({
          "date": pd.Timestamp(idx).strftime("%Y-%m-%d"), "open":round(finite(r.Open),2),
          "high":round(finite(r.High),2), "low":round(finite(r.Low),2), "close":round(finite(r.Close),2),
          "volume":int(finite(r.Volume)), "sma5":round(finite(r.SMA5),2), "sma25":round(finite(r.SMA25),2),
          "sma75":round(finite(r.SMA75),2), "rsi":round(finite(r.RSI),1), "macd":round(finite(r.MACD),2),
          "signal":round(finite(r.SIGNAL),2)
        })
    last, prev = df.iloc[-1], df.iloc[-2]
    return {
      **symbol, "source":source, "updatedAt":datetime.now(timezone.utc).isoformat(),
      "price":round(finite(last.Close),2), "change":round(finite(last.Close-prev.Close),2),
      "changePct":round((finite(last.Close)/finite(prev.Close,1)-1)*100,2),
      "score":score, "probabilities":probs, "forecasts":forecasts,
      "reasons":reasons, "cautions":cautions,
      "indicators":{"rsi":round(finite(last.RSI),1),"macd":round(finite(last.MACD),2),"signal":round(finite(last.SIGNAL),2)},
      "history":rows
    }


def main():
    existing={}
    if OUT.exists():
        try: existing={s["ticker"]:s for s in json.loads(OUT.read_text(encoding="utf-8"))["stocks"]}
        except Exception: pass
    stocks=[]
    for symbol in CONFIG["symbols"]:
        try:
            df=fetch_yfinance(symbol["ticker"]); source="yfinance"
            if len(df)<80:
                df=fetch_stooq(symbol["code"]); source="Stooq"
            if len(df)<80: raise RuntimeError("十分な株価データを取得できませんでした")
            stocks.append(serialize(symbol,df,source))
            print(symbol["ticker"],source,len(df))
        except Exception as e:
            print("fallback cached",symbol["ticker"],e)
            if symbol["ticker"] in existing: stocks.append(existing[symbol["ticker"]])
        time.sleep(1)
    if not stocks: raise SystemExit("更新可能な銘柄がありません")
    OUT.write_text(json.dumps({"generatedAt":datetime.now(timezone.utc).isoformat(),"stocks":stocks},ensure_ascii=False),encoding="utf-8")

if __name__ == "__main__": main()
