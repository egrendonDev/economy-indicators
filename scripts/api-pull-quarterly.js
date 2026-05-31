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

const sleep = ms => new Promise(r => setTimeout(r, ms));
const FETCH_DELAY_MS = 400; // avoid FRED API 429 rate limiting

const OBSERVATION_LIMIT = 20; // 5 years of quarterly data

// ─── FRED fetcher ─────────────────────────────────────────────────────────────

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
  const filePath = `data/quarterly/${id}.json`;
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

// ─── Fetch all quarterly indicators ───────────────────────────────────────────

async function fetchAllQuarterly(indicators) {
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
  banner('Quarterly Data Fetch - FRED API', c.cyan);

  const force = process.argv.includes('--force');
  const proxyFile = 'data/quarterly/loan_officer_survey.json';
  const check = shouldRefresh(proxyFile, 'quarterly', force);
  logRefreshDecision('Quarterly Data', proxyFile, 'quarterly', check);
  if (!check.needed) { skip('Data is fresh - skipping fetch (use --force to override)'); return; }

  section('Fetching Quarterly Indicators');
  const quarterly = byFrequency('quarterly');
  const results   = await fetchAllQuarterly(quarterly);

  section('Writing output files');
  mkdirSync('data/quarterly', { recursive: true });

  const timestamp = new Date().toISOString();
  for (const ind of results) {
    const filePath = `data/quarterly/${ind.id}.json`;
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
