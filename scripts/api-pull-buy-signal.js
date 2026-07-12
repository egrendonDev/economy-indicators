import 'dotenv/config';
import { writeFileSync, mkdirSync, existsSync, readFileSync } from 'fs';
import { fetchSeries } from './utils/fred-client.js';
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

const OUTPUT_PATH = 'data/weekly/buy_signal.json';

// VIX has full history back to 1990; SP500 on FRED is capped to a rolling 10yr
// window by licensing agreement with S&P Dow Jones Indices - requesting a large
// limit for both is safe, FRED just returns whatever it actually has.
const VIX_LIMIT = 12000;
const SP500_LIMIT = 12000;

// VIX "elevated" condition is evaluated against its own trailing window, not a
// fixed number - see project history for why a fixed VIX>40 rule fails across
// different bear market regimes (missed 2018 and 2022 entirely, ran 5 months
// early in 2008).
const VIX_PERCENTILE_WINDOW_YEARS = 3;
const VIX_PERCENTILE_THRESHOLD = 90;

// Drawdown condition confirms an actual bear market, not just a volatility spike.
const DRAWDOWN_THRESHOLD_PCT = -20;

function percentile(sortedAsc, pct) {
  if (!sortedAsc.length) return null;
  const idx = Math.min(sortedAsc.length - 1, Math.floor((pct / 100) * (sortedAsc.length - 1)));
  return sortedAsc[idx];
}

function trailingWindow(history, years) {
  if (!history.length) return [];
  const latestDate = new Date(history[history.length - 1].date);
  const cutoff = new Date(latestDate);
  cutoff.setFullYear(cutoff.getFullYear() - years);
  return history.filter(h => new Date(h.date) >= cutoff);
}

function validateHistory(history, label) {
  const valid = history.filter(h => h.date && Number.isFinite(h.value));
  const dropped = history.length - valid.length;
  if (dropped > 0) warn(`${label}: dropped ${dropped} invalid observation(s)`);
  return valid;
}

async function main() {
  banner('Buy Signal - VIX + S&P 500 Drawdown', c.cyan);

  const force = process.argv.includes('--force');
  const check = shouldRefresh(OUTPUT_PATH, 'weekly', force);
  logRefreshDecision('Buy Signal', OUTPUT_PATH, 'weekly', check);
  if (!check.needed) { skip('Data is fresh - skipping fetch (use --force to override)'); return; }

  section('Fetching VIX and S&P 500 from FRED');

  let vixHistoryRaw, sp500HistoryRaw;
  try {
    info('Fetching VIXCLS (CBOE Volatility Index)');
    vixHistoryRaw = await fetchSeries('VIXCLS', API_KEY, VIX_LIMIT);
    ok(`VIXCLS: ${vixHistoryRaw.length} observations, ${vixHistoryRaw[0]?.date} to ${vixHistoryRaw[vixHistoryRaw.length - 1]?.date}`);

    info('Fetching SP500 (S&P 500 Index)');
    sp500HistoryRaw = await fetchSeries('SP500', API_KEY, SP500_LIMIT);
    ok(`SP500: ${sp500HistoryRaw.length} observations, ${sp500HistoryRaw[0]?.date} to ${sp500HistoryRaw[sp500HistoryRaw.length - 1]?.date}`);
  } catch (err) {
    fail(`Fetch failed - ${err.message}`);
    process.exit(1);
  }

  section('Validating data');
  const vixHistory = validateHistory(vixHistoryRaw, 'VIXCLS');
  const sp500History = validateHistory(sp500HistoryRaw, 'SP500');

  const existingFile = existsSync(OUTPUT_PATH) ? JSON.parse(readFileSync(OUTPUT_PATH, 'utf8')) : null;

  if (!vixHistory.length || !sp500History.length) {
    if (existingFile) {
      warn('No valid observations returned - keeping existing data, skipping write');
      return;
    }
    fail('No valid observations returned and no existing data - cannot proceed');
    process.exit(1);
  }

  const latestVix = vixHistory[vixHistory.length - 1];
  const latestSp500 = sp500History[sp500History.length - 1];

  // Duplicate/stale date guard - skip write if nothing newer than what's on disk
  const incomingLatestDate = latestVix.date > latestSp500.date ? latestVix.date : latestSp500.date;
  if (existingFile?.last_updated_date && incomingLatestDate <= existingFile.last_updated_date) {
    skip(`Latest data (${incomingLatestDate}) is not newer than existing (${existingFile.last_updated_date}) - skipping write`);
    return;
  }

  section('Computing signal');

  // VIX condition: current value vs its own trailing N-year percentile
  const vixWindow = trailingWindow(vixHistory, VIX_PERCENTILE_WINDOW_YEARS);
  const vixWindowSorted = vixWindow.map(h => h.value).sort((a, b) => a - b);
  const vixPercentileValue = percentile(vixWindowSorted, VIX_PERCENTILE_THRESHOLD);
  const vixConditionMet = vixPercentileValue !== null && latestVix.value >= vixPercentileValue;

  // Drawdown condition: current S&P 500 vs the max close in the available window
  let rollingAth = sp500History[0];
  for (const h of sp500History) if (h.value > rollingAth.value) rollingAth = h;
  const drawdownPct = ((latestSp500.value - rollingAth.value) / rollingAth.value) * 100;
  const drawdownConditionMet = drawdownPct <= DRAWDOWN_THRESHOLD_PCT;

  const conditionsMet = (vixConditionMet ? 1 : 0) + (drawdownConditionMet ? 1 : 0);
  const signal = conditionsMet === 2 ? 'buy' : conditionsMet === 1 ? 'caution' : 'calm';

  ok(`VIX: ${latestVix.value} vs ${VIX_PERCENTILE_THRESHOLD}th pctl (${vixWindow.length}d window) = ${vixPercentileValue?.toFixed(1)} -> ${vixConditionMet ? 'MET' : 'not met'}`);
  ok(`Drawdown: ${drawdownPct.toFixed(1)}% from ATH ${rollingAth.value} (${rollingAth.date}) -> ${drawdownConditionMet ? 'MET' : 'not met'}`);
  ok(`Signal: ${signal.toUpperCase()} (${conditionsMet}/2 conditions met)`);

  const output = {
    last_updated: new Date().toISOString(),
    last_updated_date: incomingLatestDate,
    signal,
    conditions_met: conditionsMet,
    vix: {
      current: latestVix,
      percentile_threshold: VIX_PERCENTILE_THRESHOLD,
      percentile_window_years: VIX_PERCENTILE_WINDOW_YEARS,
      percentile_value: vixPercentileValue,
      condition_met: vixConditionMet,
      history: vixHistory
    },
    sp500: {
      current: latestSp500,
      rolling_ath: rollingAth,
      drawdown_pct: drawdownPct,
      drawdown_threshold_pct: DRAWDOWN_THRESHOLD_PCT,
      condition_met: drawdownConditionMet,
      history: sp500History
    }
  };

  mkdirSync('data/weekly', { recursive: true });
  writeFileSync(OUTPUT_PATH, JSON.stringify(output, null, 2));
  ok(`Saved: ${OUTPUT_PATH}`);

  banner(`SUCCESS - signal is ${signal.toUpperCase()}`, c.green);
}

main();
