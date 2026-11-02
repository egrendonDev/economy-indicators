// charts.js - axisChart / dualAxisChart and the Buy Signal tab (range buttons, synced hover crosshair).
// Classic script (not a module): top-level names are shared globals across all
// dashboard scripts. Load order in index.html: config.js -> helpers.js -> charts.js -> render.js -> chart-popup.js -> app.js.

// ─── AXIS CHARTS (Buy Signal tab) ─────────────────────────────────────────────
// Larger labeled charts, distinct from the compact unlabeled sparkline() above.
// Used only by the Buying Indicators tab's single standalone card.

function formatAxisDate(dateStr) {
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
}

function niceTicks(min, max, count = 3) {
  const ticks = [];
  for (let i = 0; i < count; i++) ticks.push(min + ((max - min) * i) / (count - 1));
  return ticks;
}

// Evenly-spaced date labels plus faint vertical gridlines, so a spike in one
// stacked chart can be lined up against the same date in the chart above or
// below it (e.g. checking whether a VIX spike lines up with a recession).
function xAxisMarkup(history, xFor, padT, innerH, height, count = 7) {
  const n = history.length;
  const idxs = [];
  for (let i = 0; i < count; i++) idxs.push(Math.round((i / (count - 1)) * (n - 1)));
  return idxs.map((idx, k) => {
    const x = xFor(idx).toFixed(1);
    const anchor = k === 0 ? 'start' : k === count - 1 ? 'end' : 'middle';
    return `<line x1="${x}" y1="${padT}" x2="${x}" y2="${padT + innerH}" stroke="#21262d" stroke-width="1"/>
      <text x="${x}" y="${height - 4}" text-anchor="${anchor}" font-size="10" fill="#6b7280">${formatAxisDate(history[idx].date)}</text>`;
  }).join('');
}

// Single-line chart with labeled y-axis ticks, x-axis date range, and an
// optional dashed threshold line (used to show how close a value is to
// triggering a condition).
function axisChart(history, opts = {}) {
  const { width = 500, height = 120, color = '#3fb950', yMin, yMax, yFormat = v => v.toFixed(0),
          thresholdValue = null, thresholdLabel = '', crossId = null,
          // Optional extra threshold lines [{ value, color, label }] and y tick
          // count, used by the dashboard chart popup. Defaults leave the Buy
          // Signal charts unchanged.
          thresholds = [], yTickCount = 3,
          // Defaults match the old solo-chart look. The Buy Signal card passes
          // padL/padR = 40/44 explicitly (see renderSp500Chart/renderVixChart)
          // so its plot area lines up pixel-for-pixel with dualAxisChart's,
          // which needs the wider right margin for its right-axis tick labels.
          // Without this, the same date lands at different x positions across
          // the three stacked charts - most visible as crosshair "lag" on the
          // Combined chart, worse near the right edge.
          padL = 46, padR = 12 } = opts;
  if (!history || history.length < 2) return { svg: '<div style="font-size:11px;color:#8b949e">No history</div>', meta: null };

  const padT = 10, padB = 20;
  const innerW = width - padL - padR;
  const innerH = height - padT - padB;
  const vals = history.map(h => h.value);
  const mn = yMin ?? Math.min(...vals);
  const mx = yMax ?? Math.max(...vals);
  const range = (mx - mn) || 1;

  const xFor = i => padL + (i / (history.length - 1)) * innerW;
  const yFor = v => padT + innerH - ((v - mn) / range) * innerH;

  const points = history.map((h, i) => `${xFor(i).toFixed(1)},${yFor(h.value).toFixed(1)}`).join(' ');
  const yTicks = niceTicks(mn, mx, yTickCount).map(t =>
    `<text x="${padL - 6}" y="${(yFor(t) + 3).toFixed(1)}" text-anchor="end" font-size="10" fill="#8b949e">${yFormat(t)}</text>`
  ).join('');

  const thresholdEl = thresholdValue != null && thresholdValue >= mn && thresholdValue <= mx
    ? `<line x1="${padL}" y1="${yFor(thresholdValue).toFixed(1)}" x2="${width - padR}" y2="${yFor(thresholdValue).toFixed(1)}" stroke="#d29922" stroke-width="1" stroke-dasharray="3,3"/>
       <text x="${width - padR}" y="${(yFor(thresholdValue) - 3).toFixed(1)}" text-anchor="end" font-size="10" fill="#d29922">${thresholdLabel}</text>`
    : '';

  const extraThresholdEls = thresholds
    .filter(t => t && t.value != null && t.value >= mn && t.value <= mx)
    .map(t => `<line x1="${padL}" y1="${yFor(t.value).toFixed(1)}" x2="${width - padR}" y2="${yFor(t.value).toFixed(1)}" stroke="${t.color}" stroke-width="1.5" stroke-dasharray="5,4"/>
       <text x="${width - padR}" y="${(yFor(t.value) - 4).toFixed(1)}" text-anchor="end" font-size="11" fill="${t.color}">${t.label}</text>`)
    .join('');

  const xAxis = xAxisMarkup(history, xFor, padT, innerH, height, 7);

  // Hidden-by-default crosshair line + marker dot, toggled and positioned by
  // the shared hover handler (see updateBuySignalCrosshair). Kept as real SVG
  // elements rather than an HTML overlay so they scale with preserveAspectRatio.
  const crossEls = crossId ? `
    <line id="cross-line-${crossId}" x1="0" y1="${padT}" x2="0" y2="${padT + innerH}" stroke="#8b949e" stroke-width="1" stroke-dasharray="2,2" opacity="0"/>
    <circle id="cross-dot-${crossId}" r="3.5" fill="${color}" stroke="#0d1117" stroke-width="1.5" opacity="0"/>` : '';

  const svg = `<svg viewBox="0 0 ${width} ${height}" preserveAspectRatio="none" style="width:100%;height:${height}px">
    <line x1="${padL}" y1="${padT}" x2="${padL}" y2="${padT + innerH}" stroke="#30363d" stroke-width="1"/>
    <line x1="${padL}" y1="${padT + innerH}" x2="${width - padR}" y2="${padT + innerH}" stroke="#30363d" stroke-width="1"/>
    ${xAxis}
    ${yTicks}
    ${thresholdEl}
    ${extraThresholdEls}
    <polyline points="${points}" fill="none" stroke="${color}" stroke-width="2" opacity="0.9"/>
    ${crossEls}
  </svg>`;

  return { svg, meta: { history, width, padL, innerW, xFor, yFor } };
}

// Two lines, two independently-scaled y-axes (left + right), shared x-axis.
// Both scales are real - values are not normalized onto a fake shared range.
function dualAxisChart(historyA, historyB, opts = {}) {
  const { width = 500, height = 140, colorA = '#3fb950', colorB = '#58a6ff',
          aMin, aMax, aFormat = v => v.toFixed(0), aThreshold = null,
          bMin, bMax, bFormat = v => v.toFixed(0), signalMask = null, crossId = null } = opts;
  if (!historyA?.length || !historyB?.length) return { svg: '<div style="font-size:11px;color:#8b949e">No history</div>', meta: null };

  const padL = 40, padR = 44, padT = 10, padB = 20;
  const innerW = width - padL - padR;
  const innerH = height - padT - padB;

  const valsA = historyA.map(h => h.value);
  const mnA = aMin ?? Math.min(...valsA), mxA = aMax ?? Math.max(...valsA);
  const rangeA = (mxA - mnA) || 1;
  const valsB = historyB.map(h => h.value);
  const mnB = bMin ?? Math.min(...valsB), mxB = bMax ?? Math.max(...valsB);
  const rangeB = (mxB - mnB) || 1;

  const xForA = i => padL + (i / (historyA.length - 1)) * innerW;
  const yForA = v => padT + innerH - ((v - mnA) / rangeA) * innerH;
  const xForB = i => padL + (i / (historyB.length - 1)) * innerW;
  const yForB = v => padT + innerH - ((v - mnB) / rangeB) * innerH;

  const pointsA = historyA.map((h, i) => `${xForA(i).toFixed(1)},${yForA(h.value).toFixed(1)}`).join(' ');
  const pointsB = historyB.map((h, i) => `${xForB(i).toFixed(1)},${yForB(h.value).toFixed(1)}`).join(' ');

  const leftTicks = niceTicks(mnA, mxA, 3).map(t =>
    `<text x="${padL - 6}" y="${(yForA(t) + 3).toFixed(1)}" text-anchor="end" font-size="10" fill="${colorA}">${aFormat(t)}</text>`
  ).join('');
  const rightTicks = niceTicks(mnB, mxB, 3).map(t =>
    `<text x="${width - padR + 6}" y="${(yForB(t) + 3).toFixed(1)}" font-size="10" fill="${colorB}">${bFormat(t)}</text>`
  ).join('');

  const thresholdEl = aThreshold != null && aThreshold >= mnA && aThreshold <= mxA
    ? `<line x1="${padL}" y1="${yForA(aThreshold).toFixed(1)}" x2="${width - padR}" y2="${yForA(aThreshold).toFixed(1)}" stroke="#d29922" stroke-width="1" stroke-dasharray="3,3"/>`
    : '';

  const xAxis = xAxisMarkup(historyA, xForA, padT, innerH, height, 7);

  // Shade every historical stretch where both conditions were true at once -
  // i.e. where a buy signal would have actually fired in the past.
  let highlights = '';
  if (signalMask && signalMask.length === historyA.length) {
    let runStart = null;
    for (let i = 0; i <= signalMask.length; i++) {
      const active = i < signalMask.length && signalMask[i];
      if (active && runStart === null) runStart = i;
      if (!active && runStart !== null) {
        const x1 = xForA(runStart).toFixed(1);
        const x2 = xForA(i - 1).toFixed(1);
        highlights += `<rect x="${x1}" y="${padT}" width="${Math.max(2, x2 - x1)}" height="${innerH}" fill="#bc8cff" opacity="0.3"/>`;
        runStart = null;
      }
    }
  }

  // Same hidden-by-default crosshair pattern as axisChart, but with two dots
  // (one per line) sharing a single vertical line since both series share
  // the A-axis x mapping.
  const crossEls = crossId ? `
    <line id="cross-line-${crossId}" x1="0" y1="${padT}" x2="0" y2="${padT + innerH}" stroke="#8b949e" stroke-width="1" stroke-dasharray="2,2" opacity="0"/>
    <circle id="cross-dot-${crossId}-a" r="3.5" fill="${colorA}" stroke="#0d1117" stroke-width="1.5" opacity="0"/>
    <circle id="cross-dot-${crossId}-b" r="3.5" fill="${colorB}" stroke="#0d1117" stroke-width="1.5" opacity="0"/>` : '';

  const svg = `<svg viewBox="0 0 ${width} ${height}" preserveAspectRatio="none" style="width:100%;height:${height}px">
    ${highlights}
    <line x1="${padL}" y1="${padT}" x2="${padL}" y2="${padT + innerH}" stroke="#30363d" stroke-width="1"/>
    <line x1="${padL}" y1="${padT + innerH}" x2="${width - padR}" y2="${padT + innerH}" stroke="#30363d" stroke-width="1"/>
    <line x1="${width - padR}" y1="${padT}" x2="${width - padR}" y2="${padT + innerH}" stroke="#30363d" stroke-width="1"/>
    ${xAxis}
    ${leftTicks}
    ${rightTicks}
    ${thresholdEl}
    <polyline points="${pointsA}" fill="none" stroke="${colorA}" stroke-width="2" opacity="0.9"/>
    <polyline points="${pointsB}" fill="none" stroke="${colorB}" stroke-width="2" opacity="0.9" stroke-dasharray="4,3"/>
    ${crossEls}
  </svg>`;

  return { svg, meta: { historyA, historyB, width, padL, innerW, xForA, yForA, xForB, yForB } };
}

// Derives a % drawdown-from-running-high series client-side from raw S&P 500
// history, so the JSON file only needs to store raw prices.
function computeDrawdownSeries(history) {
  let runningMax = -Infinity;
  return history.map(h => {
    runningMax = Math.max(runningMax, h.value);
    return { date: h.date, value: ((h.value - runningMax) / runningMax) * 100 };
  });
}

// Last N years of a history array, by calendar date (not just point count).
function lastNYears(history, years) {
  if (!history.length) return history;
  const cutoff = new Date(history[history.length - 1].date + 'T00:00:00');
  cutoff.setFullYear(cutoff.getFullYear() - years);
  return history.filter(h => new Date(h.date + 'T00:00:00') >= cutoff);
}

// Range control state for the Buying Indicators charts - populated once on
// load, re-read on every button click. 'max' means different things per
// chart: VIX genuinely has ~36yrs of history, but S&P 500 (and therefore the
// combined view, which depends on both) is hard-capped at FRED's 10yr window
// regardless of what's picked, so 10Y and Max look identical for those two.
const CHART_RANGES = [
  { key: '1y',  label: '1Y',  years: 1 },
  { key: '2y',  label: '2Y',  years: 2 },
  { key: '3y',  label: '3Y',  years: 3 },
  { key: '4y',  label: '4Y',  years: 4 },
  { key: '5y',  label: '5Y',  years: 5 },
  { key: '7y',  label: '7Y',  years: 7 },
  { key: '10y', label: '10Y', years: 10 },
  { key: 'max', label: 'Max', years: null }
];
let buySignalState = null;
let buySignalActiveRange = { sp500: '4y', vix: '4y', combined: '4y' };
// Per-chart hover metadata (history array + coordinate mappers) populated by
// each render*Chart() call below. Used by updateBuySignalCrosshair() to place
// the synced crosshair correctly regardless of which range each chart is
// currently zoomed to.
let chartCursors = {};

function filterByRange(history, years) {
  return years == null ? history : lastNYears(history, years);
}

function rangeButtonsHTML(chartKey) {
  const active = buySignalActiveRange[chartKey];
  return `<div style="display:flex;gap:4px;margin-bottom:6px">${CHART_RANGES.map(r => {
    const isActive = r.key === active;
    return `<button data-chart="${chartKey}" data-range="${r.key}" onclick="setChartRange('${chartKey}','${r.key}')"
      style="font-size:10px;padding:2px 9px;border-radius:12px;cursor:pointer;
      border:1px solid ${isActive ? '#58a6ff' : '#30363d'};
      background:${isActive ? 'rgba(88,166,255,0.15)' : 'transparent'};
      color:${isActive ? '#58a6ff' : '#8b949e'}">${r.label}</button>`;
  }).join('')}</div>`;
}

function renderSp500Chart(rangeKey) {
  const s = buySignalState;
  const years = CHART_RANGES.find(r => r.key === rangeKey).years;
  const filtered = filterByRange(s.sp500History, years);
  const { svg, meta } = axisChart(filtered, {
    width: s.chartWidth, color: s.lineColor,
    yFormat: v => v.toLocaleString('en-US', { maximumFractionDigits: 0 }),
    crossId: 'sp500', padL: 40, padR: 44
  });
  document.getElementById('chart-sp500').innerHTML = svg;
  chartCursors.sp500 = meta;
}

function renderVixChart(rangeKey) {
  const s = buySignalState;
  const years = CHART_RANGES.find(r => r.key === rangeKey).years;
  const filtered = filterByRange(s.vixHistoryFull, years);
  const { svg, meta } = axisChart(filtered, {
    width: s.chartWidth, color: s.lineColor, yMin: 0, yFormat: v => v.toFixed(0),
    thresholdValue: 30, thresholdLabel: 'VIX 30',
    crossId: 'vix', padL: 40, padR: 44
  });
  document.getElementById('chart-vix').innerHTML = svg;
  chartCursors.vix = meta;
}

function renderCombinedChart(rangeKey) {
  const s = buySignalState;
  // Combined view can't exceed 10yrs regardless of selection - that's the
  // S&P/drawdown side's real ceiling from FRED's licensing cap.
  const years = Math.min(CHART_RANGES.find(r => r.key === rangeKey).years ?? 10, 10);
  const vixSlice = lastNYears(s.vix10y, years);
  const drawdownSlice = lastNYears(s.drawdownSeries10y, years);
  const drawdownByDate = new Map(drawdownSlice.map(h => [h.date, h.value]));
  const signalMask = vixSlice.map(h => {
    const dd = drawdownByDate.get(h.date);
    return h.value >= s.percentileValue && dd !== undefined && dd <= s.drawdownThresholdPct;
  });
  const { svg, meta } = dualAxisChart(vixSlice, drawdownSlice, {
    width: s.chartWidth, colorA: '#3fb950', colorB: '#58a6ff',
    aMin: 0, aFormat: v => v.toFixed(0),
    bMax: 0, bFormat: v => v.toFixed(0) + '%',
    signalMask,
    crossId: 'combined'
  });
  document.getElementById('chart-combined').innerHTML = svg;
  chartCursors.combined = meta;
}

// ─── HOVER CROSSHAIR (Buy Signal tab) ─────────────────────────────────────────
// One shared date-synced crosshair across all three stacked charts: hovering
// any of them lines up the same calendar date on the other two, even if each
// chart is currently zoomed to a different range (1Y vs Max, etc).

function formatFullDate(dateStr) {
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

// Binary search for the history entry closest to targetDate. history must be
// sorted ascending by date (true for all FRED-sourced series here).
function findClosestIndex(history, targetDate) {
  const t = targetDate.getTime();
  let lo = 0, hi = history.length - 1;
  if (t <= new Date(history[0].date + 'T00:00:00').getTime()) return 0;
  if (t >= new Date(history[hi].date + 'T00:00:00').getTime()) return hi;
  while (lo < hi) {
    const mid = (lo + hi) >> 1;
    const midT = new Date(history[mid].date + 'T00:00:00').getTime();
    if (midT < t) lo = mid + 1; else hi = mid;
  }
  if (lo > 0) {
    const dLo = Math.abs(new Date(history[lo].date + 'T00:00:00').getTime() - t);
    const dPrev = Math.abs(new Date(history[lo - 1].date + 'T00:00:00').getTime() - t);
    if (dPrev < dLo) return lo - 1;
  }
  return lo;
}

function setCrossLine(id, x) {
  const el = document.getElementById(id);
  if (!el) return;
  el.setAttribute('x1', x.toFixed(1));
  el.setAttribute('x2', x.toFixed(1));
  el.setAttribute('opacity', '1');
}

function setCrossDot(id, x, y) {
  const el = document.getElementById(id);
  if (!el) return;
  el.setAttribute('cx', x.toFixed(1));
  el.setAttribute('cy', y.toFixed(1));
  el.setAttribute('opacity', '1');
}

const CROSSHAIR_IDS = [
  'cross-line-sp500', 'cross-dot-sp500',
  'cross-line-vix', 'cross-dot-vix',
  'cross-line-combined', 'cross-dot-combined-a', 'cross-dot-combined-b'
];

function hideBuySignalCrosshair() {
  CROSSHAIR_IDS.forEach(id => { const el = document.getElementById(id); if (el) el.setAttribute('opacity', '0'); });
  const ro = document.getElementById('buy-signal-readout');
  if (ro) ro.innerHTML = '<span style="color:var(--muted)">Hover a chart to inspect a date</span>';
}

function updateBuySignalCrosshair(clientX) {
  const c = chartCursors;
  const refKey = c.sp500 ? 'sp500' : c.vix ? 'vix' : c.combined ? 'combined' : null;
  if (!refKey) return;

  const refSvgId = refKey === 'combined' ? 'chart-combined' : `chart-${refKey}`;
  const refSvg = document.querySelector(`#${refSvgId} svg`);
  if (!refSvg) return;

  const refMeta = c[refKey];
  const refHistory = refKey === 'combined' ? refMeta.historyA : refMeta.history;
  const rect = refSvg.getBoundingClientRect();
  const frac = Math.min(1, Math.max(0, (clientX - rect.left) / rect.width));
  const svgX = frac * refMeta.width;
  let idxRef = Math.round(((svgX - refMeta.padL) / refMeta.innerW) * (refHistory.length - 1));
  idxRef = Math.min(refHistory.length - 1, Math.max(0, idxRef));
  const targetDate = new Date(refHistory[idxRef].date + 'T00:00:00');

  // Bright, bold values on a muted label read far better against the dark
  // card than the old flat-gray line - value color also echoes each series'
  // own line color so the readout visually ties back to the chart.
  const readoutParts = [`<strong style="color:var(--text);font-weight:700">${formatFullDate(refHistory[idxRef].date)}</strong>`];

  if (c.sp500) {
    const m = c.sp500;
    const idx = findClosestIndex(m.history, targetDate);
    const h = m.history[idx];
    setCrossLine('cross-line-sp500', m.xFor(idx));
    setCrossDot('cross-dot-sp500', m.xFor(idx), m.yFor(h.value));
    readoutParts.push(`<span style="color:var(--muted)">S&amp;P 500</span> <strong style="color:#3fb950;font-weight:700">${h.value.toLocaleString('en-US', { maximumFractionDigits: 0 })}</strong>`);
  }
  if (c.vix) {
    const m = c.vix;
    const idx = findClosestIndex(m.history, targetDate);
    const h = m.history[idx];
    setCrossLine('cross-line-vix', m.xFor(idx));
    setCrossDot('cross-dot-vix', m.xFor(idx), m.yFor(h.value));
    readoutParts.push(`<span style="color:var(--muted)">VIX</span> <strong style="color:#3fb950;font-weight:700">${h.value.toFixed(1)}</strong>`);
  }
  if (c.combined) {
    const m = c.combined;
    const idxA = findClosestIndex(m.historyA, targetDate);
    const idxB = findClosestIndex(m.historyB, targetDate);
    setCrossLine('cross-line-combined', m.xForA(idxA));
    setCrossDot('cross-dot-combined-a', m.xForA(idxA), m.yForA(m.historyA[idxA].value));
    setCrossDot('cross-dot-combined-b', m.xForB(idxB), m.yForB(m.historyB[idxB].value));
    readoutParts.push(`<span style="color:var(--muted)">Drawdown</span> <strong style="color:#58a6ff;font-weight:700">${m.historyB[idxB].value.toFixed(1)}%</strong>`);
  }

  const ro = document.getElementById('buy-signal-readout');
  if (ro) ro.innerHTML = readoutParts.join('<span style="color:var(--border)">&nbsp;&nbsp;|&nbsp;&nbsp;</span>');
}

function setChartRange(chartKey, rangeKey) {
  buySignalActiveRange[chartKey] = rangeKey;
  document.querySelectorAll(`button[data-chart="${chartKey}"]`).forEach(b => {
    const isActive = b.dataset.range === rangeKey;
    b.style.borderColor = isActive ? '#58a6ff' : '#30363d';
    b.style.background  = isActive ? 'rgba(88,166,255,0.15)' : 'transparent';
    b.style.color       = isActive ? '#58a6ff' : '#8b949e';
  });
  if (chartKey === 'sp500')    renderSp500Chart(rangeKey);
  if (chartKey === 'vix')      renderVixChart(rangeKey);
  if (chartKey === 'combined') renderCombinedChart(rangeKey);
}

async function renderBuySignalCard() {
  const container = document.getElementById('buy-signal-card');
  if (!container) return;

  let data;
  try {
    const res = await fetch('data/weekly/buy_signal.json');
    data = res.ok ? await res.json() : null;
  } catch {
    data = null;
  }

  if (!data) {
    container.innerHTML = `<div class="ind-card pending" style="max-width:560px;margin-bottom:24px">
      <div class="card-top">
        <div class="card-name">Buy Signal Status</div>
        <div class="status-pill pending">Not Live</div>
      </div>
      <div class="card-desc">Data pipeline not built yet - run <code style="background:#1c2128;padding:1px 5px;border-radius:3px;font-size:11px">npm run api-pull:buy-signal</code> to generate data/weekly/buy_signal.json.</div>
    </div>`;
    return;
  }

  const pillMap = {
    calm:    { cls: 'pending', label: "Watching" },
    caution: { cls: 'orange',  label: "Don't Buy Yet" },
    buy:     { cls: 'green',   label: 'Time To Buy' }
  };
  const pill = pillMap[data.signal] || pillMap.calm;
  const lineColor = data.signal === 'buy' ? '#3fb950' : data.signal === 'caution' ? '#d29922' : '#3fb950';

  const sp500History = data.sp500.history;  // already capped at FRED's 10yr window
  const vixHistoryFull = data.vix.history;  // full history since 1990
  const drawdownSeries10y = computeDrawdownSeries(sp500History);
  const vix10y = lastNYears(vixHistoryFull, 10);

  // Match the SVG's internal coordinate system to the real rendered width so
  // preserveAspectRatio="none" barely has to stretch anything - a big gap
  // between viewBox width and actual pixel width is what caused the blur.
  const chartWidth = container.clientWidth > 0 ? container.clientWidth - 40 : 1000;

  buySignalState = {
    sp500History, vixHistoryFull, drawdownSeries10y, vix10y, chartWidth, lineColor,
    percentileValue: data.vix.percentile_value,
    drawdownThresholdPct: data.sp500.drawdown_threshold_pct
  };
  buySignalActiveRange = { sp500: '4y', vix: '4y', combined: '4y' };

  container.innerHTML = `<div class="ind-card ${data.signal === 'buy' ? 'green' : data.signal === 'caution' ? 'orange' : ''}" style="width:100%;margin-bottom:24px">
    <div class="card-top">
      <div class="card-name">Buy Signal Status</div>
      <div class="status-pill ${pill.cls}">${pill.label}</div>
    </div>

    <div id="buy-signal-readout" style="font-size:13px;color:var(--text);background:var(--surface);border:1px solid var(--border);border-radius:6px;padding:8px 14px;margin-bottom:10px"><span style="color:var(--muted)">Hover a chart to inspect a date</span></div>

    <div style="font-size:12px;color:var(--text);margin-bottom:4px;display:flex;align-items:center;gap:8px;flex-wrap:wrap">
      <span>S&amp;P 500 <strong style="color:${lineColor}">${data.sp500.current.value.toLocaleString('en-US', { maximumFractionDigits: 0 })}</strong> <span style="color:var(--muted)">- max available window (FRED 10yr cap)</span></span>
      <a href="https://www.google.com/finance/quote/.INX:INDEXSP" target="_blank" class="badge" style="color:var(--blue);border-color:var(--blue);background:#0d1f38;text-decoration:none">Google Finance</a>
    </div>
    ${rangeButtonsHTML('sp500')}
    <div id="chart-sp500"></div>

    <div style="font-size:12px;color:var(--text);margin:12px 0 4px;display:flex;align-items:center;gap:8px;flex-wrap:wrap">
      <span>VIX <strong style="color:${lineColor}">${data.vix.current.value}</strong> <span style="color:var(--muted)">- full history since 1990</span></span>
      <a href="https://www.google.com/finance/quote/VIX:INDEXCBOE" target="_blank" class="badge" style="color:var(--blue);border-color:var(--blue);background:#0d1f38;text-decoration:none">Google Finance</a>
    </div>
    ${rangeButtonsHTML('vix')}
    <div id="chart-vix"></div>

    <div style="font-size:12px;color:var(--text);margin:12px 0 4px">Combined signal view <span style="color:var(--muted)">- capped at 10yr (S&amp;P's FRED limit), both axes real</span></div>
    <div style="display:flex;gap:14px;font-size:10px;margin-bottom:6px;flex-wrap:wrap">
      <span style="color:#3fb950">&#8212; VIX (left)</span>
      <span style="color:#58a6ff">&#8943; S&amp;P 500 Drawdown % (right)</span>
      <span style="color:#8b949e"><span style="display:inline-block;width:10px;height:10px;background:#bc8cff;opacity:0.7;border-radius:2px;vertical-align:-1px;margin-right:3px"></span>Both conditions met (past buy signal)</span>
    </div>
    ${rangeButtonsHTML('combined')}
    <div id="chart-combined"></div>

    <div class="card-desc" style="margin-top:10px">Signal is <strong>${data.conditions_met}/2</strong> conditions met - VIX at or above its trailing ${data.vix.percentile_window_years}yr ${data.vix.percentile_threshold}th percentile (${data.vix.condition_met ? 'met' : 'not met'}), and S&amp;P 500 down ${Math.abs(data.sp500.drawdown_threshold_pct)}%+ from its rolling all-time high (${data.sp500.condition_met ? 'met' : 'not met'}, currently ${data.sp500.drawdown_pct.toFixed(1)}%).</div>
  </div>`;

  renderSp500Chart('4y');
  renderVixChart('4y');
  renderCombinedChart('4y');

  // Bind the shared hover listener once. container's innerHTML gets replaced
  // on every renderBuySignalCard() call, but the container node itself
  // persists, so the listener would otherwise stack up on repeat calls.
  if (!container.dataset.hoverBound) {
    container.addEventListener('mousemove', e => updateBuySignalCrosshair(e.clientX));
    container.addEventListener('mouseleave', hideBuySignalCrosshair);
    container.dataset.hoverBound = '1';
  }
}
