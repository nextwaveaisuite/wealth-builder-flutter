(function (global) {
  const WB = {};

  WB.fetchQuotes = async function(symbols) {
    const list = Array.isArray(symbols) ? symbols : String(symbols||'').split(',').map(s=>s.trim()).filter(Boolean);
    const res = await fetch(`/api/quotes?symbols=${encodeURIComponent(list.join(','))}`);
    const json = await res.json();
    if (!json.ok) throw new Error(json.error || "Quote fetch failed");
    return json.data;
  };

  WB.computeDrawdownPct = function (points) {
    let peak=-Infinity, dd=0; for(const p of points){ peak=Math.max(peak,p.c); dd=Math.min(dd,((p.c-peak)/peak)*100); } return dd;
  };
  WB.stdev = function (arr) { if (!arr.length) return 0; const m=arr.reduce((a,b)=>a+b,0)/arr.length; return Math.sqrt(arr.reduce((a,b)=>a+(b-m)*(b-m),0)/arr.length); };
  WB.alignAverageSeries = function (seriesList) {
    const m={}; for(const s of seriesList){ for(const p of s.points){ (m[p.t] ||= []).push(p.c); } }
    return Object.keys(m).sort().map(d => ({ t:d, c: m[d].reduce((a,b)=>a+b,0)/m[d].length }));
  };
  WB.evalSignals = function ({ growthSeries, radarCfg, lossGuardCfg }) {
    const avg = WB.alignAverageSeries(growthSeries);
    const dd = WB.computeDrawdownPct(avg);
    const last60 = avg.slice(-60).map(x=>x.c), last5 = avg.slice(-5).map(x=>x.c);
    const volRatio = WB.stdev(last5) / Math.max(1e-6, WB.stdev(last60));
    const guard = { drawdown:dd, weeklyBrake: dd <= (lossGuardCfg.weekly_brake_drawdown_pct ?? -5), info: dd <= (lossGuardCfg.info_banner_drawdown_pct ?? -2) };
    const tilts = [];
    for (const rule of (radarCfg.rules||[])) {
      let pass=false;
      if (rule.when.indicator==="equity_volatility_5d" && volRatio > (rule.when.value||1.8)) pass=true;
      if (rule.when.indicator==="growth_drawdown_pct" && dd <= (rule.when.value||-6)) pass=true;
      if (pass) tilts.push(rule.action);
    }
    return { guard, tilts, volRatio };
  };

  WB.parseHoldingsCSV = async function (file, schemaPath = "/assets/holdings_schemas.json") {
    const schemas = await (await fetch(schemaPath)).json();
    const text = await file.text();
    const lines = text.split(/\r?\n/).filter(Boolean);
    const headers = lines[0].split(",").map((h) => h.trim().replace(/^"|"$/g, ""));
    const rows = lines.slice(1).map((line) => line.split(",").map((c) => c.trim().replace(/^"|"$/g, "")));
    function detect(){ for(const [k,s] of Object.entries(schemas)){ if (s.detect.every((h)=>headers.includes(h))) return s; } return null; }
    const schema = detect(); if (!schema) throw new Error("CSV format not recognised (CommSec / SelfWealth / Raiz supported)");
    const aliases = schema.aliases || {};
    const out = rows.map(r=>{
      const obj={}; for(const [field,src] of Object.entries(schema.map)){ const idx=headers.indexOf(src); obj[field]=idx>=0? r[idx] : ""; }
      for(const [field,type] of Object.entries(schema.transform||{})){
        if (type==='trim') obj[field]=String(obj[field]||'').trim();
        if (type==='number') obj[field]=Number(String(obj[field]||'').replace(/[^0-9.\-]/g,''));
        if (type==='upper_map_etf_alias'){ const key=String(obj[field]||'').toUpperCase().trim(); obj[field]=aliases[key]||key; }
      }
      return obj;
    }).filter(x=>x.ticker && x.units>0);
    return out;
  };

  WB.startCheckout = async function ({ email, plan }) {
    const r = await fetch("/api/checkout",{ method:"POST", headers:{ "Content-Type":"application/json" }, body: JSON.stringify({ email, plan }) });
    const j = await r.json(); if (!j.url) throw new Error(j.error||"Checkout failed"); location.href=j.url;
  };
  WB.openPortal = async function ({ customerId }) {
    const r = await fetch("/api/portal",{ method:"POST", headers:{ "Content-Type":"application/json" }, body: JSON.stringify({ customerId }) });
    const j = await r.json(); if (!j.url) throw new Error(j.error||"Portal failed"); location.href=j.url;
  };
  WB.verifySession = async function (session_id) { return fetch(`/api/session-status?session_id=${encodeURIComponent(session_id)}`).then(r=>r.json()); };

  WB.telemetry = async function (events) {
    try { navigator.sendBeacon("/api/telemetry", JSON.stringify({ events })); }
    catch { await fetch("/api/telemetry",{ method:"POST", headers:{ "Content-Type":"application/json" }, body: JSON.stringify({ events }) }); }
  };

  global.WBPhase2 = WB;
})(window);
