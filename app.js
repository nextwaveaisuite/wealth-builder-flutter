// Wealth Builder — Static SPA with charts (Chart.js)
// Hash router; assets from /assets/*.json; mock price series in /assets/prices.json
// Billing via Stripe Checkout (optional), Pro flag stored in localStorage

const el = (s) => document.querySelector(s);
const app = el('#app');
let charts = []; // track Chart.js instances to destroy between views

const routes = {
  '/home': renderHome,
  '/portfolio': renderPortfolio,
  '/autopilot': renderAutopilot,
  '/execute': renderExecute,
  '/withdraw': renderWithdraw,
  '/settings': renderSettings,
  '/legal': renderLegal,
  '/billing': renderBilling,
};

async function loadJSON(path){ const r = await fetch(path, { cache: 'no-store' }); return r.json(); }
function killCharts(){ charts.forEach(c=>c.destroy()); charts=[]; }

// ---------------- VIEWS ----------------

async function renderHome(){
  killCharts();
  let dipOn = JSON.parse(localStorage.getItem('dipOn') || 'true');
  let dipCap = parseInt(localStorage.getItem('dipCap') || '80', 10);

  app.innerHTML = `
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
      <canvas id="wealthLine" height="120"></canvas>
      <small class="muted">Demo curve showing growing contributions + hypothetical gains.</small>
    </div>

    <div class="banner">All providers governed equally · No favorites · No commissions influence allocation</div>
  `;

  el('#saveDip').onclick = () => {
    localStorage.setItem('dipOn', JSON.stringify(el('#dip').checked));
    localStorage.setItem('dipCap', String(parseInt(el('#cap').value || '80', 10)));
    alert('Saved.');
  };

  // Simple illustrative wealth curve (no live pricing)
  const labels = Array.from({length: 12}, (_,i)=>`M${i+1}`);
  let contrib = 50 * 4; // $/month
  let total = 0, data = [];
  for (let i=0;i<labels.length;i++){
    total += contrib;
    total *= 1.01; // +1% monthly illustrative growth
    data.push(Math.round(total));
  }
  const ctx = document.getElementById('wealthLine');
  charts.push(new Chart(ctx, {
    type:'line',
    data:{
      labels,
      datasets:[{label:'Wealth (AUD)', data, tension:0.25}]
    },
    options:{ responsive:true, maintainAspectRatio:false }
  }));
}

async function renderPortfolio(){
  killCharts();
  const uni = await loadJSON('/assets/universe.json');
  const prices = await loadJSON('/assets/prices.json');

  // Example target allocation for Balanced (70/30)
  const growth = uni.etfs.filter(x=>x.sleeve==='growth').map(x=>x.symbol);
  const safety = uni.etfs.filter(x=>x.sleeve==='safety').map(x=>x.symbol);
  const alloc = { growth: 0.7, safety: 0.3 };

  app.innerHTML = `
    <div class="card">
      <h2>Portfolio — Allocation & Performance</h2>
      <div class="grid cols-2">
        <div>
          <h3>Growth vs Safety</h3>
          <canvas id="allocPie" height="180"></canvas>
          <small class="muted">Balanced target (demo): Growth 70% / Safety 30%.</small>
        </div>
        <div>
          <h3>Planned Buys</h3>
          <ul>${uni.etfs.map(e=>`<li>${e.symbol} — ${e.sleeve}</li>`).join('')}</ul>
          <small class="muted">Lowest-fee within each sleeve get priority (MVP rule).</small>
        </div>
      </div>
    </div>

    <div class="card">
      <h2>ETF Performance (Demo)</h2>
      <canvas id="perfLines" height="220"></canvas>
      <div id="leaders" style="margin-top:8px;"></div>
      <small class="muted">Illustrative lines from /assets/prices.json (not live data).</small>
    </div>
  `;

  // Pie: growth vs safety target
  const pieCtx = document.getElementById('allocPie');
  charts.push(new Chart(pieCtx, {
    type:'pie',
    data:{
      labels:['Growth','Safety'],
      datasets:[{ data:[alloc.growth*100, alloc.safety*100] }]
    },
    options:{ responsive:true, maintainAspectRatio:false }
  }));

  // Lines: symbols time-series (normalized to 100)
  const syms = ['VAS.AX','VGS.AX','IVV.AX','VAF.AX','GOLD.AX'];
  const lbls = prices.labels;
  const ds = syms.map((s)=> {
    const series = prices.series[s] || [];
    if (!series.length) return { label:s, data:[] };
    const base = series[0].p || 100;
    const data = series.map(pt => Math.round((pt.p/base)*100));
    return { label: s, data, tension:0.25 };
  });

  const lineCtx = document.getElementById('perfLines');
  charts.push(new Chart(lineCtx, {
    type:'line',
    data:{ labels: lbls, datasets: ds },
    options:{ responsive:true, maintainAspectRatio:false }
  }));

  // Leaders: compute % change from first to last
  const perf = syms.map(s=>{
    const ser = prices.series[s]||[];
    if (ser.length<2) return { s, pct: 0 };
    const pct = ((ser[ser.length-1].p - ser[0].p) / ser[0].p) * 100;
    return { s, pct: Math.round(pct*10)/10 };
  }).sort((a,b)=>b.pct-a.pct);

  el('#leaders').innerHTML = `
    <strong>Leaders (period change):</strong>
    <ul>${perf.map(p=>`<li>${p.s} — ${p.pct >= 0 ? '+' : ''}${p.pct}%</li>`).join('')}</ul>
  `;
}

async function renderAutopilot(){
  killCharts();
  const rules = await loadJSON('/assets/rules.json');
  const loss = await loadJSON('/assets/loss_guard.json');
  const radar = await loadJSON('/assets/radar.json');
  app.innerHTML = `
    <div class="card">
      <h2>Autopilot</h2>
      <div>Schedule: Weekly • DCA <b>ON</b> • Radar <b>ON</b></div>
      <hr/>
      <h3>Targets (Balanced)</h3>
      <div>Growth: ${Math.round(rules.risk_bands.balanced.growth*100)}% · Safety: ${Math.round(rules.risk_bands.balanced.safety*100)}%</div>
      <h3>Guardrails</h3>
      <ul>
        <li>Weekly brake: ${loss.weekly_brake_drop_pct}%</li>
        <li>Safety floor: ${Math.round(loss.safety_floor*100)}%</li>
        <li>Max growth overweight: ${Math.round(loss.max_growth_overweight*100)}%</li>
      </ul>
      <h3>Radar caps</h3>
      <ul>
        <li>Max actions/week: ${radar.max_actions_per_week}</li>
        <li>Monthly extra cap: ~$${radar.monthly_extra_cap}</li>
      </ul>
    </div>
  `;
}

async function renderExecute(){
  killCharts();
  app.innerHTML = `
    <div class="card">
      <h2>Execute (Deep Links)</h2>
      <div class="grid cols-2">
        <button class="btn" onclick="window.open('https://www.raizinvest.com.au/','_blank')">Raiz</button>
        <button class="btn" onclick="window.open('https://www.spaceship.com.au/','_blank')">Spaceship</button>
        <button class="btn" onclick="window.open('https://www.commsec.com.au/','_blank')">CommSec Pocket</button>
        <button class="btn" onclick="window.open('https://www.stockspot.com.au/','_blank')">Stockspot</button>
        <button class="btn" onclick="window.open('https://www.quietgrowth.com.au/','_blank')">QuietGrowth</button>
      </div>
      <p><small class="muted">You execute at your chosen provider. No custody in this app.</small></p>
    </div>
  `;
}

async function renderWithdraw(){
  killCharts();
  app.innerHTML = `
    <div class="card">
      <h2>Withdraw</h2>
      <div class="grid cols-2">
        <input id="amt" class="input" placeholder="Amount (AUD)" />
        <button class="btn" id="go">Create Sell Plan</button>
      </div>
      <div id="plan" style="margin-top:10px;"></div>
      <button class="btn" id="csv" style="margin-top:10px;display:none">Download CSV</button>
    </div>
  `;

  el('#go').onclick = () => {
    const v = parseFloat(el('#amt').value || '0');
    if(!v || v<=0){ el('#plan').innerHTML = '<small class="muted">Enter a valid amount.</small>'; return; }

    // Simple safety-first split example
    const vaf = Math.max(50, Math.round(v * 0.6));
    const gold = Math.max(0, Math.round(v - vaf));

    const rows = [
      ['Symbol','Action','Amount(AUD)','Notes'],
      ['VAF.AX','SELL', vaf, 'Safety first'],
      ['GOLD.AX','SELL', gold, 'Then gold'],
    ];

    el('#plan').innerHTML = 'Plan: Sell Safety sleeve first (VAF/GOLD), min trade $50.';
    const blob = new Blob([rows.map(r=>r.join(',')).join('\n')], {type:'text/csv'});
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href=url; a.download=`withdraw_${Date.now()}.csv`;

    const btn = el('#csv');
    btn.style.display='inline-block';
    btn.onclick=()=>a.click();
  };
}

async function renderSettings(){
  killCharts();
  // Detect Stripe redirect (?session_id=...) inside the hash, e.g. #/settings?session_id=cs_...
  const rawHash = location.hash || '';
  const qp = rawHash.includes('?') ? rawHash.split('?')[1] : '';
  const params = new URLSearchParams(qp);
  const sid = params.get('session_id');

  let pro = JSON.parse(localStorage.getItem('pro') || 'false');
  let message = '';

  if (sid) {
    try {
      const res = await fetch(`/api/session-status?session_id=${encodeURIComponent(sid)}`);
      const data = await res.json();
      if (data && (data.status === 'active' || data.status === 'trialing')) {
        pro = true;
        localStorage.setItem('pro', 'true');
        message = '✅ Pro subscription active.';
      } else {
        message = '⚠️ Subscription not active yet.';
      }
    } catch {
      message = '⚠️ Could not verify subscription.';
    }
  }

  app.innerHTML = `
    <div class="card">
      <h2>Settings ${pro ? '<span style="font-size:0.6em;color:#0a7">• PRO</span>' : ''}</h2>
      ${message ? `<p><small class="muted">${message}</small></p>` : ''}
      <div class="grid cols-2">
        <div>
          <h3>Risk Band</h3>
          <select class="input">
            <option>Conservative</option>
            <option selected>Balanced</option>
            <option>Growth</option>
          </select>
        </div>
        <div>
          <h3>Contribution</h3>
          <input class="input" placeholder="$50 / week" />
        </div>
      </div>
      <hr/>
      <p><small class="muted">Billing is for software access only — not investing or funding.</small></p>
    </div>
  `;
}

async function renderLegal(){
  killCharts();
  app.innerHTML = `
    <div class="card legal">
      <h2>Legal</h2>
      <a href="/legal/privacy.html" target="_blank">Privacy Policy</a>
      <a href="/legal/terms.html" target="_blank">Terms of Service</a>
      <a href="/legal/disclaimer.html" target="_blank">General Advice & Risk Disclaimer</a>
      <a href="/legal/about.html" target="_blank">About</a>
      <a href="/legal/contact.html" target="_blank">Contact</a>
    </div>
  `;
}

async function renderBilling(){
  killCharts();
  app.innerHTML = `
    <div class="card">
      <h2>Billing (Software Access)</h2>
      <p>Subscribe to unlock pro features. This payment is for software access only — <b>not</b> for investing or funding a brokerage account.</p>
      <button class="btn" id="buy">Subscribe with Stripe</button>
      <p><small class="muted">We never see your card. Stripe handles all payment and PCI compliance.</small></p>
    </div>
  `;
  el('#buy').onclick = async () => {
    try {
      const res = await fetch('/api/checkout', { method: 'POST' });
      const data = await res.json();
      if (data && data.url) {
        location.href = data.url;
      } else {
        alert('Checkout init failed.');
      }
    } catch (e) {
      alert('Network error starting checkout.');
    }
  };
}

// ---------------- ROUTER ----------------
function router(){
  const hash = location.hash.replace('#','') || '/home';
  const base = hash.split('?')[0]; // strip query
  const view = routes[base] || renderHome;
  view();
}
addEventListener('hashchange', router);
addEventListener('load', router);
