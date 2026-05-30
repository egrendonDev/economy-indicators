import 'dotenv/config';
import { writeFileSync, mkdirSync, readFileSync, existsSync } from 'fs';
import { fetchSeries } from './utils/fred-client.js';
import { byFrequency } from './utils/series-map.js';
import { shouldRefresh, logRefreshDecision } from './utils/should-refresh.js';

// ─── Logging helpers ──────────────────────────────────────────────────────────
const c = { reset:'\x1b[0m', bold:'\x1b[1m', green:'\x1b[32m', red:'\x1b[31m', yellow:'\x1b[33m', cyan:'\x1b[36m', gray:'\x1b[90m' };
const info    = (msg) => console.log(`${c.cyan}  >${c.reset} ${msg}`);
const ok      = (msg) => console.log(`${c.green}  OK${c.reset}  ${msg}`);
const skip    = (msg) => console.log(`${c.gray}  --${c.reset}  ${msg}`);
const warn    = (msg) => console.warn(`${c.yellow}  WARN${c.reset} ${msg}`);
const fail    = (msg) => console.error(`${c.red}  ERR${c.reset} ${msg}`);
const section = (msg) => console.log(`\n${c.bold}  [ ${msg} ]${c.reset}`);
const banner  = (msg, color) => { const l = '─'.repeat(52); console.log(`\n${color}${c.bold}  ${l}\n  ${msg}\n  ${l}${c.reset}\n`); };

const API_KEY = process.env.FRED_API_KEY;
if (!API_KEY) {
  fail('FRED_API_KEY environment variable is not set.');
  process.exit(1);
}

const OBSERVATION_LIMIT = 36; // 3 years of monthly data

// ─── FRED fetcher ────────────────────────────────────────────────────────────

async function fetchFredIndicator(indicator) {
  info(`Fetching  ${indicator.label} (${indicator.fredSeries})`);
  try {
    const history = await fetchSeries(indicator.fredSeries, API_KEY, OBSERVATION_LIMIT);
    const latest  = history[history.length - 1];
    ok(`${indicator.label.padEnd(32)} ${latest.value} ${indicator.unit}  (${latest.date})`);
    return { ...buildBase(indicator), latest, history };
  } catch (err) {
    fail(`${indicator.label} - ${err.message}`);
    return { ...buildBase(indicator), error: err.message };
  }
}

// ─── Manual / scrape placeholder ─────────────────────────────────────────────
// These indicators require scraping or PDF parsing.
// The dashboard will display the last saved value until manually updated.

function loadExisting(filePath, id) {
  if (!existsSync(filePath)) return null;
  try {
    const file = JSON.parse(readFileSync(filePath, 'utf8'));
    return file.indicators?.find(i => i.id === id) ?? null;
  } catch { return null; }
}

function manualPlaceholder(indicator, existingFilePath) {
  const existing = loadExisting(existingFilePath, indicator.id);
  if (existing && !existing.error) {
    skip(`${indicator.label} - cached (manual update required)`);
    return { ...existing, manual_update_required: true };
  }
  warn(`${indicator.label} - no data yet (manual update required)`);
  return {
    ...buildBase(indicator),
    latest:  null,
    history: [],
    manual_update_required: true,
    note: `This indicator requires manual data entry or a custom scraper. Source: ${indicator.url}`
  };
}

// ─── Shared base builder ──────────────────────────────────────────────────────

function buildBase(indicator) {
  return {
    id:          indicator.id,
    label:       indicator.label,
    description: indicator.description,
    unit:        indicator.unit,
    source:      indicator.source,
    url:         indicator.url,
    type:        indicator.type,
    importance:  indicator.importance,
    category:    indicator.category
  };
}

// ─── Category fetch functions ─────────────────────────────────────────────────

async function fetchMacro(indicators) {
  section('Monthly / Macro');
  const results = [];
  for (const ind of indicators.filter(i => i.category === 'macro')) {
    if (ind.access === 'fred_api') results.push(await fetchFredIndicator(ind));
    else results.push(manualPlaceholder(ind, 'data/monthly/macro.json'));
  }
  return results;
}

async function fetchStockMarket(indicators) {
  section('Monthly / Stock Market');
  const results = [];
  for (const ind of indicators.filter(i => i.category === 'stock_market')) {
    if (ind.access === 'fred_api') results.push(await fetchFredIndicator(ind));
    else results.push(manualPlaceholder(ind, 'data/monthly/stock_market.json'));
  }
  return results;
}

async function fetchResidential(indicators) {
  section('Monthly / Residential');
  const results = [];
  for (const ind of indicators.filter(i => i.category === 'residential')) {
    if (ind.access === 'fred_api') results.push(await fetchFredIndicator(ind));
    else results.push(manualPlaceholder(ind, 'data/monthly/residential.json'));
  }
  return results;
}

async function fetchAuto(indicators) {
  section('Monthly / Auto');
  const results = [];
  for (const ind of indicators.filter(i => i.category === 'auto')) {
    if (ind.access === 'fred_api') results.push(await fetchFredIndicator(ind));
    else results.push(manualPlaceholder(ind, 'data/monthly/auto.json'));
  }
  return results;
}

async function fetchCreditCards(indicators) {
  section('Monthly / Credit Cards');
  const results = [];
  for (const ind of indicators.filter(i => i.category === 'credit_cards')) {
    if (ind.access === 'fred_api') results.push(await fetchFredIndicator(ind));
    else results.push(manualPlaceholder(ind, 'data/monthly/credit_cards.json'));
  }
  return results;
}

// ─── Write helper ─────────────────────────────────────────────────────────────

function writeOutput(folder, filename, indicators) {
  mkdirSync(folder, { recursive: true });
  writeFileSync(`${folder}/${filename}`, JSON.stringify({ last_updated: new Date().toISOString(), indicators }, null, 2));
  ok(`Saved: ${folder}/${filename}`);
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  banner('Monthly Data Fetch - FRED API', c.cyan);

  const force = process.argv.includes('--force');
  const check = shouldRefresh('data/monthly/macro.json', 'monthly', force);
  logRefreshDecision('Monthly Data', 'data/monthly/macro.json', 'monthly', check);
  if (!check.needed) { skip('Data is fresh - skipping fetch (use --force to override)'); return; }

  const monthly = byFrequency('monthly');

  const [macro, stockMarket, residential, auto, creditCards] = await Promise.allSettled([
    fetchMacro(monthly),
    fetchStockMarket(monthly),
    fetchResidential(monthly),
    fetchAuto(monthly),
    fetchCreditCards(monthly)
  ]);

  section('Writing output files');
  writeOutput('data/monthly', 'macro.json',        macro.value       ?? []);
  writeOutput('data/monthly', 'stock_market.json', stockMarket.value ?? []);
  writeOutput('data/monthly', 'residential.json',  residential.value ?? []);
  writeOutput('data/monthly', 'auto.json',          auto.value        ?? []);
  writeOutput('data/monthly', 'credit_cards.json', creditCards.value ?? []);

  const allResults = [macro, stockMarket, residential, auto, creditCards].flatMap(r => r.value ?? []);
  const succeeded  = allResults.filter(i => !i.error && !i.manual_update_required).length;
  const manual     = allResults.filter(i => i.manual_update_required).length;
  const failed     = allResults.filter(i => i.error).length;

  if (failed > 0) {
    banner(`DONE - ${succeeded} fetched, ${manual} manual, ${failed} FAILED`, c.red);
    process.exit(1);
  } else {
    banner(`SUCCESS - ${succeeded} fetched, ${manual} manual (pending update)`, c.green);
  }
}

main();
