/* app.js — Wealth Builder (Static SPA) */
/* Requires: Chart.js loaded in index.html */

const app = document.getElementById('app');
const charts = [];

/* ---------- helpers ---------- */
function el(q){ return document.querySelector(q); }
function killCharts(){ while(charts.length){ try{ charts.pop().destroy(); }catch(_){} } }
async function loadJSON(path){ const r = await fetch(path, { cache: 'no-store' }); return r.json(); }
function routeTo(hash){ location.hash = hash.startsWith('#/') ? hash : '#/home'; }

/* ---------- simple state ---------- */
const state = {
  pro: false,
  userEmail: null
};

/* ---------- router ---------- */
const routes = {
  '/home': renderHome,
  '/portfolio': renderPortfolio,
  '/autopilot': renderAutopilot,
  '/execute': renderExecute,
  '/withdraw': renderWithdraw,
  '/settings': renderSettings,
  '/faq': renderFAQ,
  '/billing': renderBilling
};

function renderRoute(){
  const hash = location.hash || '#/home';
  const path = hash.replace(/^#/, '');
  const fn = routes[path] || renderHome;
  fn();
}

window.addEventListener('hashchange', renderRoute);
window.addEventListener('load', renderRoute);

/* ---------- views ---------- */

async function renderHome(){
  killCharts();
  const dipOn = JSON.parse(localStorage.getItem('dipOn') || 'true');
  const dipCap = parseInt(localStorage.getItem('dipCap') || '80', 10);

  app.innerHTML = `
    <div class="card">
      <h2>What Wealth Builder Does</h2>
      <ul>
        <li><b>Plan</b>: Small weekly contributions (e.g., $5–$25) to a target mix (e.g., 70% growth / 30% safety).</li>
        <li><b>Allocate</b>: Rule-based splits across ETFs (VAS/VGS/IVV/VAF/GOLD), nudging back to target.</li>
        <li><b>Guardrails</b>: Loss Guard floors, caps, and “pause → route to safety” in rough markets.</li>
        <li><b>Micro-tilts</b>: Tiny, capped “opportunity tilts” that never dominate your long-term plan.</li>
        <li><b>Withdraw planner</b>: Safety-first sell plan + CSV you can use at your provider.</li>
        <li><b>Deep links</b>: One-click to Raiz, Spaceship, CommSec Pocket, Stockspot, QuietGrowth to place orders.</li>
      </ul>
      <p class="muted"><b>We don’t hold funds or place orders.</b> You execute at your chosen provider.</p>
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

    <div class="banner">All providers governed equally · No favorites · No commissions influence allocation</div>
  `;

  el('#saveDip')?.addEventListener('click', () => {
    localStorage.setItem('dipOn', JSON.stringify(el('#dip').checked));
    localStorage.setItem('dipCap', String(parseInt(el('#cap').value || '80', 10)));
    alert('Saved.');
  });

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
}

/* ========= UPGRADED ========= */
async function renderPortfolio(){
  killCharts();
  app.innerHTML = `
    <div class="card">
      <h2>Portfolio Overview</h2>
      <div class="pfolio">
        <div class="pf-card">
          <h3 class="pf-title">Growth vs Safety</h3>
          <div class="chartwrap"><canvas id="pieGS"></canvas></div>
          <div class="pf-meta">Target 70/30 · Drift-aware rebalancing</div>
        </div>
        <div class="pf-card">
          <h3 class="pf-title">ETF Performance (Demo)</h3>
          <div class="chartwrap"><canvas id="linePerf"></canvas></div>
          <div class="pf-meta">VAS, VGS, IVV (growth) · VAF, GOLD (safety)</div>
        </div>
      </div>
    </div>
  `;

  // Pie (growth/safety)
  const pie = new Chart(document.getElementById('pieGS'), {
    type:'pie',
    data:{labels:['Growth','Safety'], datasets:[{data:[70,30]}]},
    options:{responsive:true,maintainAspectRatio:false}
  });
  charts.push(pie);

  // Demo lines for ETFs
  const labels = Array.from({length:12},(_,i)=>`M${i+1}`);
  const mk = ()=>labels.map((_,i)=>100+Math.round(i*2 + Math.random()*6));
  const line = new Chart(document.getElementById('linePerf'),{
    type:'line',
    data:{
      labels,
      datasets:[
        {label:'VAS.AX', data:mk(), tension:.25},
        {label:'VGS.AX', data:mk(), tension:.25},
        {label:'IVV.AX', data:mk(), tension:.25},
        {label:'VAF.AX', data:mk(), tension:.25},
        {label:'GOLD.AX', data:mk(), tension:.25},
      ]
    },
    options:{responsive:true,maintainAspectRatio:false}
  });
  charts.push(line);
}

/* ========= UPGRADED ========= */
function renderExecute(){
  killCharts();
  app.innerHTML = `
    <div class="card">
      <h2>Execute at Your Provider</h2>
      <p class="muted">We don’t hold funds or place orders. Choose a provider to place buys/sells.</p>
      <div class="providers">
        ${providerCard('Raiz', 'https://raizinvest.com.au/', 'raiz', [
          'Rounding & recurring micro-investing','Pre-built portfolios','Auto-invest'
        ])}
        ${providerCard('Spaceship Voyager', 'https://www.spaceship.com.au/', 'spaceship', [
          'Managed funds app','Auto-invest','Low minimums'
        ])}
        ${providerCard('CommSec Pocket', 'https://www.commsec.com.au/products/commsec-pocket.html', 'commpocket', [
          'ETF mini-orders','CBA ecosystem','Simple categories'
        ])}
        ${providerCard('Stockspot', 'https://www.stockspot.com.au/', 'stockspot', [
          'Digital advice portfolios','Rebalancing','Goal tracking'
        ])}
        ${providerCard('QuietGrowth', 'https://www.quietgrowth.com.au/', 'quietgrowth', [
          'Managed robo portfolios','Rebalance & reinvest','Long-term focus'
        ])}
      </div>
      <div class="banner" style="margin-top:12px">All providers governed equally · No favorites · Allocation is rules-based</div>
    </div>
  `;
}

function providerCard(name, url, cls, bullets=[]){
  return `
    <div class="pcard ${cls}">
      <div class="phead">${name}</div>
      <div class="pbody">
        <ul style="margin:0 0 6px 18px;padding:0">${bullets.map(b=>`<li>${b}</li>`).join('')}</ul>
        <div class="pmeta">
          <span>Deep link</span><span>•</span><span>Open account</span><span>•</span><span>Place order</span>
        </div>
        <div class="pactions">
          <a class="btn" href="${url}" target="_blank" rel="noopener">Open ${name}</a>
          <button class="btn secondary" onclick="alert('Use Portfolio plan to decide weights, then place order in ${name}.')">How to use</button>
        </div>
      </div>
    </div>
  `;
}

function renderAutopilot(){
  killCharts();
  app.innerHTML = `
    <div class="card">
      <h2>Autopilot</h2>
      <p>Schedule: <b>Weekly — Friday — $50</b></p>
      <ul>
        <li><b>Loss Guard</b>: safety floor 30%, growth overweight cap 7%</li>
        <li><b>Weekly brake</b>: on ~−5% drawdown → pause growth; route to VAF/GOLD</li>
        <li><b>Radar</b>: max 2 actions/week; extra buys capped (~$80/mo)</li>
      </ul>
      <div style="display:flex;gap:8px;flex-wrap:wrap">
        <button class="btn" onclick="alert('Autopilot kept ON in MVP (plan generation only).')">Keep ON</button>
        <button class="btn secondary" onclick="alert('Autopilot paused (demo).')">Pause</button>
      </div>
    </div>
  `;
}

function renderWithdraw(){
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
      { symbol:'VAF.AX', slice: Math.min(amt, amt*0.7) },
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
  });
}

async function renderSettings(){
  killCharts();
  // Detect Stripe redirect ?session_id=...
  const params = new URLSearchParams(location.search);
  const sid = params.get('session_id');
  if (sid) {
    try {
      const r = await fetch(`/api/session-status?session_id=${encodeURIComponent(sid)}`);
      const j = await r.json();
      if (j.status === 'active' || j.status === 'trialing') {
        state.pro = true;
        state.userEmail = j.email || state.userEmail;
        localStorage.setItem('wb_pro', '1');
      }
    } catch(_) {}
    // Clean query string
    history.replaceState({}, '', location.pathname + '#/settings');
  } else {
    state.pro = localStorage.getItem('wb_pro') === '1';
  }

  const riskBand = localStorage.getItem('riskBand') || 'balanced';
  const cadence = localStorage.getItem('cadence') || 'weekly';
  const contribution = localStorage.getItem('contribution') || '50';

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
      <div style="margin-top:10px;display:flex;gap:8px">
        <button class="btn" id="s-save">Save</button>
        ${state.pro ? '' : '<a class="btn" href="#/billing">Go PRO</a>'}
      </div>
    </div>
  `;

  el('#s-save')?.addEventListener('click', () => {
    localStorage.setItem('riskBand', el('#s-risk').value);
    localStorage.setItem('cadence', el('#s-cad').value);
    localStorage.setItem('contribution', el('#s-amt').value);
    alert('Saved.');
  });
}

function renderFAQ(){
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
}

function renderBilling(){
  killCharts();
  app.innerHTML = `
    <div class="card">
      <h2>Billing — Unlock Pro</h2>
      <p>Pro enables persistence, future holdings import, and admin features as they roll in.</p>
      <button class="btn" id="bill-go">Subscribe with Stripe</button>
      <div id="bill-msg" style="margin-top:10px" class="muted"></div>
    </div>
  `;
  el('#bill-go')?.addEventListener('click', async () => {
    try{
      const r = await fetch('/api/checkout', { method:'POST' });
      const j = await r.json();
      if (j.url) { location.href = j.url; } else { el('#bill-msg').textContent = 'Checkout unavailable.'; }
    }catch(_){ el('#bill-msg').textContent = 'Checkout failed.'; }
  });
}

/* ---------- end views ---------- */
