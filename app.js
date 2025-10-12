// Simple hash router
const el = (sel) => document.querySelector(sel);
const app = el('#app');

const routes = {
  '/home': renderHome,
  '/portfolio': renderPortfolio,
  '/autopilot': renderAutopilot,
  '/execute': renderExecute,
  '/withdraw': renderWithdraw,
  '/settings': renderSettings,
  '/legal': renderLegal,
};

async function loadJSON(path){ const r = await fetch(path, {cache:'no-store'}); return r.json(); }

// ---------- VIEWS ----------
async function renderHome(){
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
      <div style="margin-top:8px; display:flex; gap:8px; align-items:center;">
        <label><input id="dip" type="checkbox" ${dipOn ? 'checked' : ''}/> Buy the Dip</label>
        <span>Cap ($/month)</span>
        <input id="cap" class="input" style="max-width:120px" value="${dipCap}" />
        <button class="btn" id="saveDip">Save</button>
      </div>
      <small class="muted">Caps limit extra “Radar” buys so tilts never dominate your plan.</small>
    </div>

    <div class="banner">All providers governed equally · No favorites · No commissions influence allocation</div>
  `;

  el('#saveDip').onclick = () => {
    localStorage.setItem('dipOn', JSON.stringify(el('#dip').checked));
    localStorage.setItem('dipCap', String(parseInt(el('#cap').value || '80', 10)));
    alert('Saved.');
  };
}

async function renderPortfolio(){
  const uni = await loadJSON('/assets/universe.json');
  app.innerHTML = `
    <div class="card">
      <h2>Portfolio</h2>
      <div class="grid cols-2">
        <div>
          <h3>Growth vs Safety</h3>
          <div>Placeholder pie (Growth 70% / Safety 30%)</div>
        </div>
        <div>
          <h3>Planned Buys</h3>
          <ul>${uni.etfs.map(e=>`<li>${e.symbol} — ${e.sleeve}</li>`).join('')}</ul>
        </div>
      </div>
    </div>
  `;
}

async function renderAutopilot(){
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

    // Simple safety-first plan example (edit later as needed)
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
  app.innerHTML = `
    <div class="card">
      <h2>Settings</h2>
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
    </div>
  `;
}

async function renderLegal(){
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

// ---------- ROUTER ----------
function router(){
  const hash = location.hash.replace('#','') || '/home';
  const view = routes[hash] || renderHome;
  view();
}
window.addEventListener('hashchange', router);
window.addEventListener('load', router);
