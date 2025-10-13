// Minimal help bot (local Q&A, no advice)
(() => {
  const faqs = [
    { q: "Do you place orders or hold my funds?",
      a: "No. Wealth Builder never holds funds or places orders. You execute with your chosen provider." },
    { q: "What is Loss Guard?",
      a: "Loss Guard monitors drawdowns. If markets fall beyond thresholds, new buys route to Safety for the week." },
    { q: "What is Radar?",
      a: "Radar proposes small, capped tilts based on simple signals (e.g., volatility spikes). Tilts never dominate." },
    { q: "How do I withdraw?",
      a: "Use the Withdraw planner to generate a CSV of suggested sells favouring the Safety sleeve. Execute at your provider." },
    { q: "Quick start?",
      a: "Settings ➜ Autopilot ➜ Portfolio ➜ Execute ➜ Withdraw. Keep contributions small and consistent." }
  ];

  const btn = document.createElement('button');
  btn.className = 'btn';
  btn.style.position='fixed'; btn.style.right='16px'; btn.style.bottom='16px';
  btn.textContent='?';
  btn.title='Help';
  document.body.appendChild(btn);

  const panel = document.createElement('div');
  panel.style.position='fixed'; panel.style.right='16px'; panel.style.bottom='60px';
  panel.style.width='320px'; panel.style.maxHeight='60vh'; panel.style.overflow='auto';
  panel.className='card';
  panel.style.display='none';
  panel.innerHTML = `<h3 style="margin:0 0 8px 0;">Help</h3>` + faqs.map(x=>`
    <details class="card" style="border:none;box-shadow:none;padding:6px;margin:4px 0;">
      <summary><strong>${x.q}</strong></summary>
      <div class="small" style="margin-top:6px">${x.a}</div>
    </details>
  `).join('');
  document.body.appendChild(panel);
  btn.onclick = () => { panel.style.display = panel.style.display==='none' ? 'block':'none'; };
})();
