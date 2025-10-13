const { promises: fs } = require('fs');
const CACHE_PATH = '/tmp/quotes-cache.json';
const TTL_MS = 60 * 1000;

async function readCache(){ try{ return JSON.parse(await fs.readFile(CACHE_PATH,'utf8')); }catch{ return { t:0, data:{} }; } }
async function writeCache(cache){ try{ await fs.writeFile(CACHE_PATH, JSON.stringify(cache)); }catch{} }

async function fetchAlpha(symbol, key){
  const url = `https://www.alphavantage.co/query?function=TIME_SERIES_DAILY&symbol=${encodeURIComponent(symbol)}&apikey=${key}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error('alpha http');
  const json = await res.json();
  if (!json || !json["Time Series (Daily)"]) throw new Error('alpha shape');
  const series = json["Time Series (Daily)"];
  const days = Object.keys(series).sort();
  const points = days.map(d => ({
    t: d,
    o: +series[d]["1. open"],
    h: +series[d]["2. high"],
    l: +series[d]["3. low"],
    c: +series[d]["4. close"],
    v: +series[d]["5. volume"]
  }));
  return { vendor: "alpha", symbol, points };
}
function synthFallback(symbol){
  const now = new Date();
  const seed = symbol.split('').reduce((a,c)=>a+c.charCodeAt(0),0)%97;
  const base = 100 + (seed % 20);
  let val = base;
  const points = [];
  for (let i=180; i>=0; i--){
    const d = new Date(now.getTime() - i*86400000);
    const drift = Math.sin((seed+i)/13)*0.4 + Math.cos((seed+i)/29)*0.25;
    val = Math.max(1, val + drift);
    const o = val - 0.2, h = val + 0.6, l = val - 0.6, c = val + (Math.random()-0.5)*0.3;
    points.push({ t: d.toISOString().slice(0,10), o, h, l, c: Math.max(0.5, c), v: 1000+((seed+i)%500) });
  }
  return { vendor: "fallback", symbol, points };
}

module.exports = async (req, res) => {
  try {
    const key = process.env.ALPHA_VANTAGE_KEY;
    const listRaw = req.method === 'POST' ? (req.body?.symbols || []) : (req.query.symbols || '');
    const list = Array.isArray(listRaw) ? listRaw : String(listRaw).split(',').map(s=>s.trim()).filter(Boolean);
    if (!list.length) return res.status(400).json({ ok:false, error:'symbols required' });

    const cache = await readCache();
    const out = {};
    for (const symbol of list){
      const ck = symbol;
      const fresh = (Date.now() - (cache.t || 0) < TTL_MS) && cache.data[ck];
      if (fresh) { out[symbol] = cache.data[ck]; continue; }
      let series;
      try { if (key) series = await fetchAlpha(symbol, key); else throw new Error('no vendor'); }
      catch { series = synthFallback(symbol); }
      out[symbol] = series;
      cache.data[ck] = series;
    }
    cache.t = Date.now();
    await writeCache(cache);
    res.json({ ok:true, data: out, cachedAt: cache.t });
  } catch (e) {
    res.status(500).json({ ok:false, error: e.message });
  }
};
