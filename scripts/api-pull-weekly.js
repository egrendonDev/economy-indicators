import 'dotenv/config';
import { writeFileSync, mkdirSync } from 'fs';
import { fetchSeries } from './utils/fred-client.js';
import { byFrequency } from './utils/series-map.js';
import { shouldRefresh, logRefreshDecision } from './utils/should-refresh.js';

// ─── Logging helpers ──────────────────────────────────────────────────────────
const c = { reset:'\x1b[0m', bold:'\x1b[1m', green:'\x1b[32m', red:'\x1b[31m', yellow:'\x1b[33m', cyan:'\x1b[36m', gray:'\x1b[90m' };
const info  = (msg) => console.log(`${c.cyan}  >${c.reset} ${msg}`);
const ok    = (msg) => console.log(`${c.green}  OK${c.reset}  ${msg}`);
const skip  = (msg) => console.log(`${c.gray}  --${c.reset}  ${msg}`);
const warn  = (msg) => console.warn(`${c.yellow}  WARN${c.reset} ${msg}`);
const fail  = (msg) => console.error(`${c.red}  ERR${c.reset} ${msg}`);
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

// Observation limits per FRED series type
// Yield curve and credit spreads are daily on FRED - fetch 365 for ~1yr of daily data
// Jobless claims is weekly - fetch 104 for ~2yrs of weekly data
const OBSERVATION_LIMITS = {
  T10Y2Y:       365,
  BAMLH0A0HYM2: 365,
  ICSA:         104
};

const DEFAULT_LIMIT = 104;

async function fetchWeeklyMacro() {
  const indicators = byFrequency('weekly').filter(i => i.category === 'macro');
  const results = [];

  for (const indicator of indicators) {
    if (indicator.access !== 'fred_api' || !indicator.fredSeries) {
      skip(`${indicator.label} - not a FRED indicator, skipping`);
      continue;
    }

    info(`Fetching  ${indicator.label} (${indicator.fredSeries})`);

    try {
      const limit = OBSERVATION_LIMITS[indicator.fredSeries] ?? DEFAULT_LIMIT;
      const history = await fetchSeries(indicator.fredSeries, API_KEY, limit);
      const latest = history[history.length - 1];

      results.push({
        id:          indicator.id,
        label:       indicator.label,
        description: indicator.description,
        unit:        indicator.unit,
        source:      indicator.source,
        url:         indicator.url,
        type:        indicator.type,
        importance:  indicator.importance,
        latest,
        history
      });

      ok(`${indicator.label.padEnd(32)} ${latest.value} ${indicator.unit}  (${latest.date})`);
      await sleep(FETCH_DELAY_MS);
    } catch (err) {
      fail(`${indicator.label} - ${err.message}`);
      results.push({ id: indicator.id, label: indicator.label, error: err.message });
    }
  }

  return results;
}

async function main() {
  banner('Weekly Macro Fetch - FRED API', c.cyan);

  const force = process.argv.includes('--force');
  const proxyFile = 'data/weekly/yield_curve.json';
  const check = shouldRefresh(proxyFile, 'weekly', force);
  logRefreshDecision('Weekly Macro', proxyFile, 'weekly', check);
  if (!check.needed) { skip('Data is fresh - skipping fetch (use --force to override)'); return; }

  section('Fetching Weekly / Macro');
  const indicators = await fetchWeeklyMacro();

  mkdirSync('data/weekly', { recursive: true });

  const timestamp = new Date().toISOString();
  for (const ind of indicators) {
    const filePath = `data/weekly/${ind.id}.json`;
    writeFileSync(filePath, JSON.stringify({ last_updated: timestamp, indicators: [ind] }, null, 2));
    ok(`Saved: ${filePath}`);
  }

  const succeeded = indicators.filter(i => !i.error).length;
  const failed    = indicators.filter(i =>  i.error).length;

  if (failed > 0) {
    banner(`DONE - ${succeeded} fetched, ${failed} FAILED`, c.red);
    process.exit(1);
  } else {
    banner(`SUCCESS - ${succeeded} indicators fetched`, c.green);
  }
}

main();
