/* Wealth Builder — App (Phase 2 wired, UI preserved)
 * Notes:
 * - Uses your existing style.css; no new styles injected.
 * - Calls headless helpers from WBPhase2 (quotes, radar, holdings, stripe, telemetry).
 * - Hash-routing preserved. Adjust copy/strings as needed.
 */

(() => {
  const content = document.getElementById('content');

  // Persist helpers
  const LS = {
    get(k, def) {
      try { return JSON.parse(localStorage.getItem(k)) ?? def; } catch { return def; }
    },
    set(k, v) { localStorage.setItem(k, JSON.stringify(v)); }
  };

  // Small UI helpers (no styling changes; uses your existing classes)
  function h(tag, attrs = {}, html = '') {
    const el = document.createElement(tag);
    for (const [k, v] of Object.entries(attrs)) {
      if (k === 'class') el.className = v;
      else el.setAttribute(k, v);
    }
    el.innerHTML = html;
    return el;
  }
  function banner(msg, type = 'info') {
    const div = h('div', { class: `alert ${type}` }, msg);
    content.prepend(div);
  }

  // --------- Routing ----------
  const routes = {};
  async function render() {
    const hash = location.hash || '#/';
    if (routes[hash]) {
      await routes[hash]();
    } else {
      content.innerHTML = `<div class="card"><h2>Not Found</h2><p>No route: ${hash}</p></div>`;
    }
  }
  window.addEventListener('hashchange', render);

  // --------- HOME ----------
  routes['#/'] = async function () {
    content.innerHTML = `
      <div class="card">
        <h2>What Wealth Builder Does</h2>
        <p>Rules-based, micro-contribution plan for Australians. We plan tiny, regular contributions into a Growth/Safety ETF mix, add small capped tilts, and help you execute at your provider. We never hold funds or place orders.</p>
        <div class="grid cols-3">
          <div class="card"><strong>Next Order Plan</strong><div class="small">Balanced 70/30 · $50/wk · Drift aware</div></div>
          <div class="card"><strong>Right Now Tilt</strong><div class="small">Macro stress → +$10 to Safety (cap) · Buy-the-Dip toggle</div></div>
          <div class="card"><strong>Wealth Build</strong><div class="small">Cumulative line chart (from live or fallback quotes)</div></div>
        </div>
      </div>
      <div class="alert info">We don’t hold funds or place orders. Execute at your chosen provider.</div>
    `;
  };

  // --------- PORTFOLIO ----------
  routes['#/portfolio'] = async function () {
    content.innerHTML = `
      <div class="card">
        <h2>Portfolio</h2>
        <div id="badges" style="margin-bottom:8px;"></div>

        <div class="grid cols-2">
          <div class="card">
            <h3>Target Mix</h3>
            <div class="kv">
              <div>Growth</div><div>70%</div>
              <div>Safety</div><div>30%</div>
            </div>
          </div>

          <div class="card">
            <h3>Live P/L Snapshot</h3>
            <ul id="plList" class="small"></ul>
            <button class="btn" id="exportPL">Export CSV</button>
          </div>
        </div>

        <div class="card">
          <h3>Planned Buys</h3>
          <div class="kv">
            <div>Growth Sleeve</div><div>VAS.AX (0.10%) · VGS.AX (0.18%) · IVV.AX (0.04%)</div>
            <div>Safety Sleeve</div><div>VAF.AX (0.20%) · GOLD.AX (0.40%)</div>
          </div>
          <p class="small">Priority: lowest fee per sleeve (MVP rule).</p>
          <button class="btn" id="exportBuys">Export CSV</button>
        </div>
      </div>
    `;

    // Demo P/L list (static text; you can replace with your own logic if needed)
    const demoPL = [
      { t: 'IVV.AX', r: '+15%' },
      { t: 'GOLD.AX', r: '+11%' },
      { t: 'VAS.AX', r: '+10%' },
      { t: 'VGS.AX', r: '+8%' },
      { t: 'VAF.AX', r: '+4%' }
    ];
    document.getElementById('plList').innerHTML = demoPL.map(x => `<li>${x.t} ${x.r}</li>`).join('');

    // Exports (no style changes)
    document.getElementById('exportPL').onclick = () => {
      downloadCSV('pl_first_last.csv', [['Ticker', 'P/L (First->Last)'], ...demoPL.map(x => [x.t, x.r])]);
    };
    document.getElementById('exportBuys').onclick = () => {
      const rows = [
        ['Sleeve', 'Ticker', 'Fee', 'Priority'],
        ['Growth', 'VAS.AX', '0.10%', 'Low fee'],
        ['Growth', 'VGS.AX', '0.18%', ''],
        ['Growth', 'IVV.AX', '0.04%', 'Lowest fee (US exposure)'],
        ['Safety', 'VAF.AX', '0.20%', 'Low fee'],
        ['Safety', 'GOLD.AX', '0.40%', 'Hedge']
      ];
      downloadCSV('planned_buys.csv', rows);
    };

    // Loss Guard & Radar micro-tilts (no visual overhaul; just a line of badges text)
    try {
      const symbols = ["VAS.AX", "VGS.AX", "IVV.AX", "VAF.AX", "GOLD.AX"];
      const quotes = await WBPhase2.fetchQuotes(symbols);
      const radarYaml = await fetch('./assets/radar.yaml').then(r => r.text());
      const lossYaml  = await fetch('./assets/loss_guard.yaml').then(r => r.text());
      // If you already include js-yaml elsewhere, you can parse with it; otherwise keep badges minimal.
      // To avoid introducing new libs here, just apply a tiny YAML parser for our simple config,
      // but to keep strictly minimal, we assume JSON mirrors exist (your repo has radar.json & loss_guard.json):
      const radarCfg     = await fetch('./assets/radar.json').then(r => r.json()).catch(()=>({rules:[]}));
      const lossGuardCfg = await fetch('./assets/loss_guard.json').then(r => r.json()).catch(()=>({weekly_brake_drawdown_pct:-5, info_banner_drawdown_pct:-2}));

      const growthSeries = ["VAS.AX", "VGS.AX", "IVV.AX"].map(s => quotes[s]).filter(Boolean);
      const { guard, tilts } = WBPhase2.evalSignals({ growthSeries, radarCfg, lossGuardCfg });

      const badges = [];
      if (guard.weeklyBrake) badges.push(`<span class="badge warn">Loss Guard: Weekly brake active</span>`);
      for (const t of tilts) {
        const dest = (t.sleeve || '').toLowerCase();
        badges.push(`<span class="badge ${dest}">Tilt +$${t.add_dollars} → ${t.sleeve}</span>`);
      }
      if (badges.length) document.getElementById('badges').innerHTML = badges.join(' ');
      WBPhase2.telemetry([{ t:'portfolio_signals', tilts: tilts.length, brake: guard.weeklyBrake?1:0 }]);
    } catch {
      // Quietly ignore if quotes unavailable; no style changes
    }
  };

  // --------- AUTOPILOT ----------
  routes['#/autopilot'] = async function () {
    content.innerHTML = `
      <div class="card">
        <h2>Autopilot</h2>
        <div class="kv">
          <div>Schedule</div><div>Weekly Fridays</div>
          <div>Amount</div><div>$50</div>
          <div>DCA</div><div>ON</div>
          <div>Loss Guard</div><div>Floor ≥30% safety · growth cap ≤70% · weekly brake ~−5%</div>
        </div>
        <div class="grid">
          <button class="btn" id="keep">Keep ON</button>
          <button class="btn" id="pause">Pause (demo)</button>
        </div>
      </div>
    `;
    document.getElementById('keep').onclick  = () => banner('Autopilot kept ON (demo confirmation).', 'info');
    document.getElementById('pause').onclick = () => banner('Autopilot paused (demo confirmation).', 'warn');
  };

  // --------- EXECUTE ----------
  routes['#/execute'] = async function () {
    content.innerHTML = `
      <div class="card">
        <h2>Execute at Provider</h2>
        <div class="grid cols-3">
          ${['Raiz','Spaceship Voyager','CommSec Pocket','Stockspot','QuietGrowth'].map(name => `
            <div class="card">
              <h3>${name}</h3>
              <p class="small">Open ${name} and follow our tips.</p>
              <div class="grid">
                <a class="btn" href="#" onclick="alert('Deep-link placeholder');return false;">Open ${name}</a>
                <button class="btn" onclick="alert('Keep amounts small and steady. Match tickers to your plan.');">How to use</button>
              </div>
            </div>
          `).join('')}
        </div>
        <div class="small">We don’t hold funds or place orders. Execute at your provider.</div>
      </div>
    `;
  };

  // --------- WITHDRAW ----------
  routes['#/withdraw'] = async function () {
    content.innerHTML = `
      <div class="card">
        <h2>Withdraw Planner</h2>
        <p>Enter an amount and we’ll propose sells favouring Safety (VAF/GOLD). Export CSV and execute with your provider.</p>
        <div class="grid cols-2">
          <div class="card">
            <input class="input" id="wAmt" placeholder="Amount (e.g., 250)"/>
            <button class="btn" id="wPlan">Propose Sells</button>
          </div>
          <div class="card">
            <pre id="wOut" class="small"></pre>
            <button class="btn" id="wCsv" style="display:none;">Export CSV</button>
          </div>
        </div>
      </div>
    `;
    document.getElementById('wPlan').onclick = () => {
      const amt = Number(document.getElementById('wAmt').value || 0);
      if (!amt || amt < 1) return alert('Enter amount');
      const legs = [
        { ticker: 'VAF.AX',  dollars: Math.round(amt * 0.7) },
        { ticker: 'GOLD.AX', dollars: amt - Math.round(amt * 0.7) }
      ];
      document.getElementById('wOut').textContent = legs.map(l => `${l.ticker}, -$${l.dollars}`).join('\n');
      const btn = document.getElementById('wCsv');
      btn.style.display = '';
      btn.onclick = () => downloadCSV('withdraw.csv', [['Ticker','Dollars'], ...legs.map(l => [l.ticker, -l.dollars])]);
      WBPhase2.telemetry([{ t: 'withdraw_plan', amt }]);
    };
  };

  // --------- HOLDINGS (CSV Import) ----------
  routes['#/holdings'] = async function () {
    content.innerHTML = `
      <div class="card">
        <h2>Holdings (Read-Only)</h2>
        <p>Import your broker CSV (CommSec, SelfWealth, Raiz). We compute positions for live P/L and drift.</p>
        <input type="file" accept=".csv" id="csv"/>
        <button class="btn" id="btnImport">Import CSV</button>
        <div id="holdingsResult"></div>
      </div>
    `;
    document.getElementById('btnImport').onclick = async () => {
      const f = document.getElementById('csv').files[0];
      if (!f) return alert('Select a CSV file');
      try {
        const list = await WBPhase2.parseHoldingsCSV(f, './assets/holdings_schemas.json');
        LS.set('holdings', list);
        document.getElementById('holdingsResult').innerHTML = `
          <p>Imported <strong>${list.length}</strong> positions.</p>
          <div class="card small">${list.map(x => `${x.ticker} — ${x.units} @ ${x.cost_base}`).join('<br/>')}</div>
        `;
        WBPhase2.telemetry([{ t: 'holdings_import', n: list.length }]);
      } catch (e) {
        alert(e.message);
      }
    };
  };

  // --------- SETTINGS (PRO & Billing) ----------
  routes['#/settings'] = async function () {
    content.innerHTML = `
      <div class="card">
        <h2>Settings</h2>
        <div class="grid cols-2">
          <div class="card">
            <h3>Plan</h3>
            <div class="kv">
              <div>Risk Band</div><div><select id="risk"><option>Conservative</option><option selected>Balanced</option><option>Growth</option></select></div>
              <div>Cadence</div><div><select id="cad"><option>Weekly</option><option>Fortnightly</option><option>Monthly</option></select></div>
              <div>Amount</div><div><input id="amt" class="input" placeholder="50" value="50"/></div>
              <div>Buy-the-Dip</div><div><input type="checkbox" id="btd" checked/> Enable small BTD tilts</div>
            </div>
            <button class="btn" id="save">Save</button>
          </div>
          <div class="card">
            <h3>Billing</h3>
            <div id="buyBox">
              <input type="email" id="billEmail" class="input" placeholder="Email (for receipt)"/>
              <div class="grid">
                <button class="btn" id="buyMonthly">Go PRO (Monthly)</button>
                <button class="btn" id="buyLifetime">Lifetime (Optional)</button>
              </div>
            </div>
            <div id="portalBox" style="display:none;">
              <p>You are PRO.</p>
              <button class="btn" id="portal">Manage Billing</button>
            </div>
          </div>
        </div>
        <div class="small">We don’t hold funds or place orders.</div>
      </div>
    `;

    const s = LS.get('settings', { risk: 'Balanced', cad: 'Weekly', amt: 50, btd: true });
    document.getElementById('risk').value = s.risk;
    document.getElementById('cad').value  = s.cad;
    document.getElementById('amt').value  = s.amt;
    document.getElementById('btd').checked = !!s.btd;

    document.getElementById('save').onclick = () => {
      const ns = {
        risk: document.getElementById('risk').value,
        cad:  document.getElementById('cad').value,
        amt:  Number(document.getElementById('amt').value || 50),
        btd:  document.getElementById('btd').checked
      };
      LS.set('settings', ns);
      banner('Saved.', 'info');
    };

    const pro = LS.get('pro', { active: false, status: 'none' });
    const showPro = (pro?.active || pro?.status === 'active' || pro?.status === 'trialing');
    document.getElementById('buyBox').style.display    = showPro ? 'none' : '';
    document.getElementById('portalBox').style.display = showPro ? ''      : 'none';

    document.getElementById('buyMonthly').onclick = async () => {
      const email = document.getElementById('billEmail').value || undefined;
      try { await WBPhase2.startCheckout({ email, plan: 'monthly' }); } catch (e) { alert(e.message); }
    };
    document.getElementById('buyLifetime').onclick = async () => {
      const email = document.getElementById('billEmail').value || undefined;
      try { await WBPhase2.startCheckout({ email, plan: 'lifetime' }); } catch (e) { alert(e.message); }
    };
    const portalBtn = document.getElementById('portal');
    if (portalBtn) portalBtn.onclick = async () => {
      const stored = LS.get('pro', {});
      if (!stored.customerId) return alert('No customer found on this device.');
      try { await WBPhase2.openPortal({ customerId: stored.customerId }); } catch (e) { alert(e.message); }
    };
  };

  // --------- PRO THANK-YOU (after Stripe) ----------
  routes['#/pro/thanks'] = async function () {
    const url = new URL(window.location.href);
    const sid = url.searchParams.get('session_id');
    content.innerHTML = `<div class="card"><h2>Thanks!</h2><p>Verifying your subscription…</p></div>`;
    if (!sid) { content.innerHTML += `<div class="alert warn">Missing session id.</div>`; return; }
    const j = await WBPhase2.verifySession(sid);
    if (j.ok) {
      LS.set('pro', { active: (j.status === 'active' || j.status === 'trialing'), email: j.email, customerId: j.customerId, status: j.status });
      content.innerHTML = `<div class="card"><h2>All set ✅</h2><p>Plan status: <strong>${j.status}</strong></p><button class="btn" onclick="location.hash='#/settings'">Go to Settings</button></div>`;
    } else {
      content.innerHTML += `<div class="alert warn">Error: ${j.error || 'unknown'}</div>`;
    }
  };

  // --------- ADMIN (light) ----------
  routes['#/admin'] = async function () {
    const ok = sessionStorage.getItem('admin_ok') ? true : !!prompt('Enter admin token');
    if (!ok) { content.innerHTML = '<div class="card"><h2>Denied</h2></div>'; return; }
    sessionStorage.setItem('admin_ok', '1');

    let radarCfg = {};
    let lossGuardCfg = {};
    try {
      radarCfg     = await fetch('./assets/radar.json').then(r => r.json());
      lossGuardCfg = await fetch('./assets/loss_guard.json').then(r => r.json());
    } catch { /* keep defaults */ }

    const pro = LS.get('pro', { active: false, status: 'none' });
    content.innerHTML = `
      <div class="card">
        <h2>Admin</h2>
        <div class="grid cols-2">
          <div class="card">
            <h3>Overview</h3>
            <ul class="small">
              <li>Pro (this browser): ${pro.active ? 'PRO' : 'Free'} (${pro.status || 'none'})</li>
              <li>Loss Guard: floor ${lossGuardCfg?.safety_floor_pct ?? 30}% · weekly brake ${lossGuardCfg?.weekly_brake_drawdown_pct ?? -5}%</li>
              <li>Radar Monthly Cap: $${radarCfg?.monthly_tilt_cap_dollars ?? 80}</li>
            </ul>
          </div>
          <div class="card">
            <h3>Policies (v1)</h3>
            <p class="small">Edit caps via <code>/assets/loss_guard.yaml</code> and <code>/assets/radar.yaml</code> (and JSON mirrors). Redeploy or refresh to apply.</p>
          </div>
        </div>
      </div>
    `;
  };

  // --------- Helpers ----------
  function downloadCSV(name, rows) {
    const csv = rows.map(r => r.map(cell => {
      const s = String(cell ?? '');
      return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
    }).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = name;
    a.click();
    URL.revokeObjectURL(a.href);
  }

  // --------- Init ----------
  render();
})();
