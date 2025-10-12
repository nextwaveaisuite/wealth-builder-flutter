// Wealth Builder — Static SPA with FAQ + compliant footer links

const el = (s) => document.querySelector(s);
const app = el('#app');
let charts = [];

const routes = {
  '/home': renderHome,
  '/portfolio': renderPortfolio,
  '/autopilot': renderAutopilot,
  '/execute': renderExecute,
  '/withdraw': renderWithdraw,
  '/settings': renderSettings,
  '/faq': renderFAQ,
  '/legal': renderLegal,
  '/billing': renderBilling,
};

async function loadJSON(path){ const r = await fetch(path, { cache: 'no-store' }); return r.json(); }
function killCharts(){ charts.forEach(c=>c.destroy()); charts=[]; }

// ---------- HOME ----------
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
      <div class="chartwrap"><canvas id="wealthLine"></canvas></div>
      <small class="muted">Demo curve showing growing contributions + hypothetical gains.</small>
    </div>

    <div class="banner">All providers governed equally · No favorites · No commissions influence allocation</div>
  `;

  el('#saveDip').onclick = () => {
    localStorage.setItem('dipOn', JSON.stringify(el('#dip').checked));
    localStorage.setItem('dipCap', String(parseInt(el('#cap').value || '80', 10)));
    alert('Saved.');
  };

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

// ---------- PORTFOLIO ----------
async function renderPortfolio(){
  killCharts();
  const uni = await loadJSON('/assets/universe.json');
  const prices = await loadJSON('/assets/prices.json');
  const alloc = { growth: 0.7, safety: 0.3 };

  app.innerHTML = `
    <div class="card">
      <h2>Portfolio — Allocation & Performance</h2>
      <div class="grid cols-2">
        <div>
          <h3>Growth vs Safety</h3>
          <div class="chartwrap"><canvas id="allocPie"></canvas></div>
          <small class="muted">Balanced target (demo): Growth 70% / Safety 30%.</small>
        </div>
        <div>
          <h3>Planned Buys</h3>
          <div class="tiles" id="plannedTiles"></div>
          <small class="muted">Lowest-fee within each sleeve get priority (MVP rule).</small>
        </div>
      </div>
    </div>

    <div class="card">
      <h2>ETF Performance (Demo)</h2>
      <div class="chartwrap"><canvas id="perfLines"></canvas></div>
      <div class="tiles" id="plTiles"></div>
      <small class="muted">Illustrative lines from /assets/prices.json (not live data).</small>
    </div>
  `;

  const planned = uni.etfs.map(e=>(
    `<div class="tile">
       <div class="hdr"><span>${e.symbol}</span><span class="badge-pill">${e.sleeve.toUpperCase()}</span></div>
       <div>Fee: ${e.fee.toFixed(2)}%</div>
     </div>`
  )).join('');
  el('#plannedTiles').innerHTML = planned;

  const pieCtx = document.getElementById('allocPie');
  charts.push(new Chart(pieCtx, {
    type:'pie',
    data:{ labels:['Growth','Safety'], datasets:[{ data:[alloc.growth*100, alloc.safety*100] }] },
    options:{ responsive:true, maintainAspectRatio:false }
  }));

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

  const perf = syms.map(s=>{
    const ser = prices.series[s]||[];
    if (ser.length<2) return { s, pct: 0 };
    const pct = ((ser[ser.length-1].p - ser[0].p) / ser[0].p) * 100;
    return { s, pct: Math.round(pct*10)/10 };
  }).sort((a,b)=>b.pct-a.pct);

  el('#plTiles').innerHTML = perf.map(p=>{
    const cls = p.pct >= 0 ? 'gain' : 'loss';
    return `
      <div class="tile">
        <div class="hdr"><span>${p.s}</span><span class="badge-pill">P/L</span></div>
        <div class="${cls}" style="font-size:20px;font-weight:900">${p.pct>=0?'+':''}${p.pct}%</div>
        <small class="muted">From first to last data point</small>
      </div>`;
  }).join('');
}

// ---------- AUTOPILOT ----------
async function renderAutopilot(){
  killCharts();
  const rules = await loadJSON('/assets/rules.json');
  const loss = await loadJSON('/assets/loss_guard.json');
  const radar = await loadJSON('/assets/radar.json');

  const nextRun = 'Fri 10:00am';
  const dcaOn = true;
  const radarOn = true;
  const guardActive = false;

  app.innerHTML = `
    <div class="card">
      <h2>Autopilot — Status & Controls</h2>
      <div class="kpis">
        <div class="kpi">
          <div class="label">Next Run</div>
          <div class="value">${nextRun}</div>
          <div class="label">Cadence</div>
          <div class="pill on">Weekly</div>
        </div>
        <div class="kpi">
          <div class="label">DCA</div>
          <div class="value">${dcaOn ? 'ON' : 'OFF'}</div>
          <div class="progress" title="Target funding this cycle"><span style="width:68%"></span></div>
          <small class="muted">~$34 of $50 planned</small>
        </div>
        <div class="kpi">
          <div class="label">Radar Tilts</div>
          <div class="value">${radarOn ? 'ON' : 'OFF'}</div>
          <div class="label">Monthly cap used</div>
          <div class="progress"><span style="width:25%"></span></div>
          <small class="muted">$20 / $80</small>
        </div>
        <div class="kpi">
          <div class="label">Loss Guard</div>
          <div class="value">${guardActive ? 'BRAKE' : 'NORMAL'}</div>
          <div class="pill ${guardActive ? 'off' : 'on'}">${guardActive ? 'Growth paused' : 'Routing normal'}</div>
        </div>
      </div>
    </div>

    <div class="card">
      <h3>Targets (Balanced)</h3>
      <div class="tiles">
        <div class="tile">
          <div class="hdr"><span>Growth Sleeve</span><span class="badge-pill">TARGET</span></div>
          <div class="value" style="font-size:20px;font-weight:900">${Math.round(rules.risk_bands.balanced.growth*100)}%</div>
          <small class="muted">VAS / VGS / IVV (fee-weighted)</small>
        </div>
        <div class="tile">
          <div class="hdr"><span>Safety Sleeve</span><span class="badge-pill">TARGET</span></div>
          <div class="value" style="font-size:20px;font-weight:900">${Math.round(rules.risk_bands.balanced.safety*100)}%</div>
          <small class="muted">VAF / GOLD</small>
        </div>
        <div class="tile">
          <div class="hdr"><span>Guardrails</span><span class="badge-pill">ACTIVE</span></div>
          <ul style="margin:0;padding-left:18px">
            <li>Weekly brake: ${loss.weekly_brake_drop_pct}%</li>
            <li>Safety floor: ${Math.round(loss.safety_floor*100)}%</li>
            <li>Max growth overweight: ${Math.round(loss.max_growth_overweight*100)}%</li>
          </ul>
        </div>
      </div>
    </div>

    <div class="card">
      <h3>Schedule & Controls</h3>
      <div class="grid cols-3">
        <div class="tile">
          <div class="hdr"><span>Cadence</span></div>
          <select class="input" id="cadence">
            <option selected>Weekly</option>
            <option>Fortnightly</option>
            <option>Monthly</option>
          </select>
        </div>
        <div class="tile">
          <div class="hdr"><span>DCA</span></div>
          <button class="btn" id="toggleDCA">${dcaOn ? 'Turn OFF' : 'Turn ON'}</button>
          <small class="muted">Dollar-cost averaging engine</small>
        </div>
        <div class="tile">
          <div class="hdr"><span>Radar</span></div>
          <button class="btn" id="toggleRadar">${radarOn ? 'Turn OFF' : 'Turn ON'}</button>
          <small class="muted">Tiny opportunity tilts (capped)</small>
        </div>
      </div>
      <div style="margin-top:10px">
        <button class="btn" id="saveAuto">Save Settings</button>
      </div>
    </div>

    <div class="card">
      <h3>This Cycle Preview</h3>
      <div class="tiles">
        <div class="tile">
          <div class="hdr"><span>Growth</span><span class="badge-pill">PLAN</span></div>
          <div>VAS + VGS + IVV micro-buys to reduce drift</div>
        </div>
        <div class="tile">
          <div class="hdr"><span>Safety</span><span class="badge-pill">PLAN</span></div>
          <div>Maintain ≥ ${Math.round(loss.safety_floor*100)}% floor via VAF / GOLD</div>
        </div>
        <div class="tile">
          <div class="hdr"><span>Radar Tilt</span><span class="badge-pill">CAP $${radar.monthly_extra_cap}</span></div>
          <div>Macro stress → +$10 to Safety</div>
        </div>
      </div>
    </div>
  `;

  el('#saveAuto').onclick = () => alert('Saved Autopilot settings (demo).');
  el('#toggleDCA').onclick = () => alert('Toggled DCA (demo).');
  el('#toggleRadar').onclick = () => alert('Toggled Radar (demo).');
}

// ---------- EXECUTE ----------
async function renderExecute(){
  killCharts();
  app.innerHTML = `
    <div class="card">
      <h2>Execute — Your Providers</h2>
      <div class="providers">
        <div class="provider raiz">
          <div class="row"><strong>RAIZ</strong><span class="badge">Growth Bundle</span></div>
          <div class="row"><small class="muted">Micro-investing app with round-ups and recurring.</small></div>
          <div class="actions">
            <button class="btn" onclick="window.open('https://www.raizinvest.com.au/','_blank')">Open</button>
            <button class="btn" onclick="window.open('https://www.raizinvest.com.au/help/','_blank')">Learn</button>
          </div>
        </div>

        <div class="provider spaceship">
          <div class="row"><strong>SPACESHIP</strong><span class="badge">Global</span></div>
          <div class="row"><small class="muted">Managed portfolios focused on global growth themes.</small></div>
          <div class="actions">
            <button class="btn" onclick="window.open('https://www.spaceship.com.au/','_blank')">Open</button>
            <button class="btn" onclick="window.open('https://www.spaceship.com.au/support','_blank')">Learn</button>
          </div>
        </div>

        <div class="provider commsec">
          <div class="row"><strong>COMMSEC POCKET</strong><span class="badge">ETF</span></div>
          <div class="row"><small class="muted">Direct ETF buying via themed “pockets”.</small></div>
          <div class="actions">
            <button class="btn" onclick="window.open('https://www.commsec.com.au/','_blank')">Open</button>
            <button class="btn" onclick="window.open('https://www.commsec.com.au/support/','_blank')">Learn</button>
          </div>
        </div>

        <div class="provider stockspot">
          <div class="row"><strong>STOCKSPOT</strong><span class="badge">Managed</span></div>
          <div class="row"><small class="muted">Automated ETF portfolios rebalanced for you.</small></div>
          <div class="actions">
            <button class="btn" onclick="window.open('https://www.stockspot.com.au/','_blank')">Open</button>
            <button class="btn" onclick="window.open('https://www.stockspot.com.au/faq/','_blank')">Learn</button>
          </div>
        </div>

        <div class="provider quietgrowth">
          <div class="row"><strong>QUIETGROWTH</strong><span class="badge">Managed</span></div>
          <div class="row"><small class="muted">Digital advice and ETF portfolios (risk-based).</small></div>
          <div class="actions">
            <button class="btn" onclick="window.open('https://www.quietgrowth.com.au/','_blank')">Open</button>
            <button class="btn" onclick="window.open('https://www.quietgrowth.com.au/faq','_blank')">Learn</button>
          </div>
        </div>
      </div>
      <p><small class="muted">You execute at your chosen provider. No custody in this app.</small></p>
    </div>

    <div class="card">
      <h3>Tips</h3>
      <ul>
        <li>Use the Withdraw tab to create a CSV sell plan if you need cash.</li>
        <li>Keep contributions small and steady; rely on the Autopilot to rebalance.</li>
        <li>Don’t chase; the Radar tilts are capped so the long-term plan dominates.</li>
      </ul>
    </div>
  `;
}

// ---------- WITHDRAW ----------
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
    const btn = el('#csv'); btn.style.display='inline-block'; btn.onclick=()=>a.click();
  };
}

// ---------- SETTINGS ----------
async function renderSettings(){
  killCharts();
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
        pro = true; localStorage.setItem('pro','true'); message = '✅ Pro subscription active.';
      } else { message = '⚠️ Subscription not active yet.'; }
    } catch { message = '⚠️ Could not verify subscription.'; }
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

// ---------- FAQ / HOW-TO ----------
async function renderFAQ(){
  killCharts();
  app.innerHTML = `
    <div class="card">
      <h2>FAQ & How to Use</h2>
      <div class="faq">

        <details open>
          <summary>Quick Start — 5 steps</summary>
          <ol>
            <li>Open <strong>Settings</strong> → choose <em>Conservative / Balanced / Growth</em>.</li>
            <li>Set your small, regular <strong>Contribution</strong> (e.g., $5–$25/week).</li>
            <li>Go to <strong>Autopilot</strong> → leave DCA ON and Radar ON (defaults).</li>
            <li>Check <strong>Portfolio</strong> for your growth vs safety mix and planned buys.</li>
            <li>When ready to act, open <strong>Execute</strong> and use your chosen provider.</li>
          </ol>
          <p class="muted">Tip: Keep contributions tiny and steady. Loss Guard floors and caps help keep things sensible.</p>
        </details>

        <details>
          <summary>What does Autopilot actually do?</summary>
          <p>On each cycle, it splits your contribution to pull the portfolio back toward the target mix (e.g., 70/30). Within each sleeve, lower-fee ETFs get priority. Radar adds tiny extra buys when conditions look favorable, but caps stop it from dominating.</p>
        </details>

        <details>
          <summary>How do I buy or sell?</summary>
          <p>We don’t place orders. Use <strong>Execute</strong> to open your provider (Raiz, Spaceship, CommSec Pocket, Stockspot, QuietGrowth). For selling, use <strong>Withdraw</strong> to generate a safety-first CSV plan, then execute at your provider.</p>
        </details>

        <details>
          <summary>Is this financial advice?</summary>
          <p>No. This app provides general information and automation logic only. It does not consider your personal objectives, financial situation, or needs. Consider seeking independent advice.</p>
        </details>

        <details>
          <summary>What are the default guardrails?</summary>
          <ul>
            <li>Weekly brake around −5% → pause new growth and route to safety.</li>
            <li>Safety floor (e.g., ≥30%).</li>
            <li>Growth overweight cap (e.g., +7% over target).</li>
            <li>Radar monthly extra cap (~$80).</li>
          </ul>
        </details>

        <details>
          <summary>How do withdrawals work?</summary>
          <p>Enter an amount on <strong>Withdraw</strong>. The app proposes sells from the safety sleeve first (VAF/GOLD) and exports a CSV. You place the orders at your provider; settlement is typically T+2.</p>
        </details>

        <details>
          <summary>Can I connect broker APIs?</summary>
          <p>Phase 2 will add read-only holding imports and, later, execution via a licensed partner. For now, use deep links and CSVs.</p>
        </details>

      </div>
    </div>

    <div class="card">
      <h3>Navigation Guide</h3>
      <ul>
        <li><strong>Home:</strong> Next Order Plan, current Radar tilt, wealth curve.</li>
        <li><strong>Portfolio:</strong> Growth vs Safety pie, planned buys, ETF performance.</li>
        <li><strong>Autopilot:</strong> Status, guardrails, cadence, Radar caps, save controls.</li>
        <li><strong>Execute:</strong> Open your provider or read their help.</li>
        <li><strong>Withdraw:</strong> Safety-first sell plan + CSV export.</li>
        <li><strong>Settings:</strong> Risk band, contribution, and (when enabled) billing status.</li>
        <li><strong>Legal:</strong> Privacy, Terms, Disclaimer, About, Contact.</li>
      </ul>
      <p class="muted">Plain-English policies are included for Australia; this is not legal or financial advice.</p>
    </div>
  `;
}

// ---------- LEGAL ----------
async function renderLegal(){
  killCharts();
  app.innerHTML = `
    <div class="card legal">
      <h2>Legal</h2>
      <p class="muted">These pages are plain-English Australian drafts. They are general in nature and not legal advice. Consider obtaining independent legal review before launch.</p>
      <a href="/legal/privacy.html" target="_blank">Privacy Policy (Australia — APP-aligned draft)</a>
      <a href="/legal/terms.html" target="_blank">Terms of Service</a>
      <a href="/legal/disclaimer.html" target="_blank">General Advice & Risk Disclaimer</a>
      <a href="/legal/about.html" target="_blank">About</a>
      <a href="/legal/contact.html" target="_blank">Contact</a>
    </div>
  `;
}

// ---------- BILLING ----------
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
      if (data && data.url) location.href = data.url;
      else alert('Checkout init failed.');
    } catch { alert('Network error starting checkout.'); }
  };
}

// ---------- ROUTER ----------
function router(){
  const hash = location.hash.replace('#','') || '/home';
  const base = hash.split('?')[0];
  const view = routes[base] || renderHome;
  view();
}
addEventListener('hashchange', router);
addEventListener('load', router);
