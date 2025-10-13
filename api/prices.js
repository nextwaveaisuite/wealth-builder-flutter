// /api/prices.js — Vercel Serverless Function
export default function handler(req, res) {
  const url = new URL(req.url, `http://${req.headers.host}`);
  const tickersParam = url.searchParams.get('tickers') || '';
  const tickers = tickersParam.split(',').map(s => s.trim()).filter(Boolean);

  // Demo monthly series (12 points) — replace with real data later
  const demoSeries = {
    'IVV.AX':  [100,101,103,104,106,108,110,112,113,114,115,116], // ~+15%
    'GOLD.AX': [100,100,101,102,103,104,106,108,109,110,111,111], // ~+11%
    'VAS.AX':  [100,100,101,102,103,104,105,106,108,109,110,110], // ~+10%
    'VGS.AX':  [100,100,100,101,102,103,104,105,106,107,108,108], // ~+8%
    'VAF.AX':  [100,100,100,100,101,101,102,102,103,103,104,104], // ~+4%
  };

  const series = {};
  (tickers.length ? tickers : Object.keys(demoSeries)).forEach(t => {
    series[t] = demoSeries[t] || demoSeries['VAS.AX'];
  });

  res.setHeader('Content-Type', 'application/json');
  res.status(200).json({ series });
}
