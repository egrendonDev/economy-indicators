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
  console.error('');
  console.error('  To fix this:');
  console.error('  1. Get a free API key at: https://fred.stlouisfed.org/docs/api/api_key.html');
  console.error('     (click "Request API Key" - takes ~30 seconds, free account required)');
  console.error('  2. Copy .env.example to .env in the project root:');
  console.error('       cp .env.example .env');
  console.error('  3. Open .env and replace "your_fred_api_key_here" with your actual key');
  console.error('  4. Re-run this script');
  console.error('');
  process.exit(1);
}

const sleep = ms => new Promise(r => setTimeout(r, ms));
const FETCH_DELAY_MS = 400; // avoid FRED API 429 rate limiting

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
// Loads cached value from the indicator's own per-indicator JSON file.

function loadExisting(id) {
  const filePath = `data/monthly/${id}.json`;
  if (!existsSync(filePath)) return null;
  try {
    const file = JSON.parse(readFileSync(filePath, 'utf8'));
    return file.indicators?.find(i => i.id === id) ?? null;
  } catch { return null; }
}

function manualPlaceholder(indicator) {
  const existing = loadExisting(indicator.id);
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

// ─── Fetch all monthly indicators ─────────────────────────────────────────────

async function fetchAllMonthly(indicators) {
  const results = [];
  for (const ind of indicators) {
    if (ind.access === 'fred_api') {
      results.push(await fetchFredIndicator(ind));
      await sleep(FETCH_DELAY_MS);
    } else {
      results.push(manualPlaceholder(ind));
    }
  }
  return results;
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  banner('Monthly Data Fetch - FRED API', c.cyan);

  const force = process.argv.includes('--force');
  const proxyFile = 'data/monthly/ism_manufacturing.json';
  const check = shouldRefresh(proxyFile, 'monthly', force);
  logRefreshDecision('Monthly Data', proxyFile, 'monthly', check);
  if (!check.needed) { skip('Data is fresh - skipping fetch (use --force to override)'); return; }

  section('Fetching Monthly Indicators');
  const monthly  = byFrequency('monthly');
  const results  = await fetchAllMonthly(monthly);

  section('Writing output files');
  mkdirSync('data/monthly', { recursive: true });

  const timestamp = new Date().toISOString();
  for (const ind of results) {
    const filePath = `data/monthly/${ind.id}.json`;
    writeFileSync(filePath, JSON.stringify({ last_updated: timestamp, indicators: [ind] }, null, 2));
    ok(`Saved: ${filePath}`);
  }

  const succeeded = results.filter(i => !i.error && !i.manual_update_required).length;
  const manual    = results.filter(i => i.manual_update_required).length;
  const failed    = results.filter(i => i.error).length;

  if (failed > 0) {
    banner(`DONE - ${succeeded} fetched, ${manual} manual, ${failed} FAILED`, c.red);
    process.exit(1);
  } else {
    banner(`SUCCESS - ${succeeded} fetched, ${manual} manual (pending update)`, c.green);
  }
}

main();
