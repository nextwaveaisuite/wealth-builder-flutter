// /api/quotes.js
export const config = { runtime: 'nodejs18.x' };

const fs = await import('fs/promises');
const path = '/tmp/quotes-cache.json';
const TTL_MS = 60 * 1000;

const MAP = {
  // Symbol normalization (Yahoo-style suffix for AU is ".AX")
  "VAS.AX": { vendor: "ALPHA", symbol: "VAS.AX" },
  "VGS.AX": { vendor: "ALPHA", symbol: "VGS.AX" },
  "IVV.AX": { vendor: "ALPHA", symbol: "IVV.AX" },
  "VAF.AX": { vendor: "ALPHA", symbol: "VAF.AX" },
  "GOLD.AX": { vendor: "ALPHA", symbol: "GOLD.AX" },
  "GOLD.AZ": { vendor: "ALPHA", symbol: "GOLD.AX" }, // alias from Phase 1 text
};

async function readCache() {
  try {
    const raw = await fs.readFile(path, 'utf-8');
    return JSON.parse(raw);
  } catch {
    return { t: 0, data: {} };
  }
}
async function writeCache(cache) {
  try { await fs.writeFile(path, JSON.stringify(cache)); } catch {}
}

async function fetchAlpha(symbol, key) {
  const url = `https://www.alphavantage.co/query?function=TIME_SERIES_DAILY&symbol=${encodeURIComponent(symbol)}&apikey=${key}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error('alpha http');
  const json = await res.json();
  if (!json || !json["Time Series (Daily)"]) throw new Error('alpha shape');
  const series = json["Time Series (Daily)"];
  const days = Object.keys(series).sort();
  const points = days.map(d => ({
    t: d,
    o: parseFloat(series[d]["1. open"]),
    h: parseFloat(series[d]["2. high"]),
    l: parseFloat(series[d]["3. low"]),
    c: parseFloat(series[d]["4. close"]),
    v: parseFloat(series[d]["5. volume"])
  }));
  return { vendor: "alpha", symbol, points };
}

function synthFallback(symbol) {
  // deterministic pseudo-random walk so charts don't die if vendor blocks us
  const now = new Date();
  const seed = symbol.split('').reduce((a,c)=>a+c.charCodeAt(0), 0) % 97;
  const base = 100 + (seed % 20);
  let val = base;
  const points = [];
  for (let i=120; i>=0; i--) {
    const d = new Date(now.getTime() - i*24*3600*1000);
    const drift = Math.sin((seed+i)/13) * 0.4 + Math.cos((seed+i)/29) * 0.25;
    val = Math.max(1, val + drift);
    const o = val - 0.2, h = val + 0.6, l = val - 0.6, c = val + (Math.random()-0.5)*0.3;
    points.push({ t: d.toISOString().slice(0,10), o, h, l, c: Math.max(0.5, c), v: 1000+((seed+i)%500) });
  }
  return { vendor: "fallback", symbol, points };
}

export default async function handler(req, res) {
  try {
    const { symbols } = req.method === 'POST' ? await req.json?.() ?? {} : req.query;
    const list = (Array.isArray(symbols) ? symbols : String(symbols || '').split(','))
      .map(s => s.trim()).filter(Boolean);
    if (!list.length) return res.status(400).json({ error: 'symbols required' });

    const cache = await readCache();
    const fresh = Date.now() - (cache.t || 0) < TTL_MS ? cache.data : {};

    const key = process.env.ALPHA_VANTAGE_KEY;
    const out = {};
    for (const raw of list) {
      const meta = MAP[raw] || { vendor: key ? "ALPHA" : "FALLBACK", symbol: raw };
      const ck = `${meta.vendor}:${meta.symbol}`;
      if (fresh[ck]) { out[raw] = fresh[ck]; continue; }

      let series;
      try {
        if (meta.vendor === 'ALPHA' && key) series = await fetchAlpha(meta.symbol, key);
        else throw new Error('no vendor');
      } catch {
        series = synthFallback(meta.symbol);
      }
      out[raw] = series;
      cache.data[ck] = series;
    }
    cache.t = Date.now();
    await writeCache(cache);
    res.json({ ok: true, data: out, cachedAt: cache.t });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
}
