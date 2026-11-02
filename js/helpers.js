// helpers.js - Scoring and formatting helpers: getStatus, scoringValue, yoySeries, formatValue, trends, cluster scores, sparkline, risk dial.
// Classic script (not a module): top-level names are shared globals across all
// dashboard scripts. Load order in index.html: config.js -> helpers.js -> charts.js -> render.js -> chart-popup.js -> app.js.

// ─── HELPERS ──────────────────────────────────────────────────────────────────

function getStatus(id, value) {
  const cfg = THRESHOLDS[id];
  if (!cfg || value === null || value === undefined || isNaN(Number(value))) return 'pending';
  const v = Number(value);
  const { warn, danger, direction } = cfg;
  if (warn === null) return 'green'; // trend-only, no threshold

  if (direction === 'higher') {
    if (v >= danger) return 'red';
    if (v >= warn)   return 'orange';
    return 'green';
  }
  if (direction === 'lower') {
    if (v <= danger) return 'red';
    if (v <= warn)   return 'orange';
    return 'green';
  }
  if (direction === 'inverted') {
    // yield curve: positive good, 0 to -0.5 watch, < -0.5 red
    if (v <= danger) return 'red';
    if (v <= warn)   return 'orange';
    return 'green';
  }
  return 'green';
}

const YOY_INDICATORS = new Set(['real_m2', 'durable_goods', 'revolving_credit', 'margin_debt']);

function computeYoY(history) {
  if (!history || history.length < 13) return null;
  const latest  = history[history.length - 1];
  const yearAgo = history[history.length - 13];
  if (!latest || !yearAgo || yearAgo.value === 0) return null;
  return ((latest.value - yearAgo.value) / Math.abs(yearAgo.value)) * 100;
}

// Single source of truth for the value a status/threshold is judged against.
// YoY indicators are scored on % change; everything else on the latest raw value.
// Used by the card, the cluster score, and the warning list so they cannot disagree.
function scoringValue(id, d) {
  if (!d || !d.latest) return null;
  const yoy = YOY_INDICATORS.has(id) ? computeYoY(d.history || []) : null;
  return yoy !== null ? yoy : d.latest.value;
}

// Full YoY % series for charting. Same 12-periods-back rule as computeYoY(),
// so the last point always equals the value the card is scored on.
function yoySeries(history) {
  if (!history || history.length < 13) return [];
  const out = [];
  for (let i = 12; i < history.length; i++) {
    const prev = Number(history[i - 12].value);
    if (!prev) continue;
    out.push({ date: history[i].date, value: ((Number(history[i].value) - prev) / Math.abs(prev)) * 100, raw: Number(history[i].value) });
  }
  return out;
}

function formatValue(id, value, unit) {
  if (value === null || value === undefined) return '--';
  const v = Number(value);
  if (isNaN(v)) return '--';

  if (unit === '%') return v.toFixed(2) + '%';
  if (unit === 'thousands') return (v / 1000).toFixed(0) + 'K';
  if (unit === 'trillions USD') return '$' + (v / 1000000).toFixed(2) + 'T';
  if (unit === 'billions USD') return '$' + v.toFixed(0) + 'B';
  if (unit === 'millions USD') return '$' + (v / 1000).toFixed(1) + 'B';
  if (unit === 'millions of units') return v.toFixed(1) + 'M';
  if (unit === 'thousands of units') return v.toFixed(0) + 'K';
  if (unit === 'hours') return v.toFixed(1) + ' hrs';
  if (unit === '% net tightening') return v.toFixed(1) + '%';
  if (unit === 'ratio') return v.toFixed(2);
  if (unit === 'index') return v.toFixed(1);
  return v.toFixed(2);
}

function formatDate(dateStr) {
  if (!dateStr) return null;
  const [y, m, d] = dateStr.split('-');
  return `${m}/${d}/${y}`;
}

function formatDateTime(isoStr) {
  if (!isoStr) return null;
  const dt = new Date(isoStr);
  if (isNaN(dt)) return null;
  const dd   = String(dt.getUTCDate()).padStart(2, '0');
  const mo   = String(dt.getUTCMonth() + 1).padStart(2, '0');
  const yy   = String(dt.getUTCFullYear()).slice(2);
  let   h    = dt.getUTCHours();
  const min  = String(dt.getUTCMinutes()).padStart(2, '0');
  const ampm = h >= 12 ? 'pm' : 'am';
  h = h % 12 || 12;
  const hh   = String(h).padStart(2, '0');
  return `${mo}/${dd}/${yy}--${hh}:${min} ${ampm}`;
}

function getClusterLabel(id) {
  for (const [, cluster] of Object.entries(CLUSTERS)) {
    if (cluster.indicators.includes(id)) return cluster.label;
  }
  return null;
}

function getTrend(history, currentValue) {
  if (!history || history.length < 2 || currentValue === null) return null;
  const prev = Number(history[history.length - 2].value);
  const curr = Number(currentValue);
  if (isNaN(prev) || isNaN(curr)) return null;
  if (curr > prev) return '▲';
  if (curr < prev) return '▼';
  return '→';
}

function getTrendClass(id, trend) {
  if (!trend || trend === '→') return 'badge-trend-flat';
  const cfg = THRESHOLDS[id];
  if (!cfg) return 'badge-trend-flat';
  const upIsBad = cfg.direction === 'higher';
  const upIsGood = cfg.direction === 'lower' || cfg.direction === 'inverted';
  if (trend === '▲') return upIsBad ? 'badge-trend-bad' : upIsGood ? 'badge-trend-good' : 'badge-trend-flat';
  if (trend === '▼') return upIsBad ? 'badge-trend-good' : upIsGood ? 'badge-trend-bad' : 'badge-trend-flat';
  return 'badge-trend-flat';
}

function getRiskLevel(score) {
  // score is 0-100 weighted cluster score
  if (score >= 71) return { label: 'Critical',     cls: 'risk-critical' };
  if (score >= 50) return { label: 'High Risk',    cls: 'risk-high' };
  if (score >= 29) return { label: 'Elevated',     cls: 'risk-elevated' };
  if (score >= 14) return { label: 'Mild Concern', cls: 'risk-mild' };
  return                  { label: 'Normal',        cls: 'risk-normal' };
}

function computeClusterScores(allIndicators, dataMap) {
  const scores = {};
  for (const [key, cluster] of Object.entries(CLUSTERS)) {
    let pts = 0, maxPts = 0;
    const firing = [];
    for (const id of cluster.indicators) {
      const ind = allIndicators.find(i => i.id === id);
      if (!ind) continue;
      const d = dataMap[id];
      if (!d || d.manual_update_required || !d.latest) continue;
      maxPts += 2;
      const s = getStatus(id, scoringValue(id, d));
      if (s === 'red')    { pts += 2; firing.push({ label: ind.label, status: 'red' }); }
      if (s === 'orange') { pts += 1; firing.push({ label: ind.label, status: 'orange' }); }
    }
    const pct = maxPts > 0 ? (pts / maxPts) * 100 : 0;
    scores[key] = { pct, pts, maxPts, firing, label: cluster.label, weight: cluster.weight };
  }
  return scores;
}

function buildRiskDial(score) {
  const MAX = 100;
  const capped = Math.min(score, MAX);
  const cx = 60, cy = 68, R = 54, ir = 34;

  // Zone end fractions mapping score ranges to arc positions
  // Normal: 0-13, Mild: 14-28, Elevated: 29-49, High: 50-70, Critical: 71-100
  const zones = [
    { end: 14  / MAX, fill: '#3fb950' },
    { end: 29  / MAX, fill: '#7ee787' },
    { end: 50  / MAX, fill: '#d29922' },
    { end: 71  / MAX, fill: '#f0883e' },
    { end: 1,         fill: '#f85149' },
  ];

  // frac=0 → left (9-o'clock), frac=1 → right (3-o'clock), arc goes through top
  const px = (f, r) => (cx + r * Math.cos(Math.PI * (1 - f))).toFixed(1);
  const py = (f, r) => (cy - r * Math.sin(Math.PI * (1 - f))).toFixed(1);

  let paths = '';
  let prev = 0;
  for (const z of zones) {
    // Outer arc: sweep=1 (clockwise in SVG = goes upward, left→top→right)
    // Inner arc: sweep=0 (counter-clockwise in SVG = returns right→top→left)
    paths += `<path d="M ${px(prev,R)},${py(prev,R)} A ${R},${R} 0 0,1 ${px(z.end,R)},${py(z.end,R)} L ${px(z.end,ir)},${py(z.end,ir)} A ${ir},${ir} 0 0,0 ${px(prev,ir)},${py(prev,ir)} Z" fill="${z.fill}" opacity="0.88"/>`;
    prev = z.end;
  }

  // Score range labels inside each arc band at mid-radius
  // Zones: Normal(0-13%), Mild(14-28%), Elevated(29-49%), High(50-70%), Critical(71%+)
  const zoneLabels = [
    { f_start: 0,        f_end: 14/MAX, label: 'OK'  },
    { f_start: 14/MAX,   f_end: 29/MAX, label: 'Mild' },
    { f_start: 29/MAX,   f_end: 50/MAX, label: 'Elev' },
    { f_start: 50/MAX,   f_end: 71/MAX, label: 'High' },
    { f_start: 71/MAX,   f_end: 1,      label: 'Crit' },
  ];
  const rMid = (R + ir) / 2; // mid-radius = 44
  let labels = '';
  for (const { f_start, f_end, label } of zoneLabels) {
    const f_mid = (f_start + f_end) / 2;
    labels += `<text x="${px(f_mid, rMid)}" y="${py(f_mid, rMid)}" fill="rgba(0,0,0,0.55)" font-size="5" font-weight="700" text-anchor="middle" dominant-baseline="middle">${label}</text>`;
  }

  // Needle: vertical line rotated. -90° = pointing left (score=0), +90° = pointing right (score=MAX)
  const needleRot = (-90 + (capped / MAX) * 180).toFixed(1);

  return `<svg viewBox="0 0 120 72" width="240" height="144" style="flex-shrink:0;overflow:visible" aria-label="Risk dial">
    ${paths}
    ${labels}
    <line x1="${cx}" y1="${cy}" x2="${cx}" y2="${cy - R + 10}" stroke="#e6edf3" stroke-width="2.5" stroke-linecap="round" transform="rotate(${needleRot},${cx},${cy})"/>
    <circle cx="${cx}" cy="${cy}" r="5" fill="#21262d" stroke="#c9d1d9" stroke-width="1.5"/>
  </svg>`;
}

function sparkline(history, status) {
  if (!history || history.length < 2) return '<svg><text x="0" y="20" fill="#8b949e" font-size="10">No history</text></svg>';
  const vals = history.map(h => Number(h.value)).filter(v => !isNaN(v));
  if (vals.length < 2) return '';
  const mn = Math.min(...vals), mx = Math.max(...vals);
  const range = mx - mn || 1;
  const W = 260, H = 36, pad = 2;
  const pts = vals.map((v, i) => {
    const x = pad + (i / (vals.length - 1)) * (W - 2 * pad);
    const y = H - pad - ((v - mn) / range) * (H - 2 * pad);
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  }).join(' ');
  const color = status === 'red' ? '#f85149' : status === 'orange' ? '#d29922' : '#3fb950';
  return `<svg viewBox="0 0 ${W} ${H}" preserveAspectRatio="none">
    <polyline points="${pts}" fill="none" stroke="${color}" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" opacity="0.85"/>
  </svg>`;
}
