// app.js - init(), tabs, guide tabs, tooltip, view details. Must load last: it calls init().
// Classic script (not a module): top-level names are shared globals across all
// dashboard scripts. Load order in index.html: config.js -> helpers.js -> charts.js -> render.js -> chart-popup.js -> app.js.

async function init() {
  try {
    const dataMap = await loadAllData();
    DASHBOARD_DATA = dataMap;
    renderSummary(ALL_INDICATORS, dataMap);
    renderSection('leading-section', 'leading', ALL_INDICATORS, dataMap);
    renderSection('lagging-section', 'lagging', ALL_INDICATORS, dataMap);
    renderManualTab();
    renderFredApiTab();
    renderHtmlScrapeTab();
    await renderBuySignalCard();
  } catch (e) {
    console.error('Dashboard error:', e);
  } finally {
    document.getElementById('loading').style.display = 'none';
    document.getElementById('app').style.display = 'block';
  }
}

function togglePanel(btn) {
  btn.classList.toggle('open');
  const body = btn.nextElementSibling;
  body.classList.toggle('open');
}


// ─── TABS ────────────────────────────────────────────────────────────────────

function switchTab(tab, btn, scrollTo) {
  document.querySelectorAll('.tab-panel').forEach(p => p.style.display = 'none');
  document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
  document.getElementById('tab-' + tab).style.display = 'block';
  if (btn) {
    btn.classList.add('active');
  } else {
    document.querySelectorAll('.tab-btn').forEach(b => {
      if ((b.getAttribute('onclick') || '').includes("'" + tab + "'")) b.classList.add('active');
    });
  }
  if (scrollTo) {
    setTimeout(() => {
      const el = document.getElementById('guide-' + scrollTo);
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 50);
  }
}

// ─── GUIDE TABS ──────────────────────────────────────────────────────────────

function copyGuideText(id) {
  const card = document.getElementById('guide-' + id);
  if (!card) return;
  const steps = [...card.querySelectorAll('.guide-steps li span')].map((s, i) => (i + 1) + '. ' + s.innerText).join('\n');
  navigator.clipboard.writeText(steps).catch(() => {});
  const btn = card.querySelector('.copy-btn');
  if (btn) { btn.textContent = 'Copied!'; setTimeout(() => btn.textContent = 'Copy', 2000); }
}

function renderGuideCards(gridId, stepsObj, accessLabel) {
  const grid = document.getElementById(gridId);
  if (!grid) return;
  grid.innerHTML = Object.entries(stepsObj).map(([id, cfg]) => {
    const stepsHtml = cfg.steps.map(s => '<li><span>' + s + '</span></li>').join('');
    return '<div class="guide-card" id="guide-' + id + '">' +
      '<div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:8px">' +
        '<div class="guide-card-title">' + cfg.label + '</div>' +
        '<button class="copy-btn" onclick="copyGuideText(\'' + id + '\')" style="background:transparent;border:1px solid var(--border);color:var(--muted);border-radius:5px;padding:3px 10px;font-size:11px;cursor:pointer;white-space:nowrap;flex-shrink:0;margin-left:8px">Copy</button>' +
      '</div>' +
      '<div class="guide-card-meta">' +
        '<span class="badge">' + cfg.frequency + '</span>' +
        '<span class="badge">' + accessLabel + '</span>' +
        '<a href="' + cfg.sourceUrl + '" target="_blank" class="badge" style="color:var(--blue);border-color:var(--blue);background:#0d1f38;text-decoration:none">View Source</a>' +
      '</div>' +
      '<ol class="guide-steps">' + stepsHtml + '</ol>' +
    '</div>';
  }).join('');
}

function renderManualTab() {
  renderGuideCards('manual-guide-grid', MANUAL_STEPS, 'File Drop');
}

function renderFredApiTab() {
  renderGuideCards('fred-api-guide-grid', FRED_API_STEPS, 'Auto - FRED API');
}

function renderHtmlScrapeTab() {
  renderGuideCards('html-scrape-guide-grid', HTML_SCRAPE_STEPS, 'Auto - HTML Scraper');
}

// ─── TOOLTIP ─────────────────────────────────────────────────────────────────

(function() {
  const tip = document.getElementById('tooltip');
  document.addEventListener('mouseover', e => {
    const el = e.target.closest('[data-tooltip]');
    if (!el) { tip.style.display = 'none'; return; }
    tip.textContent = el.dataset.tooltip;
    tip.style.display = 'block';
  });
  document.addEventListener('mousemove', e => {
    if (tip.style.display === 'none') return;
    const x = e.clientX + 14, y = e.clientY + 14;
    const tw = tip.offsetWidth, th = tip.offsetHeight;
    tip.style.left = (x + tw > window.innerWidth ? x - tw - 28 : x) + 'px';
    tip.style.top  = (y + th > window.innerHeight ? y - th - 28 : y) + 'px';
  });
  document.addEventListener('mouseout', e => {
    if (!e.target.closest('[data-tooltip]')) return;
    if (!e.relatedTarget || !e.relatedTarget.closest('[data-tooltip]')) tip.style.display = 'none';
  });
})();

// ─── VIEW DETAILS ─────────────────────────────────────────────────────────────

function viewDetails(tab, id) {
  switchTab(tab, null, id);
  setTimeout(() => {
    const el = document.getElementById('guide-' + id);
    if (el) {
      el.classList.add('guide-flash');
      setTimeout(() => el.classList.remove('guide-flash'), 1000);
    }
  }, 100);
}

init();
