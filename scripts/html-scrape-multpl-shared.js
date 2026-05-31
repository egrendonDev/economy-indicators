/**
 * html-scrape-multpl-shared.js
 *
 * Scrapes multpl.com for 4 stock market valuation indicators and writes
 * each result to its own per-indicator JSON file:
 *   data/monthly/shiller_cape.json
 *   data/monthly/sp500_dividend_yield.json
 *   data/monthly/price_to_sales.json
 *   data/monthly/trailing_pe.json
 *
 * Usage:
 *   npm run html-scrape:multpl
 *
 * Safety:
 *   - 1-hour cooldown guard: skips if last run was less than 1 hour ago
 *   - Monthly freshness check: skips if all indicators already have current-month data
 *   - Range validation before any write
 *   - Duplicate/stale date guard - re-running back to back is safe and non-destructive
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { createRequire } from 'module';
import { shouldRefresh, logRefreshDecision } from './utils/should-refresh.js';
import { fetchHtml, parseMonthDate, parseNumericValue } from './utils/html-scrape-utils.js';

const require = createRequire(import.meta.url);
const cheerio = require('cheerio');

// ─── Logging helpers ──────────────────────────────────────────────────────────
const c = {
  reset:  '\x1b[0m',
  bold:   '\x1b[1m',
  green:  '\x1b[32m',
  red:    '\x1b[31m',
  yellow: '\x1b[33m',
  cyan:   '\x1b[36m',
  gray:   '\x1b[90m',
};
const info    = (msg)       => console.log(`${c.cyan}  >${c.reset} ${msg}`);
const ok      = (msg)       => console.log(`${c.green}  OK${c.reset}  ${msg}`);
const skip    = (msg)       => console.log(`${c.gray}  --${c.reset}  ${msg}`);
const warn    = (msg)       => console.warn(`${c.yellow}  WARN${c.reset} ${msg}`);
const fail    = (msg, exit) => { console.error(`${c.red}  ERR${c.reset} ${msg}`); if (exit) process.exit(1); };
const section = (msg)       => console.log(`\n${c.bold}  [ ${msg} ]${c.reset}`);
const banner  = (msg, color) => {
  const line = '─'.repeat(52);
  console.log(`\n${color}${c.bold}  ${line}${c.reset}`);
  console.log(`${color}${c.bold}  ${msg}${c.reset}`);
  console.log(`${color}${c.bold}  ${line}${c.reset}\n`);
};

const __filename = fileURLToPath(import.meta.url);
const __dirname  = dirname(__filename);
const ROOT       = join(__dirname, '..');

const HISTORY_MONTHS = 36;
const PROXY_FILE     = join(ROOT, 'data', 'monthly', 'shiller_cape.json');

// ─── Indicator definitions ─────────────────────────────────────────────────────

const INDICATORS = [
  {
    id:    'shiller_cape',
    label: 'Shiller CAPE Ratio',
    url:   'https://www.multpl.com/shiller-pe/table/by-month',
    unit:  'ratio',
    min:   5,
    max:   200,
  },
  {
    id:    'sp500_dividend_yield',
    label: 'S&P 500 Dividend Yield',
    url:   'https://www.multpl.com/s-p-500-dividend-yield/table/by-month',
    unit:  '%',
    min:   0.1,
    max:   15,
  },
  {
    id:    'price_to_sales',
    label: 'S&P 500 Price to Sales',
    url:   'https://www.multpl.com/s-p-500-price-to-sales/table/by-month',
    unit:  'ratio',
    min:   0.1,
    max:   20,
  },
  {
    id:    'trailing_pe',
    label: 'Trailing P/E (S&P 500)',
    url:   'https://www.multpl.com/s-p-500-pe-ratio/table/by-month',
    unit:  'ratio',
    min:   5,
    max:   200,
  },
];

// ─── Scraper ──────────────────────────────────────────────────────────────────

async function scrapeIndicator(indicator) {
  info(`Scraping  ${indicator.label}`);
  info(`          ${indicator.url}`);

  let html;
  try {
    html = await fetchHtml(indicator.url);
  } catch (err) {
    fail(`${indicator.label} - fetch failed: ${err.message}`, false);
    return { id: indicator.id, error: err.message };
  }

  const $ = cheerio.load(html);

  const rows = [];
  $('table#datatable tr, table.datatable tr, table tr').each((i, tr) => {
    const cells = $(tr).find('td');
    if (cells.length < 2) return;
    const date  = parseMonthDate($(cells[0]).text());
    const value = parseNumericValue($(cells[1]).text());
    if (date && value !== null) rows.push({ date, value });
  });

  if (rows.length === 0) {
    fail(`${indicator.label} - no table rows parsed. Page structure may have changed.`, false);
    return { id: indicator.id, error: 'no rows parsed' };
  }

  // ─── Range validation ──────────────────────────────────────────────────────

  const invalid = rows.filter(r => r.value < indicator.min || r.value > indicator.max);
  if (invalid.length > 0) {
    warn(`${indicator.label} - ${invalid.length} row(s) outside expected range [${indicator.min}, ${indicator.max}]:`);
    invalid.slice(0, 3).forEach(r => warn(`  date=${r.date}  value=${r.value}`));
  }

  const valid = rows.filter(r => r.value >= indicator.min && r.value <= indicator.max);
  if (valid.length === 0) {
    fail(`${indicator.label} - 0 valid rows after range check. Suspected HTML drift.`, false);
    return { id: indicator.id, error: 'all rows failed range validation' };
  }

  // Sort ascending (source delivers newest-first)
  valid.sort((a, b) => a.date.localeCompare(b.date));

  const history = valid.slice(-HISTORY_MONTHS);
  const latest  = history[history.length - 1];

  ok(`${indicator.label.padEnd(36)} ${latest.value} ${indicator.unit}  (${latest.date})  [${history.length} months]`);

  return { id: indicator.id, history, latest };
}

// ─── Load / write per-indicator file ──────────────────────────────────────────

function loadExistingIndicator(id) {
  const filePath = join(ROOT, 'data', 'monthly', `${id}.json`);
  if (!existsSync(filePath)) return null;
  try {
    const file = JSON.parse(readFileSync(filePath, 'utf8'));
    return file.indicators?.[0] ?? null;
  } catch { return null; }
}

function writeIndicatorFile(result) {
  const { id, history, latest, error } = result;

  if (error) {
    warn(`${id} - scrape error, keeping existing data`);
    return false;
  }

  // ─── Duplicate/stale guard ─────────────────────────────────────────────────
  const existing = loadExistingIndicator(id);
  if (existing?.latest?.date && latest?.date) {
    if (latest.date < existing.latest.date) {
      warn(`${id} - stale data detected (incoming: ${latest.date}, existing: ${existing.latest.date})`);
      warn(`       Suspected cause: source may not yet have published the latest month.`);
      warn(`       Action: skipping write, existing data preserved.`);
      return false;
    }
    if (latest.date === existing.latest.date) {
      skip(`${id} - duplicate data (same latest date: ${latest.date}), skipping write`);
      return false;
    }
  }

  const filePath = join(ROOT, 'data', 'monthly', `${id}.json`);
  mkdirSync(join(ROOT, 'data', 'monthly'), { recursive: true });

  const updatedIndicator = {
    ...(existing ?? {}),
    latest,
    history,
    manual_update_required: false,
    note: `Scraped from multpl.com on ${new Date().toISOString()}`
  };

  writeFileSync(filePath, JSON.stringify({
    last_updated: new Date().toISOString(),
    indicators: [updatedIndicator]
  }, null, 2));

  ok(`${id} - saved to data/monthly/${id}.json`);
  return true;
}

// ─── Monthly data freshness check ─────────────────────────────────────────────
// Source publishes monthly. Skip if all indicators already have current-month data.

function allIndicatorsCurrentMonth() {
  const currentMonth = new Date().toISOString().slice(0, 7); // "YYYY-MM"
  return INDICATORS.every(({ id }) => {
    const existing = loadExistingIndicator(id);
    if (!existing?.latest?.date) return false;
    return existing.latest.date.slice(0, 7) === currentMonth;
  });
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  banner('HTML Scrape - multpl.com', c.cyan);

  // Guard 1: 1-hour cooldown
  const cooldown = shouldRefresh(PROXY_FILE, 'html_scrape', false);
  logRefreshDecision('multpl.com cooldown check', PROXY_FILE, 'html_scrape', cooldown);
  if (!cooldown.needed) {
    warn(`Cooldown not met - last run was ${cooldown.hoursSince}h ago (minimum: 1h).`);
    warn(`Skipping to avoid unnecessary requests.`);
    banner('SKIPPED - cooldown not met', c.yellow);
    process.exit(0);
  }

  // Guard 2: monthly freshness - data updates once a month, skip if already current
  if (allIndicatorsCurrentMonth()) {
    skip(`All indicators already have ${new Date().toISOString().slice(0, 7)} data.`);
    skip(`Next new data expected early next month.`);
    banner('SKIPPED - all indicators current for this month', c.gray);
    process.exit(0);
  }

  section('Scraping indicators');
  const results = [];
  for (const ind of INDICATORS) {
    results.push(await scrapeIndicator(ind));
  }

  section('Writing per-indicator files');
  let written = 0;
  let skipped = 0;
  let failed  = 0;

  for (const result of results) {
    const didWrite = writeIndicatorFile(result);
    if (didWrite) written++;
    else if (result.error) failed++;
    else skipped++;
  }

  const summary = `${written} updated, ${skipped} skipped, ${failed} failed`;

  if (failed > 0 && written === 0) {
    banner(`FAILED - ${summary}`, c.red);
    process.exit(1);
  } else if (failed > 0) {
    banner(`PARTIAL - ${summary}`, c.yellow);
  } else {
    banner(`SUCCESS - ${summary}`, c.green);
  }
}

main();
