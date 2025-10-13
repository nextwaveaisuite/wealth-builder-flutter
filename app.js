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
