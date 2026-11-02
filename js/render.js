// render.js - Card, section and summary rendering, plus data loading.
// Classic script (not a module): top-level names are shared globals across all
// dashboard scripts. Load order in index.html: config.js -> helpers.js -> charts.js -> render.js -> chart-popup.js -> app.js.

// ─── RENDER ──────────────────────────────────────────────────────────────────

function renderCard(indicator, dataMap) {
  const d = dataMap[indicator.id];
  const hasPending = !d || d.manual_update_required || d.error || !d.latest;
  const value = hasPending ? null : d.latest?.value;
  const hist = d?.history || [];

  const isYoy = YOY_INDICATORS.has(indicator.id);
  const yoyPct = (!hasPending && isYoy) ? computeYoY(hist) : null;
  const statusValue = hasPending ? null : scoringValue(indicator.id, d);

  const cfg = THRESHOLDS[indicator.id] || {};
  const status = hasPending ? 'pending' : getStatus(indicator.id, statusValue);
  const msgSet = MESSAGES[indicator.id] || {};
  const msg = hasPending ? null : msgSet[status];
  const pillLabel = status === 'pending' ? 'Pending' : status === 'green' ? 'Healthy' : status === 'orange' ? 'Watch' : 'Warning';

  const meta = INDICATOR_META[indicator.id] || {};
  const dateLabel = formatDateTime(d?.file_updated);
  const trend = getTrend(hist, value);
  const stale = isStale(d?.file_updated, meta.frequency);

  const tooltipText = (TOOLTIPS[indicator.id] || indicator.description).replace(/"/g, '&quot;');
  const tabTarget = meta.access === 'fred_api' ? 'fred-api' : meta.access === 'html_scrape' ? 'html-scrape' : 'manual';
  const clusterLabel = getClusterLabel(indicator.id);

  const row1 = [
    clusterLabel ? `<span class="badge" style="color:var(--blue);border-color:var(--blue);background:#0d1f38">${clusterLabel}</span>` : '',
    meta.frequency  ? `<span class="badge">${meta.frequency}</span>` : '',
    meta.importance ? `<span class="badge">${meta.importance}</span>` : '',
  ].filter(Boolean).join('');

  const badgeRows = `
    <div class="badge-row">${row1}</div>
    <div class="badge-row">
      ${trend ? `<span class="badge ${getTrendClass(indicator.id, trend)}">${trend} Trend</span>` : ''}
      <span class="badge badge-info" data-tooltip="${tooltipText}">ℹ Info</span>
      <span class="badge badge-view-details" onclick="viewDetails('${tabTarget}','${indicator.id}')">View Details</span>
    </div>
    <div class="badge-row" style="justify-content:center">
      ${dateLabel ? `<span class="badge ${stale ? 'badge-trend-bad' : ''}" style="font-size:16px">Updated ${dateLabel}${stale ? ' - Stale' : ''}</span>` : ''}
    </div>`;

  return `<div class="ind-card ${status}">
    <div class="card-top">
      <div class="card-name">${indicator.label}</div>
      <div class="status-pill ${status}">${pillLabel}</div>
    </div>
    <div class="card-values">
      <div class="current-val ${status}">${hasPending ? '--' : yoyPct !== null ? (yoyPct >= 0 ? '+' : '') + yoyPct.toFixed(1) + '%' : formatValue(indicator.id, value, indicator.unit)}</div>
      ${yoyPct !== null ? `
        <div class="avg-pill" style="color:#79c0ff;border-color:#388bfd66;background:#0d1f38">YoY</div>
        <div class="avg-pill">${cfg.avg}</div>
        <div class="avg-pill">${formatValue(indicator.id, value, indicator.unit)}</div>
      ` : cfg.avg ? `<div class="avg-pill">avg ${cfg.avg}</div>` : ''}
    </div>
    <div class="sparkline-wrap${hasPending ? '' : ' clickable'}"${hasPending ? '' : ` onclick="openChartModal('${indicator.id}')" title="Click to expand"`}>${sparkline(hist, status)}${hasPending ? '' : '<span class="expand-hint">&#x2922; Expand</span>'}</div>
    <div class="card-desc">
      ${msg || TOOLTIPS[indicator.id] || indicator.description}
    </div>
    <div class="badge-section">${badgeRows}</div>
  </div>`;
}

function renderCategory(cat, allIndicators, dataMap, filterType) {
  const inds = allIndicators.filter(i => i.category === cat.key && i.type === filterType);
  if (!inds.length) return '';
  const pills = cat.investigate
    ? cat.investigate.map(item => `<a class="investigate-pill" href="${item.url}" target="_blank" rel="noopener">${item.label}</a>`).join('')
    : '';
  const investigateRow = pills
    ? `<div class="category-label-investigate"><span class="category-label-investigate-label">If flagged:</span>${pills}</div>`
    : '';
  return `<div class="category-label">
    <i class="ti ${cat.icon}"></i>
    <div class="category-label-body">
      <div class="category-label-top">
        <span class="category-label-title">${cat.label}</span>
        <span class="category-label-desc">- ${cat.desc}</span>
      </div>
      ${investigateRow}
    </div>
  </div>
  <div class="cards-grid">${inds.map(i => renderCard(i, dataMap)).join('')}</div>`;
}

function renderSection(containerId, type, allIndicators, dataMap) {
  const cats = LAYOUT[type];
  const el = document.getElementById(containerId);
  el.innerHTML = cats.map(c => renderCategory(c, allIndicators, dataMap, type)).join('');
}

function renderSummary(allIndicators, dataMap) {
  let warnings = [], watches = [], leadWarn = 0, leadWatch = 0, lagWarn = 0, lagWatch = 0;
  let latestDate = null;

  for (const ind of allIndicators) {
    const d = dataMap[ind.id];
    if (!d || d.manual_update_required || !d.latest) continue;
    const v = d.latest.value;
    if (d.latest.date && (!latestDate || d.latest.date > latestDate)) latestDate = d.latest.date;
    const s = getStatus(ind.id, scoringValue(ind.id, d));
    if (s === 'red')    { warnings.push(ind.label); ind.type === 'leading' ? leadWarn++ : lagWarn++; }
    if (s === 'orange') { watches.push(ind.label);  ind.type === 'leading' ? leadWatch++ : lagWatch++; }
  }

  // Cluster-weighted score (0-100)
  const clusterScores = computeClusterScores(allIndicators, dataMap);
  const weightedScore = Math.round(
    Object.values(clusterScores).reduce((sum, c) => sum + c.pct * c.weight, 0)
  );

  const risk = getRiskLevel(weightedScore);

  // Cluster mini-card HTML
  const clusterStatusColor = pct => pct >= 71 ? 'var(--red)' : pct >= 50 ? '#e07b22' : pct >= 29 ? 'var(--orange)' : pct >= 14 ? '#7ee787' : 'var(--green)';
  const clusterMiniCards = Object.entries(clusterScores).map(([key, c]) => {
    const color = clusterStatusColor(c.pct);
    return `<div class="summary-card" style="border-left:4px solid ${color};min-width:0">
      <div class="label">${c.label}</div>
      <div class="value" style="font-size:16px;color:${color}">${Math.round(c.pct)}%</div>
      <div class="sub">${(c.weight * 100).toFixed(0)}% weight</div>
    </div>`;
  }).join('');

  // Summary cards
  document.getElementById('summary-row').innerHTML = `
    <div class="summary-card ${risk.cls}" style="display:flex;align-items:center;justify-content:space-between;gap:12px;">
      <div>
        <div class="label">Overall Risk Level</div>
        <div class="value">${risk.label}</div>
        <div class="sub">Cluster score: ${weightedScore}%</div>
      </div>
      ${buildRiskDial(weightedScore)}
    </div>
    <div class="summary-card">
      <div class="label">Leading - Warnings</div>
      <div class="value" style="color:var(--red)">${leadWarn}</div>
      <div class="sub">${leadWatch} in watch zone</div>
    </div>
    <div class="summary-card">
      <div class="label">Lagging - Warnings</div>
      <div class="value" style="color:var(--red)">${lagWarn}</div>
      <div class="sub">${lagWatch} in watch zone</div>
    </div>
    <div class="summary-card">
      <div class="label">Weighted Score</div>
      <div class="value" style="color:var(--blue)">${weightedScore}%</div>
      <div class="sub">Cluster-weighted risk</div>
    </div>`;

  // Cluster row
  document.getElementById('cluster-row').innerHTML = clusterMiniCards;

  if (latestDate) {
    document.getElementById('last-updated').textContent = `Last updated: ${latestDate}`;
  }

  // Freshness badge - X/Y current, hover for which are stale
  let staleList = [];
  let freshnessTotal = 0;
  for (const ind of allIndicators) {
    const meta = INDICATOR_META[ind.id] || {};
    if (!meta.frequency) continue;
    freshnessTotal++;
    const d = dataMap[ind.id];
    if (isStale(d?.file_updated, meta.frequency)) {
      const days = d?.file_updated ? Math.floor((Date.now() - new Date(d.file_updated)) / 86400000) : null;
      const over = days !== null ? days - STALE_THRESHOLDS[meta.frequency] : null;
      staleList.push(`${ind.label} — ${over !== null ? over + 'd overdue' : 'no data'}`);
    }
  }
  const freshnessBadge = document.getElementById('freshness-badge');
  if (freshnessBadge) {
    freshnessBadge.style.display = 'inline-block';
    if (staleList.length) {
      freshnessBadge.className = 'status-pill red';
      freshnessBadge.innerHTML = `<i class="ti ti-alert-triangle" style="margin-right:4px"></i>${freshnessTotal - staleList.length}/${freshnessTotal} current, ${staleList.length} stale`;
      freshnessBadge.dataset.tooltip = staleList.join('\n');
    } else {
      freshnessBadge.className = 'status-pill green';
      freshnessBadge.innerHTML = `<i class="ti ti-check" style="margin-right:4px"></i>${freshnessTotal}/${freshnessTotal} current`;
      freshnessBadge.removeAttribute('data-tooltip');
    }
  }

  // Alert boxes
  const alertEl = document.getElementById('alerts');
  let html = '';
  if (warnings.length) {
    html += `<div class="alert-box red"><strong><i class="ti ti-alert-triangle"></i> ${warnings.length} indicator${warnings.length > 1 ? 's' : ''} in warning zone (red)</strong><ul>${warnings.map(l => `<li>${l}</li>`).join('')}</ul></div>`;
  }
  if (watches.length) {
    html += `<div class="alert-box orange"><strong><i class="ti ti-eye"></i> ${watches.length} indicator${watches.length > 1 ? 's' : ''} in watch zone (orange)</strong><ul>${watches.map(l => `<li>${l}</li>`).join('')}</ul></div>`;
  }
  if (!html) {
    html = `<div class="alert-box" style="background:var(--green-bg);border:1px solid var(--green);color:var(--green)"><strong><i class="ti ti-circle-check"></i> All indicators in healthy range</strong></div>`;
  }
  alertEl.innerHTML = html;
}

// ─── LOAD DATA ───────────────────────────────────────────────────────────────

// All indicators (mirrored from series-map for dashboard use)

async function loadAllData() {
  const dataMap = {};
  const results = await Promise.allSettled(DATA_FILES.map(f => fetch(f).then(r => r.ok ? r.json() : null)));
  results.forEach(r => {
    if (r.status === 'fulfilled' && r.value?.indicators) {
      const fileUpdated = r.value.last_updated || null;
      r.value.indicators.forEach(ind => {
        if (ind.id) dataMap[ind.id] = { ...ind, file_updated: fileUpdated };
      });
    }
  });
  return dataMap;
}
