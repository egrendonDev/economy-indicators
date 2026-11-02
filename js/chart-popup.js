// chart-popup.js - Dashboard chart popup: click a card sparkline to open a labeled chart.
// Classic script (not a module): top-level names are shared globals across all
// dashboard scripts. Load order in index.html: config.js -> helpers.js -> charts.js -> render.js -> chart-popup.js -> app.js.

// ─── CHART POPUP (Dashboard tab) ──────────────────────────────────────────────
// Click any card's sparkline to open a large labeled chart of that indicator.
// YoY indicators chart their YoY % series (what the status is scored on), so
// the warn/danger lines are meaningful; everything else charts the raw value.

let DASHBOARD_DATA = {};
let chartModalState = null;

function ensureChartModal() {
  let overlay = document.getElementById('chart-modal-overlay');
  if (overlay) return overlay;
  overlay = document.createElement('div');
  overlay.id = 'chart-modal-overlay';
  overlay.className = 'chart-modal-overlay';
  overlay.innerHTML = '<div class="chart-modal" role="dialog" aria-modal="true" aria-labelledby="chart-modal-title"></div>';
  overlay.addEventListener('click', e => { if (e.target === overlay) closeChartModal(); });
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && overlay.classList.contains('open')) closeChartModal(); });
  window.addEventListener('resize', () => { if (overlay.classList.contains('open')) renderChartModalPlot(); });
  document.body.appendChild(overlay);
  return overlay;
}

function openChartModal(id) {
  const ind = ALL_INDICATORS.find(i => i.id === id);
  const d = DASHBOARD_DATA[id];
  if (!ind || !d || !d.history || d.history.length < 2) return;

  const isYoy = YOY_INDICATORS.has(id);
  const series = isYoy
    ? yoySeries(d.history)
    : d.history.map(h => ({ date: h.date, value: Number(h.value), raw: Number(h.value) })).filter(p => !isNaN(p.value));
  if (series.length < 2) return;

  const cfg = THRESHOLDS[id] || {};
  const meta = INDICATOR_META[id] || {};
  const status = getStatus(id, scoringValue(id, d));
  const pillLabel = status === 'green' ? 'Healthy' : status === 'orange' ? 'Watch' : status === 'red' ? 'Warning' : 'Pending';
  const fmt = v => isYoy ? (v >= 0 ? '+' : '') + v.toFixed(1) + '%' : formatValue(id, v, ind.unit);
  const cmp = cfg.direction === 'higher' ? '≥' : '≤';

  chartModalState = { id, ind, series, cfg, status, isYoy, fmt };

  const overlay = ensureChartModal();
  const scoredOn = isYoy ? 'scored on year-over-year % change' : `unit: ${ind.unit}`;
  const yoyNote = isYoy ? ' Chart shows YoY % change, which is what the status is scored on; the first 12 months of history are used to compute the first point.' : '';
  const legend = cfg.warn == null ? '' : `
    <div class="chart-modal-legend">
      <span><span class="swatch" style="border-color:var(--orange)"></span>Watch ${cmp} ${fmt(cfg.warn)}</span>
      <span><span class="swatch" style="border-color:var(--red)"></span>Warning ${cmp} ${fmt(cfg.danger)}</span>
      ${cfg.avg ? `<span>Typical: ${cfg.avg}</span>` : ''}
    </div>`;

  overlay.querySelector('.chart-modal').innerHTML = `
    <div class="chart-modal-head">
      <div>
        <div class="chart-modal-title" id="chart-modal-title">${ind.label}</div>
        <div class="chart-modal-meta">${meta.frequency || ''}${meta.frequency ? ' · ' : ''}${scoredOn} · <a href="${ind.url}" target="_blank" rel="noopener">View source</a></div>
      </div>
      <div style="display:flex;gap:8px;align-items:center">
        <span class="status-pill ${status}">${pillLabel} ${fmt(series[series.length - 1].value)}</span>
        <button class="chart-modal-close" onclick="closeChartModal()" aria-label="Close">&#x2715;</button>
      </div>
    </div>
    <div class="chart-modal-desc">${TOOLTIPS[id] || ind.description || ''}${yoyNote}</div>
    <div class="chart-modal-readout" id="chart-modal-readout">Hover the chart to inspect a date</div>
    <div id="chart-modal-plot"></div>
    ${legend}`;

  overlay.classList.add('open');
  document.body.style.overflow = 'hidden';
  renderChartModalPlot();

  const plot = document.getElementById('chart-modal-plot');
  plot.addEventListener('mousemove', e => updateChartModalCrosshair(e.clientX));
  plot.addEventListener('mouseleave', hideChartModalCrosshair);
  overlay.querySelector('.chart-modal-close').focus();
}

function renderChartModalPlot() {
  const s = chartModalState;
  const plot = document.getElementById('chart-modal-plot');
  if (!s || !plot) return;

  const vals = s.series.map(p => p.value);
  let mn = Math.min(...vals), mx = Math.max(...vals);
  // Stretch the axis to include the watch line so the gap is visible. The
  // warning line is drawn only if it already falls inside that range, so a
  // far-off danger level does not squash the data flat.
  if (s.cfg.warn != null) { mn = Math.min(mn, s.cfg.warn); mx = Math.max(mx, s.cfg.warn); }
  const pad = (mx - mn) * 0.08 || Math.abs(mx) * 0.05 || 1;
  mn -= pad; mx += pad;

  const color = s.status === 'red' ? '#f85149' : s.status === 'orange' ? '#d29922' : '#3fb950';
  const thresholds = s.cfg.warn == null ? [] : [
    { value: s.cfg.warn,   color: '#d29922', label: `Watch ${s.fmt(s.cfg.warn)}` },
    { value: s.cfg.danger, color: '#f85149', label: `Warning ${s.fmt(s.cfg.danger)}` }
  ];
  // Fill the flex-sized plot area (popup is 75vw x 75vh, see .chart-modal in css).
  const width = Math.max(320, Math.round(plot.clientWidth || 860));
  const height = Math.max(220, Math.round(plot.clientHeight || 320));
  const { svg, meta } = axisChart(s.series, {
    width, height, color, yMin: mn, yMax: mx, yFormat: s.fmt,
    thresholds, yTickCount: 5, crossId: 'modal', padL: 64, padR: 16,
    fontSize: width > 1000 ? 13 : 10
  });
  plot.innerHTML = svg;
  s.meta = meta;
}

function updateChartModalCrosshair(clientX) {
  const s = chartModalState;
  const svg = document.querySelector('#chart-modal-plot svg');
  if (!s || !s.meta || !svg) return;
  const m = s.meta;
  const rect = svg.getBoundingClientRect();
  const frac = Math.min(1, Math.max(0, (clientX - rect.left) / rect.width));
  let idx = Math.round(((frac * m.width - m.padL) / m.innerW) * (m.history.length - 1));
  idx = Math.min(m.history.length - 1, Math.max(0, idx));
  const p = m.history[idx];
  setCrossLine('cross-line-modal', m.xFor(idx));
  setCrossDot('cross-dot-modal', m.xFor(idx), m.yFor(p.value));
  const sep = '<span style="color:var(--border)">&nbsp;&nbsp;|&nbsp;&nbsp;</span>';
  const parts = [`<strong>${formatFullDate(p.date)}</strong>`, `${s.isYoy ? 'YoY' : 'Value'} <strong>${s.fmt(p.value)}</strong>`];
  if (s.isYoy) parts.push(`Level <strong>${formatValue(s.id, p.raw, s.ind.unit)}</strong>`);
  const ro = document.getElementById('chart-modal-readout');
  if (ro) ro.innerHTML = parts.join(sep);
}

function hideChartModalCrosshair() {
  ['cross-line-modal', 'cross-dot-modal'].forEach(id => { const el = document.getElementById(id); if (el) el.setAttribute('opacity', '0'); });
  const ro = document.getElementById('chart-modal-readout');
  if (ro) ro.textContent = 'Hover the chart to inspect a date';
}

function closeChartModal() {
  const overlay = document.getElementById('chart-modal-overlay');
  if (overlay) overlay.classList.remove('open');
  document.body.style.overflow = '';
  chartModalState = null;
}
