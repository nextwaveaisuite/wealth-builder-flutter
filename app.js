/* Wealth Builder — SPA (Phase 1 + Phase 2)
   - Bold cards, color-coded buttons/badges (from style.css)
   - Phase 2 features when js/phase2.js is present
*/

const app = document.getElementById('app');
const charts = [];
const routes = {};
const state = { pro:false, userEmail:null };

const el = (q) => document.querySelector(q);
const killCharts = () => { while (charts.length) { try{ charts.pop().destroy(); }catch(_){} } };
const hasWB = () => typeof window !== 'undefined' && window.WBPhase2;
const banner = (msg,type='info') => {
  const d = document.createElement('div'); d.className = `alert ${type}`; d.innerHTML = msg; (app||document.body).prepend(d);
};
const downloadCSV = (name, rows) => {
  const csv = rows.map(r => r.map(c=>{
    const s = String(c ?? ''); return /[",\n]/.test(s) ? `"${s.replace(/"/g,'""')}"` : s;
  }).join(',')).join('\n');
  const blob = new Blob([csv], {type:'text/csv;charset=utf-8;'});
  const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = name; a.click(); URL.revokeObjectURL(a.href);
};
const loadJSON = async (path) => (await fetch(path, { cache:'no-store' })).json();

function routeTo(h){ location.hash = h.startsWith('#/') ? h : '#/home'; }
function onHash(){ const h = location.hash || '#/home'; const path = h.replace(/^#/,''); (routes[path] || routes['/home'])(); }
window.addEventListener('hashchange', onHash); window.addEventListener('load', onHash);

/* ---------------- HOME ---------------- */
routes['/home'] = async function renderHome(){
  killCharts();
  const dipOn = JSON.parse(localStorage.getItem('dipOn') || 'true');
  const dipCap = parseInt(localStorage.getItem('dipCap') || '80', 10);

  app.innerHTML = `
    <div class="card">
      <h2>What Wealth Builder Does</h2>
      <ul>
        <li><b>Plan</b>: Small weekly contributions (e.g., $5–$25) to a target mix (e.g., 70% growth / 30% safety).</li>
        <li><b>Allocate</b>: Rule-based splits across ETFs (VAS/VGS/IVV/VAF/GOLD), nudging back to target.</li>
        <li><b>Guardrails</b>: Loss Guard floors, caps, weekly brake → route to safety in rough markets.</li>
        <li><b>Micro-tilts</b>: Tiny, capped “opportunity tilts” that never dominate your long-term plan.</li>
        <li><b>Withdraw planner</b>: Safety-first sell plan + CSV to use at your provider.</li>
        <li><b>Execute</b>: Deep links to Raiz, Spaceship, CommSec Pocket, Stockspot, QuietGrowth.</li>
      </ul>
      <p class="muted"><b>We don’t hold funds or place orders.</b> You execute at your provider.</p>
    </div>

    <div class="card">
      <h2>Next Order Plan</h2>
      <div>Balanced 70/30 • $50 Friday • Drift-aware split</div>
    </div>

    <div class="card">
      <h2>Right Now Tilt</h2>
      <div>Macro stress elevated → route +$10 to Safety (VAF/GOLD)</div>
      <div style="margin-top:8px; display:flex; gap:8px; align-items:center; flex-wrap:wrap;">
        <label><input id="dip" type="checkbox" ${dipOn ? 'checked' : ''}/> Buy the Dip</label>
        <span>Cap ($/month)</span>
        <input id="cap" class="input" style="max-width:120px" value="${dipCap}" />
        <button class="btn" id="saveDip">Save</button>
      </div>
      <small class="muted">Caps limit extra “Radar” buys so tilts never dominate your plan.</small>
    </div>

    <div class="card">
      <h2>Wealth Build (Cumulative)</h2>
      <div class="chartwrap"><canvas id="wealthLine"></canvas></div>
      <small class="muted">Demo curve showing growing contributions + hypothetical gains.</small>
    </div>

    <div class="card">
      <h2>The Easy Passive-Income Playbook</h2>
      <p class="muted">Dividend ETFs + micro-income stack + auto-reinvest. Set and compound.</p>
      <ol>
        <li><b>Target Div ETFs & Blue-Chips</b> — VAS (~3.8%), VGS (~2.6%), CBA/WES/TLS/BHP (4–6%).</li>
        <li><b>Stack Micro-Streams</b> — dividends + 4.5% cash + VAF bonds + Raiz/Spaceship.</li>
        <li><b>Auto-Reinvest</b> — DRP + add $500/mo; 6% avg → $250k+ in ~10 yrs from $50k.</li>
      </ol>
      <button class="btn" id="openCalc">Passive-Income Calculator</button>
    </div>

    <div class="banner">All providers governed equally · No favorites · No commissions influence allocation</div>
  `;

  el('#saveDip')?.addEventListener('click', () => {
    localStorage.setItem('dipOn', JSON.stringify(el('#dip').checked));
    localStorage.setItem('dipCap', String(parseInt(el('#cap').value || '80', 10)));
    alert('Saved.');
  });
  el('#openCalc')?.addEventListener('click', () => routeTo('#/calculator'));

  // Demo wealth line
  const labels = Array.from({length: 12}, (_,i)=>`M${i+1}`);
  let contrib = 50 * 4, total = 0, data = [];
  for (let i=0;i<labels.length;i++){ total += contrib; total *= 1.01; data.push(Math.round(total)); }
  const ctx = document.getElementById('wealthLine');
  charts.push(new Chart(ctx, {
    type:'line',
    data:{ labels, datasets:[{label:'Wealth (AUD)', data, tension:0.25}] },
    options:{ responsive:true, maintainAspectRatio:false }
  }));
};

/* -------------- Portfolio -------------- */
routes['/portfolio'] = async function renderPortfolio(){
  killCharts();
  app.innerHTML = `
    <div class="card">
      <h2>Portfolio Overview</h2>
      <div id="pf-badges" style="margin-bottom:8px;"></div>
      <div class="pfolio">
        <div class="pf-card">
          <h3 class="pf-title">Growth vs Safety</h3>
          <div class="chartwrap"><canvas id="pieGS"></canvas></div>
          <div class="pf-meta">Target 70/30 · Drift-aware rebalancing</div>
        </div>
        <div class="pf-card">
          <h3 class="pf-title">ETF Performance</h3>
          <div class="chartwrap"><canvas id="linePerf"></canvas></div>
          <div class="pf-meta">VAS, VGS, IVV (growth) · VAF, GOLD (safety)</div>
        </div>
      </div>
    </div>
  `;

  const pie = new Chart(document.getElementById('pieGS'), {
    type:'pie', data:{labels:['Growth','Safety'], datasets:[{data:[70,30]}]},
    options:{responsive:true,maintainAspectRatio:false}
  });
  charts.push(pie);

  const perfCtx = document.getElementById('linePerf');

  if (hasWB()){
    try{
      const symbols = ["VAS.AX","VGS.AX","IVV.AX","VAF.AX","GOLD.AX"];
      const quotes = await WBPhase2.fetchQuotes(symbols);
      const labels = (quotes["IVV.AX"]?.points||[]).slice(-120).map(p=>p.t);
      const mk = s => (quotes[s]?.points||[]).slice(-120).map(p=>p.c);

      const line = new Chart(perfCtx, {
        type:'line',
        data:{ labels, datasets:[
          {label:'VAS.AX', data: mk('VAS.AX'), tension:.25},
          {label:'VGS.AX', data: mk('VGS.AX'), tension:.25},
          {label:'IVV.AX', data: mk('IVV.AX'), tension:.25},
          {label:'VAF.AX', data: mk('VAF.AX'), tension:.25},
          {label:'GOLD.AX', data: mk('GOLD.AX'), tension:.25}
        ]},
        options:{responsive:true,maintainAspectRatio:false,interaction:{mode:'index',intersect:false}}
      });
      charts.push(line);

      const radar = await fetch('./assets/radar.json').then(r=>r.json()).catch(()=>({rules:[]}));
      const guard = await fetch('./assets/loss_guard.json').then(r=>r.json()).catch(()=>({weekly_brake_drawdown_pct:-5, info_banner_drawdown_pct:-2}));
      const growthSeries = ["VAS.AX","VGS.AX","IVV.AX"].map(s=>quotes[s]).filter(Boolean);
      const { guard: G, tilts } = WBPhase2.evalSignals({ growthSeries, radarCfg:radar, lossGuardCfg:guard });
      const b=[]; if (G.weeklyBrake) b.push(`<span class="badge warn">Loss Guard: Weekly brake active</span>`);
      for (const t of tilts){ b.push(`<span class="badge ${(t.sleeve||'').toLowerCase()}">Tilt +$${t.add_dollars} → ${t.sleeve}</span>`); }
      if (b.length) el('#pf-badges').innerHTML = b.join(' ');
      WBPhase2.telemetry([{ t:'portfolio_signals', tilts: tilts.length, brake: G.weeklyBrake?1:0 }]);
    }catch(e){
      fallbackPerf(perfCtx);
      banner('Quotes provider unavailable; showing demo performance.', 'warn');
      try{ WBPhase2.telemetry([{ t:'quotes_fail' }]); }catch(_){}
    }
  } else {
    fallbackPerf(perfCtx);
  }

  function fallbackPerf(ctx){
    const labels = Array.from({length:12},(_,i)=>`M${i+1}`);
    const mk = ()=>labels.map((_,i)=>100+Math.round(i*2 + Math.random()*6));
    const line = new Chart(ctx,{
      type:'line',
      data:{ labels, datasets:[
        {label:'VAS.AX', data:mk(), tension:.25},
        {label:'VGS.AX', data:mk(), tension:.25},
        {label:'IVV.AX', data:mk(), tension:.25},
        {label:'VAF.AX', data:mk(), tension:.25},
        {label:'GOLD.AX', data:mk(), tension:.25}
      ]},
      options:{responsive:true,maintainAspectRatio:false}
    });
    charts.push(line);
  }
};

/* -------------- Execute -------------- */
routes['/execute'] = function renderExecute(){
  killCharts();
  app.innerHTML = `
    <div class="card">
      <h2>Execute at Your Provider</h2>
      <p class="muted">We don’t hold funds or place orders. Choose a provider to place buys/sells.</p>
      <div class="providers">
        ${providerCard('Raiz','https://raizinvest.com.au/','raiz',['Rounding & recurring micro-investing','Pre-built portfolios','Auto-invest'])}
        ${providerCard('Spaceship Voyager','https://www.spaceship.com.au/','spaceship',['Managed funds app','Auto-invest','Low minimums'])}
        ${providerCard('CommSec Pocket','https://www.commsec.com.au/products/commsec-pocket.html','commpocket',['ETF mini-orders','CBA ecosystem','Simple categories'])}
        ${providerCard('Stockspot','https://www.stockspot.com.au/','stockspot',['Digital advice portfolios','Rebalancing','Goal tracking'])}
        ${providerCard('QuietGrowth','https://www.quietgrowth.com.au/','quietgrowth',['Managed robo portfolios','Rebalance & reinvest','Long-term focus'])}
      </div>
      <div class="banner" style="margin-top:12px">All providers governed equally · No favorites · Allocation is rules-based</div>
    </div>
  `;
};
function providerCard(name,url,cls,bullets=[]){
  return `
    <div class="pcard ${cls}">
      <div class="phead">${name}</div>
      <div class="pbody">
        <ul style="margin:0 0 6px 18px;padding:0">${bullets.map(b=>`<li>${b}</li>`).join('')}</ul>
        <div class="pmeta"><span>Deep link</span><span>•</span><span>Open account</span><span>•</span><span>Place order</span></div>
        <div class="pactions">
          <a class="btn" href="${url}" target="_blank" rel="noopener">Open ${name}</a>
          <button class="btn secondary" onclick="alert('Use Portfolio plan to decide weights, then place order in ${name}.')">How to use</button>
        </div>
      </div>
    </div>
  `;
}

/* -------------- Autopilot -------------- */
routes['/autopilot'] = function renderAutopilot(){
  killCharts();
  app.innerHTML = `
    <div class="card">
      <h2>Autopilot</h2>
      <p>Schedule: <b>Weekly — Friday — $50</b></p>
      <ul>
        <li><b>Loss Guard</b>: safety floor 30%, growth cap 70%</li>
        <li><b>Weekly brake</b>: on ~−5% drawdown → pause growth; route new buys to safety</li>
        <li><b>Radar</b>: ≤2 actions/week; extra buys capped (~$80/mo)</li>
      </ul>
      <div style="display:flex;gap:8px;flex-wrap:wrap">
        <button class="btn" onclick="alert('Autopilot kept ON (demo).')">Keep ON</button>
        <button class="btn secondary" onclick="alert('Autopilot paused (demo).')">Pause</button>
      </div>
    </div>
  `;
};

/* -------------- Withdraw -------------- */
routes['/withdraw'] = function renderWithdraw(){
  killCharts();
  app.innerHTML = `
    <div class="card">
      <h2>Withdraw (Safety-first Planner)</h2>
      <div style="display:flex;gap:10px;align-items:center;flex-wrap:wrap">
        <label>Amount (AUD)</label>
        <input id="wd-amt" class="input" style="max-width:160px" placeholder="e.g. 200" />
        <button class="btn" id="wd-plan">Plan Withdraw</button>
      </div>
      <div id="wd-out" style="margin-top:12px"></div>
    </div>
  `;
  el('#wd-plan')?.addEventListener('click', () => {
    const amt = parseFloat(el('#wd-amt').value || '0');
    if (!(amt > 0)) return alert('Enter an amount.');
    const legs = [
      { symbol:'VAF.AX',  slice: Math.min(amt, amt*0.7) },
      { symbol:'GOLD.AX', slice: Math.max(0, amt - Math.min(amt, amt*0.7)) }
    ];
    const rows = legs.map(l=>`${l.symbol},${(l.slice).toFixed(2)}`).join('\n');
    const csv = `symbol,amount_aud\n${rows}\n`;
    const blob = new Blob([csv], {type:'text/csv'});
    const url = URL.createObjectURL(blob);
    el('#wd-out').innerHTML = `
      <div class="banner">Planner prefers safety sleeve first. Export and use at your provider.</div>
      <a class="btn" href="${url}" download="withdraw-plan.csv">Download CSV</a>
    `;
    try{ if (hasWB()) WBPhase2.telemetry([{ t:'withdraw_plan', amt }]); }catch(_){}
  });
};

/* -------------- Holdings (CSV) -------------- */
routes['/holdings'] = function renderHoldings(){
  killCharts();
  app.innerHTML = `
    <div class="card">
      <h2>Holdings (Read-Only)</h2>
      <p>Import your broker CSV (CommSec, SelfWealth, Raiz). We normalise for live P/L and drift (when quotes available).</p>
      <div style="display:flex;gap:8px;flex-wrap:wrap;align-items:center">
        <input type="file" accept=".csv" id="h-file"/>
        <button class="btn" id="h-import">Import CSV</button>
      </div>
      <div id="h-out" style="margin-top:12px"></div>
    </div>
  `;
  el('#h-import')?.addEventListener('click', async () => {
    const f = el('#h-file')?.files?.[0];
    if (!f) return alert('Select a CSV file');
    try{
      let list;
      if (hasWB()) list = await WBPhase2.parseHoldingsCSV(f, './assets/holdings_schemas.json');
      else {
        const text = await f.text();
        const lines = text.split(/\r?\n/).filter(Boolean);
        const headers = lines[0].split(',').map(h=>h.trim().replace(/^"|"$/g,''));
        const rows = lines.slice(1).map(line=>line.split(',').map(c=>c.trim().replace(/^"|"$/g,'')));
        const get=(r,n)=>r[headers.indexOf(n)]||'';
        list = rows.map(r=>({
          ticker:(get(r,'Code')||get(r,'Symbol')||'').trim(),
          units:Number((get(r,'Quantity')||get(r,'Units')||'0').replace(/[^0-9.\-]/g,'')),
          cost_base:Number((get(r,'Average Price')||get(r,'Cost Base')||'0').replace(/[^0-9.\-]/g,''))
        })).filter(x=>x.ticker&&x.units>0);
      }
      localStorage.setItem('wb_holdings', JSON.stringify(list));
      el('#h-out').innerHTML = `
        <p>Imported <strong>${list.length}</strong> positions.</p>
        <div class="card small">${list.map(x=>`${x.ticker} — ${x.units} @ ${x.cost_base}`).join('<br/>')}</div>
      `;
      try{ if (hasWB()) WBPhase2.telemetry([{ t:'holdings_import', n:list.length }]); }catch(_){}
    }catch(e){ alert(e.message); }
  });
};

/* -------------- Settings / Billing -------------- */
routes['/settings'] = async function renderSettings(){
  killCharts();
  const params = new URLSearchParams(location.search);
  const sid = params.get('session_id');
  if (sid) {
    try {
      const j = hasWB() ? await WBPhase2.verifySession(sid)
                        : await fetch(`/api/session-status?session_id=${encodeURIComponent(sid)}`).then(r=>r.json());
      if (j.ok ? (j.status==='active'||j.status==='trialing') : (j.status==='active'||j.status==='trialing')){
        state.pro = true; state.userEmail = j.email || state.userEmail;
        localStorage.setItem('wb_pro','1');
        localStorage.setItem('pro', JSON.stringify({active:true,email:j.email,customerId:j.customerId,status:j.status}));
      }
    } catch(_) {}
    history.replaceState({}, '', location.pathname + '#/settings');
  } else {
    state.pro = localStorage.getItem('wb_pro') === '1';
  }

  const riskBand = localStorage.getItem('riskBand') || 'balanced';
  const cadence = localStorage.getItem('cadence') || 'weekly';
  const contribution = localStorage.getItem('contribution') || '50';
  const storedPro = JSON.parse(localStorage.getItem('pro')||'{"active":false,"status":"none"}');
  const showPortal = !!storedPro.customerId && (storedPro.active || storedPro.status==='active' || storedPro.status==='trialing');

  app.innerHTML = `
    <div class="card">
      <h2>Settings ${state.pro ? '— <span class="muted">PRO</span>' : ''}</h2>
      <div style="display:grid;gap:12px;grid-template-columns:repeat(auto-fit,minmax(220px,1fr))">
        <div>
          <label>Risk Band</label>
          <select id="s-risk" class="input" style="width:100%">
            <option value="conservative" ${riskBand==='conservative'?'selected':''}>Conservative</option>
            <option value="balanced" ${riskBand==='balanced'?'selected':''}>Balanced</option>
            <option value="growth" ${riskBand==='growth'?'selected':''}>Growth</option>
          </select>
        </div>
        <div>
          <label>Cadence</label>
          <select id="s-cad" class="input" style="width:100%">
            <option value="weekly" ${cadence==='weekly'?'selected':''}>Weekly</option>
            <option value="fortnightly" ${cadence==='fortnightly'?'selected':''}>Fortnightly</option>
            <option value="monthly" ${cadence==='monthly'?'selected':''}>Monthly</option>
          </select>
        </div>
        <div>
          <label>Contribution (AUD)</label>
          <input id="s-amt" class="input" style="width:100%" value="${contribution}" />
        </div>
      </div>
      <div style="margin-top:10px;display:flex;gap:8px;flex-wrap:wrap">
        <button class="btn" id="s-save">Save</button>
        ${state.pro ? '' : '<a class="btn" href="#/billing">Go PRO</a>'}
        ${showPortal ? '<button class="btn" id="s-portal">Manage Billing</button>' : ''}
      </div>
      <small class="muted" style="display:block;margin-top:8px">We don’t hold funds or place orders.</small>
    </div>
  `;

  el('#s-save')?.addEventListener('click', ()=>{
    localStorage.setItem('riskBand', el('#s-risk').value);
    localStorage.setItem('cadence', el('#s-cad').value);
    localStorage.setItem('contribution', el('#s-amt').value);
    alert('Saved.');
  });
  el('#s-portal')?.addEventListener('click', async ()=>{
    try{
      const pro = JSON.parse(localStorage.getItem('pro')||'{}');
      if (!pro.customerId) return alert('No customer found on this device.');
      if (hasWB()) await WBPhase2.openPortal({ customerId: pro.customerId });
      else {
        const r = await fetch('/api/portal',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({ customerId: pro.customerId })});
        const j = await r.json(); if (j.url) location.href=j.url; else alert(j.error||'Portal unavailable');
      }
    }catch(e){ alert(e.message); }
  });
};

routes['/billing'] = function renderBilling(){
  killCharts();
  app.innerHTML = `
    <div class="card">
      <h2>Billing — Unlock Pro</h2>
      <p>Pro enables persistence, holdings import, and admin features as they roll in.</p>
      <div style="display:flex;gap:8px;flex-wrap:wrap;align-items:center">
        <input id="bill-email" class="input" placeholder="Email (for receipt)" style="max-width:260px"/>
        <button class="btn" id="bill-go">Subscribe with Stripe (Monthly)</button>
      </div>
      <div style="margin-top:8px"><button class="btn secondary" id="bill-life">Lifetime (Optional)</button></div>
      <div id="bill-msg" style="margin-top:10px" class="muted"></div>
    </div>
  `;
  el('#bill-go')?.addEventListener('click', async ()=>{
    try{
      const email = el('#bill-email')?.value || undefined;
      if (hasWB()) await WBPhase2.startCheckout({ email, plan:'monthly' });
      else {
        const r = await fetch('/api/checkout',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({ email, plan:'monthly' })});
        const j = await r.json(); if (j.url) location.href=j.url; else el('#bill-msg').textContent='Checkout unavailable.';
      }
    }catch(_){ el('#bill-msg').textContent='Checkout failed.'; }
  });
  el('#bill-life')?.addEventListener('click', async ()=>{
    try{
      const email = el('#bill-email')?.value || undefined;
      if (hasWB()) await WBPhase2.startCheckout({ email, plan:'lifetime' });
      else {
        const r = await fetch('/api/checkout',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({ email, plan:'lifetime' })});
        const j = await r.json(); if (j.url) location.href=j.url; else el('#bill-msg').textContent='Checkout unavailable.';
      }
    }catch(_){ el('#bill-msg').textContent='Checkout failed.'; }
  });
};

/* -------------- Admin Console -------------- */
routes['/admin'] = async function renderAdmin(){
  killCharts();
  const token = sessionStorage.getItem('admin_token') || prompt('Enter ADMIN_TOKEN');
  if (!token){ app.innerHTML='<div class="card"><h2>Denied</h2></div>'; return; }
  sessionStorage.setItem('admin_token', token);

  const [adminCfg] = await Promise.all([
    fetch('/api/admin-config').then(r=>r.json()).catch(()=>({}))
  ]);
  const defaultRadar = await fetch('./assets/radar.json').then(r=>r.json()).catch(()=>({}));
  const defaultLG    = await fetch('./assets/loss_guard.json').then(r=>r.json()).catch(()=>({}));

  const radar = adminCfg.radar || defaultRadar;
  const guard = adminCfg.loss_guard || defaultLG;

  app.innerHTML = `
    <div class="card">
      <h2>Admin Console</h2>
      <div class="pfolio">
        <div class="pf-card">
          <h3 class="pf-title">Policies (Loss Guard)</h3>
          <div class="kv">
            <div>Safety Floor %</div><div><input class="input" id="lg_floor" value="${guard.safety_floor_pct ?? 30}"/></div>
            <div>Growth Cap %</div><div><input class="input" id="lg_cap" value="${guard.growth_cap_pct ?? 70}"/></div>
            <div>Weekly Brake Drawdown %</div><div><input class="input" id="lg_brake" value="${guard.weekly_brake_drawdown_pct ?? -5}"/></div>
          </div>
        </div>
        <div class="pf-card">
          <h3 class="pf-title">Policies (Radar)</h3>
          <div class="kv">
            <div>Monthly Tilt Cap ($)</div><div><input class="input" id="rd_cap" value="${radar.monthly_tilt_cap_dollars ?? 80}"/></div>
            <div>Max Actions/Week</div><div><input class="input" id="rd_week" value="${radar.max_actions_per_week ?? 2}"/></div>
          </div>
        </div>
      </div>
      <div style="margin-top:10px;display:flex;gap:8px">
        <button class="btn" id="admin-save">Save Policies</button>
        <button class="btn secondary" id="admin-export">Export Telemetry</button>
      </div>
    </div>
  `;

  el('#admin-save').onclick = async ()=>{
    const loss_guard = {
      ...guard,
      safety_floor_pct: Number(el('#lg_floor').value),
      growth_cap_pct: Number(el('#lg_cap').value),
      weekly_brake_drawdown_pct: Number(el('#lg_brake').value)
    };
    const radarCfg = {
      ...radar,
      monthly_tilt_cap_dollars: Number(el('#rd_cap').value),
      max_actions_per_week: Number(el('#rd_week').value)
    };
    const r = await fetch('/api/admin-config', {
      method:'POST',
      headers:{ 'Content-Type':'application/json', 'Authorization': 'Bearer ' + token },
      body: JSON.stringify({ loss_guard, radar:radarCfg })
    });
    const j = await r.json();
    if (j.ok) banner('Saved policies.', 'success'); else banner('Failed to save: '+(j.error||'unknown'), 'danger');
  };
  el('#admin-export').onclick = async ()=>{
    const r = await fetch('/api/telemetry-export', { headers:{ 'Authorization': 'Bearer '+token } });
    const j = await r.json();
    const rows = [['ts','event', 'payload']];
    (j.events||[]).forEach(ev=>rows.push([ev.ts, ev.t || ev.event || '', JSON.stringify(ev)]));
    downloadCSV('telemetry_export.csv', rows);
  };
};

/* -------------- FAQ -------------- */
routes['/faq'] = function renderFAQ(){
  killCharts();
  app.innerHTML = `
    <div class="card">
      <h2>FAQ — Quick Start</h2>
      <ol>
        <li><b>Settings:</b> choose risk band and contribution.</li>
        <li><b>Autopilot:</b> keep ON; Loss Guard adds floors/caps.</li>
        <li><b>Portfolio:</b> see planned splits and charts.</li>
        <li><b>Execute:</b> click your provider to place orders.</li>
        <li><b>Withdraw:</b> export CSV; sell at your provider (T+2 typical).</li>
      </ol>
      <p class="muted">We don’t hold funds or place orders.</p>
    </div>
  `;
};

/* -------------- Billing return -------------- */
routes['/pro/thanks'] = async function renderThanks(){
  killCharts();
  app.innerHTML = `<div class="card"><h2>Thanks!</h2><p>Verifying your subscription…</p></div>`;
  const url=new URL(window.location.href), sid=url.searchParams.get('session_id');
  if (!sid){ app.innerHTML += `<div class="alert warn">Missing session id.</div>`; return; }
  try{
    const j = hasWB() ? await WBPhase2.verifySession(sid)
                      : await fetch(`/api/session-status?session_id=${encodeURIComponent(sid)}`).then(r=>r.json());
    if ((j.ok && (j.status==='active'||j.status==='trialing')) || (j.status==='active'||j.status==='trialing')) {
      localStorage.setItem('pro', JSON.stringify({ active:true, email:j.email, customerId:j.customerId, status:j.status }));
      localStorage.setItem('wb_pro','1');
      app.innerHTML = `<div class="card"><h2>All set ✅</h2><p>Plan status: <strong>${j.status}</strong></p><a class="btn" href="#/settings">Go to Settings</a></div>`;
    } else app.innerHTML += `<div class="alert warn">Error: ${j.error || 'unknown'}</div>`;
  }catch(e){ app.innerHTML += `<div class="alert warn">Error: ${e.message}</div>`; }
};

/* -------------- Calculator route -------------- */
routes['/calculator'] = function renderCalculator(){
  killCharts();
  app.innerHTML = `
    <div class="card">
      <h2>Passive-Income Calculator</h2>
      <label>Starting Investment (AUD)</label>
      <input id="start" class="input" value="50000"/>
      <label>Monthly Add (AUD)</label>
      <input id="add" class="input" value="500"/>
      <label>Average Yield (%)</label>
      <input id="yield" class="input" value="5"/>
      <label>Years to Compound</label>
      <input id="years" class="input" value="10"/>
      <button class="btn" id="calcGo">Calculate</button>
      <div id="calcOut" style="margin-top:12px"></div>
    </div>
  `;
  el('#calcGo').addEventListener('click', ()=>{
    const P = parseFloat(el('#start').value);
    const A = parseFloat(el('#add').value);
    const y = parseFloat(el('#yield').value);
    const r = y/100/12;
    const n = parseInt(el('#years').value)*12;
    let FV = P*Math.pow(1+r,n);
    for(let i=1;i<=n;i++) FV += A*Math.pow(1+r,n-i);
    const income = FV*(y/100)/12;
    el('#calcOut').innerHTML = `<div class="banner">Future Value: <b>$${FV.toFixed(0)}</b><br>Est. Monthly Income: <b>$${income.toFixed(0)}</b></div><small class="muted">Assumes reinvested dividends and constant yield.</small>`;
  });
};
