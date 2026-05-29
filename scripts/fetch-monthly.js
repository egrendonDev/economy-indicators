import 'dotenv/config';
import { writeFileSync, mkdirSync, readFileSync, existsSync } from 'fs';
import { fetchSeries } from './utils/fred-client.js';
import { byFrequency } from './utils/series-map.js';
import { shouldRefresh, logRefreshDecision } from './utils/should-refresh.js';

const API_KEY = process.env.FRED_API_KEY;
if (!API_KEY) {
  console.error('ERROR: FRED_API_KEY environment variable is not set.');
  process.exit(1);
}

const OBSERVATION_LIMIT = 36; // 3 years of monthly data

// ─── FRED fetcher ────────────────────────────────────────────────────────────

async function fetchFredIndicator(indicator) {
  console.log(`  Fetching ${indicator.label} (${indicator.fredSeries})...`);
  try {
    const history = await fetchSeries(indicator.fredSeries, API_KEY, OBSERVATION_LIMIT);
    const latest  = history[history.length - 1];
    console.log(`    OK - ${latest.value} ${indicator.unit} on ${latest.date}`);
    return { ...buildBase(indicator), latest, history };
  } catch (err) {
    console.error(`    FAILED: ${err.message}`);
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
    console.log(`  ${indicator.label} - using cached value (manual update required)`);
    return { ...existing, manual_update_required: true };
  }
  console.log(`  ${indicator.label} - no data yet (manual update required)`);
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
  console.log('\n[Monthly / Macro]');
  const results = [];
  for (const ind of indicators.filter(i => i.category === 'macro')) {
    if (ind.access === 'fred_api') results.push(await fetchFredIndicator(ind));
    else results.push(manualPlaceholder(ind, 'data/monthly/macro.json'));
  }
  return results;
}

async function fetchStockMarket(indicators) {
  console.log('\n[Monthly / Stock Market]');
  const results = [];
  for (const ind of indicators.filter(i => i.category === 'stock_market')) {
    // All stock market monthly indicators are scrape-based
    results.push(manualPlaceholder(ind, 'data/monthly/stock_market.json'));
  }
  return results;
}

async function fetchResidential(indicators) {
  console.log('\n[Monthly / Residential]');
  const results = [];
  for (const ind of indicators.filter(i => i.category === 'residential')) {
    if (ind.access === 'fred_api') results.push(await fetchFredIndicator(ind));
    else results.push(manualPlaceholder(ind, 'data/monthly/residential.json'));
  }
  return results;
}

async function fetchAuto(indicators) {
  console.log('\n[Monthly / Auto]');
  const results = [];
  for (const ind of indicators.filter(i => i.category === 'auto')) {
    if (ind.access === 'fred_api') results.push(await fetchFredIndicator(ind));
    else results.push(manualPlaceholder(ind, 'data/monthly/auto.json'));
  }
  return results;
}

async function fetchCreditCards(indicators) {
  console.log('\n[Monthly / Credit Cards]');
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
  const output = {
    last_updated: new Date().toISOString(),
    indicators
  };
  writeFileSync(`${folder}/${filename}`, JSON.stringify(output, null, 2));
  console.log(`  Saved: ${folder}/${filename}`);
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log('=== Monthly Data Fetch ===');
  console.log(`Started: ${new Date().toISOString()}`);

  const force = process.argv.includes('--force');
  const check = shouldRefresh('data/monthly/macro.json', 'monthly', force);
  logRefreshDecision('Monthly Data', 'data/monthly/macro.json', 'monthly', check);
  if (!check.needed) process.exit(0);

  const monthly = byFrequency('monthly');

  const [macro, stockMarket, residential, auto, creditCards] = await Promise.allSettled([
    fetchMacro(monthly),
    fetchStockMarket(monthly),
    fetchResidential(monthly),
    fetchAuto(monthly),
    fetchCreditCards(monthly)
  ]);

  console.log('\n[Writing output files]');
  writeOutput('data/monthly', 'macro.json',         macro.value         ?? []);
  writeOutput('data/monthly', 'stock_market.json',  stockMarket.value   ?? []);
  writeOutput('data/monthly', 'residential.json',   residential.value   ?? []);
  writeOutput('data/monthly', 'auto.json',           auto.value          ?? []);
  writeOutput('data/monthly', 'credit_cards.json',  creditCards.value   ?? []);

  const allResults  = [macro, stockMarket, residential, auto, creditCards].flatMap(r => r.value ?? []);
  const succeeded   = allResults.filter(i => !i.error && !i.manual_update_required).length;
  const manual      = allResults.filter(i => i.manual_update_required).length;
  const failed      = allResults.filter(i => i.error).length;

  console.log(`\nDone. ${succeeded} fetched, ${manual} manual, ${failed} failed.`);
  if (failed > 0) process.exit(1);
}

main();
