// Wealth Builder — Phase 2 Helper Library
// ----------------------------------------------------
// This script adds all live logic (quotes, radar, loss guard,
// holdings import, Stripe, and telemetry) WITHOUT altering UI.
// ----------------------------------------------------

(function (global) {
  const WB = {};

  // -------------------------------
  // 1. Live Quotes
  // -------------------------------
  WB.fetchQuotes = async function(symbols) {
    const list = Array.isArray(symbols)
      ? symbols
      : String(symbols || "")
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean);

    const res = await fetch(`/api/quotes?symbols=${encodeURIComponent(list.join(","))}`);
    const json = await res.json();
    if (!json.ok) throw new Error(json.error || "Quote fetch failed");
    return json.data; // { "VAS.AX": {points:[{t,c,...}]}, ... }
  };

  // -------------------------------
  // 2. Radar & Loss Guard Calculations
  // -------------------------------
  WB.computeDrawdownPct = function (points) {
    let peak = -Infinity;
    let drawdown = 0;
    for (const p of points) {
      peak = Math.max(peak, p.c);
      drawdown = Math.min(drawdown, ((p.c - peak) / peak) * 100);
    }
    return drawdown; // negative %
  };

  WB.stdev = function (arr) {
    if (!arr.length) return 0;
    const mean = arr.reduce((a, b) => a + b, 0) / arr.length;
    const variance = arr.reduce((a, b) => a + (b - mean) ** 2, 0) / arr.length;
    return Math.sqrt(variance);
  };

  WB.alignAverageSeries = function (seriesList) {
    const map = {};
    for (const s of seriesList) {
      for (const p of s.points) {
        if (!map[p.t]) map[p.t] = [];
        map[p.t].push(p.c);
      }
    }
    return Object.keys(map)
      .sort()
      .map((d) => ({
        t: d,
        c: map[d].reduce((a, b) => a + b, 0) / map[d].length,
      }));
  };

  WB.evalSignals = function ({ growthSeries, radarCfg, lossGuardCfg }) {
    const avgSeries = WB.alignAverageSeries(growthSeries);
    const drawdown = WB.computeDrawdownPct(avgSeries);
    const last60 = avgSeries.slice(-60).map((x) => x.c);
    const last5 = avgSeries.slice(-5).map((x) => x.c);
    const volRatio = WB.stdev(last5) / Math.max(1e-6, WB.stdev(last60));

    const guard = {
      drawdown,
      weeklyBrake: drawdown <= (lossGuardCfg.weekly_brake_drawdown_pct ?? -5),
      info: drawdown <= (lossGuardCfg.info_banner_drawdown_pct ?? -2),
    };

    const tilts = [];
    for (const rule of radarCfg.rules || []) {
      let pass = false;
      if (rule.when.indicator === "equity_volatility_5d" && volRatio > (rule.when.value || 1.8)) pass = true;
      if (rule.when.indicator === "growth_drawdown_pct" && drawdown <= (rule.when.value || -6)) pass = true;
      if (!pass) continue;
      tilts.push(rule.action);
    }

    return { guard, tilts, volRatio };
  };

  // -------------------------------
  // 3. Holdings CSV Import
  // -------------------------------
  WB.parseHoldingsCSV = async function (file, schemaPath = "/assets/holdings_schemas.json") {
    const schemas = await (await fetch(schemaPath)).json();
    const text = await file.text();
    const lines = text.split(/\r?\n/).filter(Boolean);
    const headers = lines[0].split(",").map((h) => h.trim().replace(/^"|"$/g, ""));
    const rows = lines.slice(1).map((line) => line.split(",").map((c) => c.trim().replace(/^"|"$/g, "")));

    function detect() {
      for (const [key, schema] of Object.entries(schemas)) {
        if (schema.detect.every((h) => headers.includes(h))) return schema;
      }
      return null;
    }

    const schema = detect();
    if (!schema) throw new Error("CSV format not recognised (CommSec / SelfWealth / Raiz supported)");
    const aliases = schema.aliases || {};

    const output = rows
      .map((r) => {
        const obj = {};
        for (const [field, src] of Object.entries(schema.map)) {
          const idx = headers.indexOf(src);
          obj[field] = idx >= 0 ? r[idx] : "";
        }
        for (const [field, type] of Object.entries(schema.transform || {})) {
          if (type === "trim") obj[field] = String(obj[field] || "").trim();
          if (type === "number") obj[field] = Number(String(obj[field] || "").replace(/[^0-9.\-]/g, ""));
          if (type === "upper_map_etf_alias") {
            const key = String(obj[field] || "").toUpperCase().trim();
            obj[field] = aliases[key] || key;
          }
        }
        return obj;
      })
      .filter((x) => x.ticker && x.units > 0);
    return output;
  };

  // -------------------------------
  // 4. Stripe Checkout / Portal / Session
  // -------------------------------
  WB.startCheckout = async function ({ email, plan }) {
    const r = await fetch("/api/checkout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, plan }),
    });
    const j = await r.json();
    if (!j.url) throw new Error(j.error || "Checkout failed");
    window.location.href = j.url;
  };

  WB.openPortal = async function ({ customerId }) {
    const r = await fetch("/api/portal", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ customerId }),
    });
    const j = await r.json();
    if (!j.url) throw new Error(j.error || "Portal open failed");
    window.location.href = j.url;
  };

  WB.verifySession = async function (session_id) {
    const r = await fetch(`/api/session-status?session_id=${encodeURIComponent(session_id)}`);
    return r.json(); // { ok, status, email, customerId }
  };

  // -------------------------------
  // 5. Telemetry (Lightweight)
  // -------------------------------
  WB.telemetry = async function (events) {
    try {
      navigator.sendBeacon("/api/telemetry", JSON.stringify({ events }));
    } catch {
      await fetch("/api/telemetry", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ events }),
      });
    }
  };

  // Export
  global.WBPhase2 = WB;
})(window);
