import { useEffect, useRef } from "react";

function seeded(seed: string) {
  let h = 2166136261;
  for (const c of seed) h = Math.imul(h ^ c.charCodeAt(0), 16777619);
  return () => ((h = Math.imul(h ^ (h >>> 15), 2246822519)) >>> 0) / 4294967296;
}

function movingAvg(arr: number[], n: number) {
  return arr.map((_, i) => {
    if (i < n - 1) return null;
    let sum = 0;
    for (let j = i - n + 1; j <= i; j++) sum += arr[j];
    return sum / n;
  });
}

function stdDev(arr: number[], meanArr: (number | null)[], n: number) {
  return arr.map((_, i) => {
    if (i < n - 1) return null;
    const mean = meanArr[i];
    if (mean === null) return null;
    let sum = 0;
    for (let j = i - n + 1; j <= i; j++) {
      sum += Math.pow(arr[j] - mean, 2);
    }
    return Math.sqrt(sum / n);
  });
}

export interface StockChartProps {
  seed: string;
  bollinger?: boolean;
  mode?: 'line' | 'candle';
  history?: Array<{open: number; high: number; low: number; close: number; sma5: number; sma25: number; sma75: number; rsi: number; macd: number}>;
  showVWAP?: boolean;
  showSMA200?: boolean;
}

function drawCandleChart(ctx: CanvasRenderingContext2D, c: HTMLCanvasElement, history: NonNullable<StockChartProps['history']>, showVWAP: boolean, showSMA200: boolean, bollinger: boolean) {
  const w = c.width, h = c.height;
  const leftPad = 55, rightPad = 15, topPad = 20, bottomPad = 40;
  const chartW = w - leftPad - rightPad;
  const chartH = h - topPad - bottomPad;

  const highs = history.map(d => d.high);
  const lows = history.map(d => d.low);
  const priceMin = Math.min(...lows) * 0.997;
  const priceMax = Math.max(...highs) * 1.003;

  const xScale = (i: number) => leftPad + (i / (history.length - 1)) * chartW;
  const yScale = (p: number) => topPad + ((priceMax - p) / (priceMax - priceMin)) * chartH;

  ctx.strokeStyle = "#dbe3ef"; ctx.lineWidth = 1;
  for (let i = 0; i <= 4; i++) {
    const price = priceMin + (priceMax - priceMin) * (i / 4);
    const yy = yScale(price);
    ctx.beginPath(); ctx.moveTo(leftPad, yy); ctx.lineTo(w - rightPad, yy); ctx.stroke();
    ctx.fillStyle = "#9ca3af"; ctx.font = "10px sans-serif"; ctx.textAlign = "right";
    ctx.fillText(Math.round(price).toLocaleString(), leftPad - 4, yy + 4);
  }

  const candleW = Math.max(3, Math.min(12, (chartW / history.length) * 0.7));

  history.forEach((d, i) => {
    const cx = xScale(i);
    const openY = yScale(d.open);
    const closeY = yScale(d.close);
    const highY = yScale(d.high);
    const lowY = yScale(d.low);
    const isGreen = d.close >= d.open;
    const color = isGreen ? "#22c55e" : "#ef4444";
    
    ctx.strokeStyle = color; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(cx, highY); ctx.lineTo(cx, lowY); ctx.stroke();
    
    ctx.fillStyle = color;
    const bodyTop = Math.min(openY, closeY);
    const bodyH = Math.max(1, Math.abs(openY - closeY));
    ctx.fillRect(cx - candleW / 2, bodyTop, candleW, bodyH);
  });

  const smaColors = [
    { key: 'sma5' as const, color: '#ef4444', width: 1.5 },
    { key: 'sma25' as const, color: '#2563eb', width: 1.5 },
    { key: 'sma75' as const, color: '#10b981', width: 1.5 },
  ];
  
  smaColors.forEach(({ key, color, width }) => {
    ctx.strokeStyle = color; ctx.lineWidth = width; ctx.beginPath();
    let started = false;
    history.forEach((d, i) => {
      const val = d[key];
      if (!val || val === 0) return;
      const px = xScale(i), py = yScale(val);
      if (!started) { ctx.moveTo(px, py); started = true; } else ctx.lineTo(px, py);
    });
    ctx.stroke();
  });

  if (showSMA200) {
    const closes = history.map(d => d.close);
    ctx.strokeStyle = '#f97316'; ctx.lineWidth = 1.5; ctx.setLineDash([4,4]); ctx.beginPath();
    if (history.length >= 200) {
      let started200 = false;
      for (let i = 199; i < history.length; i++) {
        const sum = closes.slice(i - 199, i + 1).reduce((a, b) => a + b, 0);
        const sma = sum / 200;
        const px = xScale(i), py = yScale(sma);
        if (!started200) { ctx.moveTo(px, py); started200 = true; } else ctx.lineTo(px, py);
      }
      ctx.stroke();
    }
    ctx.setLineDash([]);
  }

  if (showVWAP) {
    ctx.strokeStyle = '#06b6d4'; ctx.lineWidth = 1.5; ctx.setLineDash([3, 3]);
    let cumTP = 0, cumVol = 0;
    ctx.beginPath();
    let startedV = false;
    history.forEach((d, i) => {
      const tp = (d.high + d.low + d.close) / 3;
      cumTP += tp; cumVol += 1;
      const vwap = cumTP / cumVol;
      const px = xScale(i), py = yScale(vwap);
      if (!startedV) { ctx.moveTo(px, py); startedV = true; } else ctx.lineTo(px, py);
    });
    ctx.stroke(); ctx.setLineDash([]);
  }

  if (bollinger) {
    const closes = history.map(d => d.close);
    ctx.strokeStyle = '#8b5cf6'; ctx.lineWidth = 1; ctx.setLineDash([4, 4]);
    ['upper', 'lower'].forEach(band => {
      ctx.beginPath(); let startedBB = false;
      for (let i = 19; i < closes.length; i++) {
        const slice = closes.slice(i - 19, i + 1);
        const mean = slice.reduce((a, b) => a + b, 0) / 20;
        const variance = slice.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / 20;
        const sd = Math.sqrt(variance);
        const price = band === 'upper' ? mean + 2 * sd : mean - 2 * sd;
        const px = xScale(i), py = yScale(price);
        if (!startedBB) { ctx.moveTo(px, py); startedBB = true; } else ctx.lineTo(px, py);
      }
      ctx.stroke();
    });
    ctx.setLineDash([]);
  }
}

export function StockChart({ seed, bollinger = false, mode = 'line', history, showVWAP = false, showSMA200 = false }: StockChartProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const c = canvasRef.current;
    const container = containerRef.current;
    if (!c || !container) return;
    const ctx = c.getContext("2d");
    if (!ctx) return;

    const drawChart = () => {
      c.width = container.clientWidth || 760;
      c.height = container.clientHeight || 360;

      const w = c.width;
      const h = c.height;
      ctx.clearRect(0, 0, w, h);

      if (mode === 'candle' && history && history.length > 0) {
        drawCandleChart(ctx, c, history, showVWAP, showSMA200, bollinger);
      } else {
        const rnd = seeded(seed);
        let v = 100;
        const data: number[] = [];
        for (let i = 0; i < 70; i++) {
          v += (rnd() - 0.46) * 4;
          data.push(v);
        }
        
        const avgs = [
          movingAvg(data, 5),
          movingAvg(data, 15),
          movingAvg(data, 30),
        ];
        
        const sma20 = movingAvg(data, 20);
        const sd20 = stdDev(data, sma20, 20);
        
        const all = data.filter(Number.isFinite);
        const min = Math.min(...all) - 10;
        const max = Math.max(...all) + 10;
        
        const x = (i: number) => 40 + (i * (w - 70)) / (data.length - 1);
        const y = (v: number) => 20 + ((max - v) * (h - 55)) / (max - min);

        // Grid lines
        ctx.strokeStyle = "#dbe3ef";
        ctx.lineWidth = 1;
        for (let i = 0; i < 5; i++) {
          const yy = 25 + (i * (h - 70)) / 4;
          ctx.beginPath();
          ctx.moveTo(35, yy);
          ctx.lineTo(w - 20, yy);
          ctx.stroke();
        }

        // Bollinger Bands
        if (bollinger) {
          ctx.strokeStyle = "#8b5cf6";
          ctx.lineWidth = 1.5;
          ctx.setLineDash([5, 5]);
          
          // Upper
          ctx.beginPath();
          let started = false;
          sma20.forEach((val, i) => {
            if (val === null || sd20[i] === null) return;
            const upper = val + 2 * sd20[i]!;
            if (!started) {
              ctx.moveTo(x(i), y(upper));
              started = true;
            } else {
              ctx.lineTo(x(i), y(upper));
            }
          });
          ctx.stroke();
          
          // Lower
          ctx.beginPath();
          started = false;
          sma20.forEach((val, i) => {
            if (val === null || sd20[i] === null) return;
            const lower = val - 2 * sd20[i]!;
            if (!started) {
              ctx.moveTo(x(i), y(lower));
              started = true;
            } else {
              ctx.lineTo(x(i), y(lower));
            }
          });
          ctx.stroke();
          
          ctx.setLineDash([]); // Reset
        }

        // Main price line
        ctx.strokeStyle = "#5b5ce2";
        ctx.lineWidth = 3;
        ctx.beginPath();
        data.forEach((val, i) => {
          if (i) ctx.lineTo(x(i), y(val));
          else ctx.moveTo(x(i), y(val));
        });
        ctx.stroke();

        // Moving averages
        const colors = ["#ef4444", "#2563eb", "#10b981"];
        colors.forEach((color, k) => {
          ctx.strokeStyle = color;
          ctx.lineWidth = 2;
          ctx.beginPath();
          let started = false;
          avgs[k].forEach((val, i) => {
            if (val == null) return;
            if (!started) {
              ctx.moveTo(x(i), y(val));
              started = true;
            } else {
              ctx.lineTo(x(i), y(val));
            }
          });
          ctx.stroke();
        });
      }
    };

    drawChart();

    const ro = new ResizeObserver(() => {
      drawChart();
    });
    ro.observe(container);

    return () => ro.disconnect();
  }, [seed, bollinger, mode, history, showVWAP, showSMA200]);

  return (
    <div ref={containerRef} style={{ width: "100%", height: "100%", minHeight: "220px" }}>
      <canvas
        ref={canvasRef}
        aria-label="株価チャート"
      />
    </div>
  );
}
