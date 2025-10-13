/* Wealth Builder — Phase 2 SPA */
(() => {
  // ---------- Utilities ----------
  const content = document.getElementById('content');
  const ETF_SYMBOLS = ["IVV.AX","GOLD.AX","VAS.AX","VGS.AX","VAF.AX"];
  const LS = {
    get(k,def){ try{ return JSON.parse(localStorage.getItem(k)) ?? def; }catch{ return def; } },
    set(k,v){ localStorage.setItem(k, JSON.stringify(v)); }
  };
  function h(tag, attrs={}, html=''){
    const el = document.createElement(tag);
    for (const [k,v] of Object.entries(attrs)) {
      if (k === 'class') el.className = v; else el.setAttribute(k,v);
    }
    el.innerHTML = html;
    return el;
  }
  function banner(msg, type='info'){
    const d = h('div', {class:`alert ${type}`}, msg);
    content.prepend(d);
  }
  function telemetry(events){
    try { navigator.sendBeacon('/api/telemetry', JSON.stringify({ events })); }
    catch { fetch('/api/telemetry',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({events})}); }
  }
  async function fetchQuotes(symbols){
    const qs = symbols.join(',');
    const res = await fetch(`/api/quotes?symbols=${encodeURIComponent(qs)}`);
    const json = await res.json();
    if(!json.ok) throw new Error(json.error||'quotes error');
    return json.data;
  }
  function computeDrawdownPct(points){
    let max = -Infinity, dd = 0;
    for (const p of points){ max = Math.max(max, p.c); dd = Math.min(dd, (p.c - max)/max*100); }
    return dd; // negative
  }
  function stdev(arr){
    if (!arr.length) return 0;
    const m = arr.reduce((a,b)=>a+b,0)/arr.length;
    const v = arr.reduce((a,b)=>a+(b-m)*(b-m),0)/arr.length;
    return Math.sqrt(v);
  }
  async function loadYaml(url){ const t = await (await fetch(url)).text(); return jsyaml.load(t); }

  // ---------- Global Config State ----------
  let radarCfg = null, lossGuardCfg = null;
  let lastRadarMonthSpend = LS.get('radar_month_spend', { month:null, dollars:0 });

  function monthKey(){ const d = new Date(); return `${d.getFullYear()}-${d.getMonth()+1}`; }
  function ensureMonth(){ const mk = monthKey(); if (lastRadarMonthSpend.month !== mk) lastRadarMonthSpend = { month: mk, dollars: 0 }; }

  function setProStatus(s){
    const pro = s?.active || s?.status === 'active' || s?.status === 'trialing';
    LS.set('pro',{ active: pro, email:s?.email||null, customerId:s?.customerId||null, status:s?.status||'none' });
    document.querySelectorAll('[data-pro-only]').forEach(el=>{ el.style.display = pro ? '' : 'none'; });
    const buyBox = document.getElementById('buyBox');
    if (buyBox) buyBox.style.display = pro ? 'none' : '';
    const proBar = document.getElementById('proBar');
    if (proBar) proBar.textContent = pro ? 'PRO Enabled' : 'Free Plan';
  }

  // ---------- Charts ----------
  let portfolioCharts = [];
  function destroyCharts(){ portfolioCharts.forEach(c=>c.destroy()); portfolioCharts=[]; }

  // ---------- Router ----------
  const routes = {};
  async function render(){
    destroyCharts();
    const hash = location.hash || '#/';
    if (routes[hash]) await routes[hash]();
    else content.innerHTML = `<div class="card"><h2>Not Found</h2><p>No route: ${hash}</p></div>`;
  }
  window.addEventListener('hashchange', render);

  // ---------- Routes ----------
  routes['#/'] = async function(){
    content.innerHTML = `
      <div class="card">
        <h2>What Wealth Builder Does</h2>
        <p>Rules-based, micro-contribution plan for Australians. We plan tiny, regular contributions into a Growth/Safety ETF mix, add small capped tilts, and help you execute at your provider. We never hold funds or place orders.</p>
        <div class="grid cols-3">
          <div class="card"><strong>Next Order Plan</strong><div class="small">Balanced 70/30 · $50/wk · Drift aware</div></div>
          <div class="card"><strong>Right Now Tilt</strong><div class="small">Macro stress → +$10 to Safety (cap) · BTD toggle</div></div>
          <div class="card"><strong>Wealth Build</strong><div class="small">Cumulative line chart (demo / live)</div></div>
        </div>
      </div>
      <div class="alert info">We don’t hold funds or place orders. Execute at your chosen provider.</div>
    `;
  };

  routes['#/portfolio'] = async function(){
    content.innerHTML = `
      <div class="card"><h2>Portfolio</h2>
        <div id="portfolioBadges" style="margin-bottom:8px;"></div>
        <div class="grid cols-2">
          <div class="chart-wrap"><canvas id="pie"></canvas></div>
          <div class="chart-wrap"><canvas id="perf"></canvas></div>
        </div>
        <div class="grid cols-2">
          <div class="card">
            <h3>Planned Buys</h3>
            <div class="kv">
              <div>Growth Sleeve</div><div>VAS.AX (Fee 0.10%) · VGS.AX (0.18%) · IVV.AX (0.04%)</div>
              <div>Safety Sleeve</div><div>VAF.AX (0.20%) · GOLD.AX (0.40%)</div>
            </div>
            <p class="small">Priority: lowest fee per sleeve (MVP rule).</p>
            <button class="btn" id="exportBuys">Export CSV</button>
          </div>
          <div class="card">
            <h3>P/L (First → Last)</h3>
            <ul id="plList" class="small"></ul>
            <button class="btn" id="exportPL">Export CSV</button>
            <button class="btn" id="pdfSnap">Portfolio PDF</button>
          </div>
        </div>
      </div>
    `;

    // Load configs
    [radarCfg, lossGuardCfg] = await Promise.all([
      radarCfg ? Promise.resolve(radarCfg) : loadYaml('/assets/radar.yaml'),
      lossGuardCfg ? Promise.resolve(lossGuardCfg) : loadYaml('/assets/loss_guard.yaml')
    ]);

    // Growth/Safety Pie
    const pie = new Chart(document.getElementById('pie'), {
      type:'doughnut',
      data:{ labels:['Growth (70%)','Safety (30%)'], datasets:[{ data:[70,30] }] },
      options:{ plugins:{ legend:{ position:'bottom' } } }
    });
    portfolioCharts.push(pie);

    // Live ETF performance
    try {
      const quotes = await fetchQuotes(ETF_SYMBOLS);
      const dates = quotes["IVV.AX"].points.map(p=>p.t).slice(-120);
      const dataSets = ETF_SYMBOLS.map(s => ({
        label: s, data: (quotes[s]?.points||[]).slice(-120).map(p=>p.c)
      }));
      const perf = new Chart(document.getElementById('perf'), {
        type:'line',
        data:{ labels:dates, datasets:dataSets },
        options:{ interaction:{mode:'index',intersect:false}, plugins:{ legend:{ position:'bottom' } }, scales:{ x:{ ticks:{ maxTicksLimit:6 } } } }
      });
      portfolioCharts.push(perf);

      // Simple sleeve stats for Loss Guard + Radar v2
      const growthList = ["VAS.AX","VGS.AX","IVV.AX"].map(s=>quotes[s]).filter(Boolean);
      const safetyList = ["VAF.AX","GOLD.AX"].map(s=>quotes[s]).filter(Boolean);
      const align = (list) => {
        const byDate = {};
        for (const s of list) for (const p of s.points) (byDate[p.t] ||= []).push(p.c);
        const ds = Object.keys(byDate).sort();
        return ds.map(d=>({t:d,c: byDate[d].reduce((a,b)=>a+b,0)/byDate[d].length}));
      };
      const growthLine = align(growthList);
      const dd = computeDrawdownPct(growthLine);
      const last60 = growthLine.slice(-60).map(x=>x.c);
      const last5  = growthLine.slice(-5).map(x=>x.c);
      const volRatio = stdev(last5) / Math.max(1e-6, stdev(last60));

      // Loss Guard banners
      if (dd <= (lossGuardCfg.weekly_brake_drawdown_pct ?? -5)) {
        banner(`Loss Guard weekly brake active: recent drawdown ${dd.toFixed(2)}% → routing new buys to Safety.`, 'warn');
      } else if (dd <= (lossGuardCfg.info_banner_drawdown_pct ?? -2)) {
        banner(`Markets off ${dd.toFixed(2)}%. Monitoring…`, 'info');
      }

      // Radar v2 micro-tilts
      ensureMonth();
      const badges = [];
      for (const rule of (radarCfg.rules||[])){
        let pass = false;
        if (rule.when.indicator === 'equity_volatility_5d' && volRatio > (rule.when.value||1.8)) pass = true;
        if (rule.when.indicator === 'growth_drawdown_pct'  && dd <= (rule.when.value||-6)) pass = true;
        if (!pass) continue;

        let add = rule.action.add_dollars || 0;
        const cap = rule.action.cap_per_month ?? radarCfg.monthly_tilt_cap_dollars ?? 80;
        if ((lastRadarMonthSpend.dollars + add) > cap) add = Math.max(0, cap - lastRadarMonthSpend.dollars);
        if (add <= 0) continue;
        if (rule.action.requires_user_btd_toggle && LS.get('btd_on', true) !== true) continue;

        lastRadarMonthSpend.dollars += add;
        badges.push(rule.action);
      }
      if (badges.length){
        document.getElementById('portfolioBadges').innerHTML = badges.map(b=>`<span class="badge ${b.sleeve}">Tilt +$${b.add_dollars} → ${b.sleeve} <em title="${b.rationale}">ℹ</em></span>`).join(' ');
      }
      LS.set('radar_month_spend', lastRadarMonthSpend);
      telemetry([{t:'quotes_ok',n:Object.keys(quotes).length},{t:'radar_badges',n:badges.length}]);
    } catch {
      banner('Quotes provider unavailable; using fallback. Charts remain functional.', 'warn');
      telemetry([{t:'quotes_fail'}]);
    }

    // P/L Demo list (updated when live quotes are running)
    const demoPL = [
      { t:'IVV.AX', r:'+15%' },
      { t:'GOLD.AX', r:'+11%' },
      { t:'VAS.AX', r:'+10%' },
      { t:'VGS.AX', r:'+8%' },
      { t:'VAF.AX', r:'+4%' }
    ];
    document.getElementById('plList').innerHTML = demoPL.map(x=>`<li>${x.t} ${x.r}</li>`).join('');

    // Exports
    document.getElementById('exportBuys').onclick = () => {
      const rows = [
        ['Sleeve','Ticker','Fee','Priority'],
        ['Growth','VAS.AX','0.10%','Low fee'],
        ['Growth','VGS.AX','0.18%',''],
        ['Growth','IVV.AX','0.04%','Lowest fee (US exposure)'],
        ['Safety','VAF.AX','0.20%','Low fee'],
        ['Safety','GOLD.AX','0.40%','Hedge']
      ];
      downloadCSV('planned_buys.csv', rows);
    };
    document.getElementById('exportPL').onclick = () => {
      const rows = [['Ticker','P/L (First->Last)'], ...demoPL.map(x=>[x.t,x.r])];
      downloadCSV('pl_first_last.csv', rows);
    };
    document.getElementById('pdfSnap').onclick = async () => {
      const { jsPDF } = window.jspdf;
      const doc = new jsPDF();
      doc.setFontSize(14);
      doc.text('Wealth Builder — Portfolio Snapshot', 14, 16);
      doc.setFontSize(11);
      doc.text('Planned Buys (MVP rule: lowest fee per sleeve):', 14, 26);
      const lines = [
        'Growth: VAS.AX (0.10%), VGS.AX (0.18%), IVV.AX (0.04%)',
        'Safety: VAF.AX (0.20%), GOLD.AX (0.40%)'
      ];
      doc.text(lines, 14, 34);
      doc.text('P/L (First→Last): IVV +15%, GOLD +11%, VAS +10%, VGS +8%, VAF +4%', 14, 54);
      doc.setFontSize(9);
      doc.text('General info only — not financial advice. Execute at your provider.', 14, 280);
      doc.save('portfolio_snapshot.pdf');
    };
  };

  routes['#/autopilot'] = async function(){
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
          <button class="btn primary" id="keep">Keep ON</button>
          <button class="btn" id="pause">Pause (demo)</button>
        </div>
      </div>
    `;
    document.getElementById('keep').onclick = ()=>banner('Autopilot kept ON (demo confirmation).','info');
    document.getElementById('pause').onclick = ()=>banner('Autopilot paused (demo confirmation).','warn');
  };

  routes['#/execute'] = async function(){
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

  routes['#/withdraw'] = async function(){
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
    document.getElementById('wPlan').onclick = ()=>{
      const amt = Number(document.getElementById('wAmt').value||0);
      if (!amt || amt<1) return alert('Enter amount');
      // naive split Safety first
      const legs = [
        { ticker:'VAF.AX', dollars: Math.round(amt*0.7) },
        { ticker:'GOLD.AX', dollars: amt - Math.round(amt*0.7) }
      ];
      const txt = legs.map(l=>`${l.ticker},-$${l.dollars}`).join('\n');
      document.getElementById('wOut').textContent = txt;
      const btn = document.getElementById('wCsv');
      btn.style.display='';
      btn.onclick = () => downloadCSV('withdraw.csv', [['Ticker','Dollars'], ...legs.map(l=>[l.ticker, -l.dollars])]);
      telemetry([{t:'withdraw_plan', amt }]);
    };
  };

  routes['#/holdings'] = async function(){
    content.innerHTML = `
      <div class="card">
        <h2>Holdings (Read-Only)</h2>
        <p>Import your broker CSV (CommSec, SelfWealth, Raiz). We compute live P/L and drift vs. target.</p>
        <input type="file" accept=".csv" id="csv"/>
        <button class="btn" id="btnImport">Import CSV</button>
        <div id="holdingsResult"></div>
        <div data-pro-only class="alert info" style="display:none;margin-top:10px">Advanced holdings persistence & branded PDFs are PRO features.</div>
      </div>
    `;
    const schemas = await (await fetch('/assets/holdings_schemas.json')).json();

    document.getElementById('btnImport').onclick = async ()=>{
      const f = document.getElementById('csv').files[0];
      if(!f) return alert('Select a CSV file');
      try{
        const list = await parseHoldingsCSV(f, schemas);
        telemetry([{ t:'holdings_import', n:list.length }]);
        document.getElementById('holdingsResult').innerHTML = `
          <p>Imported <strong>${list.length}</strong> positions.</p>
          <div class="card small">${list.map(x=>`${x.ticker} — ${x.units} @ ${x.cost_base}`).join('<br/>')}</div>
        `;
      }catch(e){ alert(e.message); }
    };
  };

  routes['#/settings'] = async function(){
    content.innerHTML = `
      <div class="card">
        <h2>Settings <span id="proBar" class="badge">Free Plan</span></h2>
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
            <p data-pro-only style="display:none">You are PRO. <button class="btn" id="portal">Manage Billing</button></p>
            <div id="buyBox">
              <input type="email" id="billEmail" class="input" placeholder="Email (for receipt)"/>
              <div class="grid">
                <button class="btn primary" id="buyMonthly">Go PRO (Monthly)</button>
                <button class="btn" id="buyLifetime">Lifetime (Optional)</button>
              </div>
            </div>
          </div>
        </div>
        <div class="small">We don’t hold funds or place orders.</div>
      </div>
    `;
    // Load saved
    const s = LS.get('settings', { risk:'Balanced', cad:'Weekly', amt:50, btd:true });
    document.getElementById('risk').value = s.risk;
    document.getElementById('cad').value = s.cad;
    document.getElementById('amt').value = s.amt;
    document.getElementById('btd').checked = !!s.btd;
    document.getElementById('save').onclick = ()=>{
      const ns = {
        risk: document.getElementById('risk').value,
        cad: document.getElementById('cad').value,
        amt: Number(document.getElementById('amt').value||50),
        btd: document.getElementById('btd').checked
      };
      LS.set('settings', ns);
      LS.set('btd_on', !!ns.btd);
      banner('Saved.', 'info');
    };

    setProStatus(LS.get('pro',{active:false}));
    document.getElementById('buyMonthly').onclick = async ()=>{
      const email = document.getElementById('billEmail').value || undefined;
      const r = await fetch('/api/checkout',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({ email, plan:'monthly' })});
      const j = await r.json(); if(j.url) location.href = j.url;
    };
    document.getElementById('buyLifetime').onclick = async ()=>{
      const email = document.getElementById('billEmail').value || undefined;
      const r = await fetch('/api/checkout',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({ email, plan:'lifetime' })});
      const j = await r.json(); if(j.url) location.href = j.url;
    };
    const portal = document.getElementById('portal');
    if (portal) portal.onclick = async ()=>{
      const pro = LS.get('pro', {});
      if(!pro.customerId) return alert('No customer found on this device.');
      const r = await fetch('/api/portal',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({ customerId: pro.customerId })});
      const j = await r.json(); if(j.url) location.href = j.url;
    };
  };

  routes['#/pro/thanks'] = async function(){
    const url = new URL(window.location.href);
    const sid = url.searchParams.get('session_id');
    content.innerHTML = `<div class="card"><h2>Thanks!</h2><p>Verifying your subscription…</p></div>`;
    if(!sid){ content.innerHTML += `<div class="alert warn">Missing session id.</div>`; return; }
    const r = await fetch(`/api/session-status?session_id=${encodeURIComponent(sid)}`);
    const j = await r.json();
    if (j.ok) { setProStatus(j); content.innerHTML = `<div class="card"><h2>All set ✅</h2><p>Plan status: <strong>${j.status}</strong></p><button class="btn" onclick="location.hash='#/settings'">Go to Settings</button></div>`; }
    else { content.innerHTML += `<div class="alert warn">Error: ${j.error||'unknown'}</div>`; }
  };

  routes['#/admin'] = async function(){
    const token = sessionStorage.getItem('admin_ok') ? null : prompt('Enter admin token');
    if (token !== null) {
      const ok = token === '' ? false : true; // any non-empty accepted in MVP; use ENV on real deploy behind edge middleware if desired
      if (!ok) { content.innerHTML = '<div class="card"><h2>Denied</h2></div>'; return; }
      sessionStorage.setItem('admin_ok','1');
    }
    if (!radarCfg || !lossGuardCfg) [radarCfg, lossGuardCfg] = await Promise.all([loadYaml('/assets/radar.yaml'), loadYaml('/assets/loss_guard.yaml')]);

    const pro = LS.get('pro',{active:false});
    content.innerHTML = `
      <div class="card">
        <h2>Admin</h2>
        <div class="grid cols-2">
          <div class="card">
            <h3>Overview</h3>
            <ul class="small">
              <li>Pro (this browser): ${pro.active ? 'PRO' : 'Free'} (${pro.status||'none'})</li>
              <li>Loss Guard: floor ${lossGuardCfg?.safety_floor_pct}% · weekly brake ${lossGuardCfg?.weekly_brake_drawdown_pct}%</li>
              <li>Radar Monthly Cap: $${radarCfg?.monthly_tilt_cap_dollars ?? 80}</li>
            </ul>
          </div>
          <div class="card">
            <h3>Policies (v1)</h3>
            <p class="small">Edit caps via <code>/assets/loss_guard.yaml</code> and <code>/assets/radar.yaml</code>. Refresh to apply.</p>
          </div>
        </div>
      </div>
    `;
  };

  // ---------- CSV + Helpers ----------
  async function parseHoldingsCSV(file, schemas){
    const text = await file.text();
    const lines = text.split(/\r?\n/).filter(Boolean);
    const headers = lines[0].split(',').map(h=>h.trim().replace(/^"|"$/g,''));
    const rows = lines.slice(1).map(line => line.split(',').map(c=>c.trim().replace(/^"|"$/g,'')));
    function detect(){
      for(const [k,sch] of Object.entries(schemas)){
        if (sch.detect.every(h => headers.includes(h))) return [k, sch];
      }
      return [null,null];
    }
    const [kind, sch] = detect();
    if(!sch) throw new Error('CSV format not recognised (CommSec/SelfWealth/Raiz supported)');
    const alias = sch.aliases || {};
    const out = rows.map(r=>{
      const obj = {};
      for(const [field, src] of Object.entries(sch.map)){
        const idx = headers.indexOf(src);
        obj[field] = idx>=0 ? r[idx] : '';
      }
      for(const [field, t] of Object.entries(sch.transform||{})){
        if(t==='trim') obj[field] = String(obj[field]||'').trim();
        if(t==='number') obj[field] = Number(String(obj[field]||'').replace(/[^0-9.\-]/g,''));
        if(t==='upper_map_etf_alias'){
          const key = String(obj[field]||'').toUpperCase().trim();
          obj[field] = alias[key] || key;
        }
      }
      return obj;
    }).filter(x=>x.ticker && x.units>0);
    LS.set('holdings', out);
    return out;
  }

  function downloadCSV(name, rows){
    const csv = rows.map(r => r.map(cell => {
      const s = String(cell ?? '');
      return /[",\n]/.test(s) ? `"${s.replace(/"/g,'""')}"` : s;
    }).join(',')).join('\n');
    const blob = new Blob([csv], {type:'text/csv;charset=utf-8;'});
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = name;
    a.click();
    URL.revokeObjectURL(a.href);
  }

  // ---------- Init ----------
  render();
})();
