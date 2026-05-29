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

const OBSERVATION_LIMIT = 20; // 5 years of quarterly data

// ─── FRED fetcher ─────────────────────────────────────────────────────────────

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
  console.log('\n[Quarterly / Macro]');
  const results = [];
  for (const ind of indicators.filter(i => i.category === 'macro')) {
    if (ind.access === 'fred_api') results.push(await fetchFredIndicator(ind));
    else results.push(manualPlaceholder(ind, 'data/quarterly/macro.json'));
  }
  return results;
}

async function fetchResidential(indicators) {
  console.log('\n[Quarterly / Residential]');
  const results = [];
  for (const ind of indicators.filter(i => i.category === 'residential')) {
    if (ind.access === 'fred_api') results.push(await fetchFredIndicator(ind));
    else results.push(manualPlaceholder(ind, 'data/quarterly/residential.json'));
  }
  return results;
}

async function fetchCommercial(indicators) {
  console.log('\n[Quarterly / Commercial]');
  const results = [];
  for (const ind of indicators.filter(i => i.category === 'commercial')) {
    if (ind.access === 'fred_api') results.push(await fetchFredIndicator(ind));
    else results.push(manualPlaceholder(ind, 'data/quarterly/commercial.json'));
  }
  return results;
}

async function fetchAuto(indicators) {
  console.log('\n[Quarterly / Auto]');
  const results = [];
  for (const ind of indicators.filter(i => i.category === 'auto')) {
    if (ind.access === 'fred_api') results.push(await fetchFredIndicator(ind));
    else results.push(manualPlaceholder(ind, 'data/quarterly/auto.json'));
  }
  return results;
}

async function fetchCreditCards(indicators) {
  console.log('\n[Quarterly / Credit Cards]');
  const results = [];
  for (const ind of indicators.filter(i => i.category === 'credit_cards')) {
    if (ind.access === 'fred_api') results.push(await fetchFredIndicator(ind));
    else results.push(manualPlaceholder(ind, 'data/quarterly/credit_cards.json'));
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
  console.log('=== Quarterly Data Fetch ===');
  console.log(`Started: ${new Date().toISOString()}`);

  const force = process.argv.includes('--force');
  const check = shouldRefresh('data/quarterly/macro.json', 'quarterly', force);
  logRefreshDecision('Quarterly Data', 'data/quarterly/macro.json', 'quarterly', check);
  if (!check.needed) process.exit(0);

  const quarterly = byFrequency('quarterly');

  const [macro, residential, commercial, auto, creditCards] = await Promise.allSettled([
    fetchMacro(quarterly),
    fetchResidential(quarterly),
    fetchCommercial(quarterly),
    fetchAuto(quarterly),
    fetchCreditCards(quarterly)
  ]);

  console.log('\n[Writing output files]');
  writeOutput('data/quarterly', 'macro.json',        macro.value       ?? []);
  writeOutput('data/quarterly', 'residential.json',  residential.value ?? []);
  writeOutput('data/quarterly', 'commercial.json',   commercial.value  ?? []);
  writeOutput('data/quarterly', 'auto.json',          auto.value        ?? []);
  writeOutput('data/quarterly', 'credit_cards.json', creditCards.value ?? []);

  const allResults = [macro, residential, commercial, auto, creditCards].flatMap(r => r.value ?? []);
  const succeeded  = allResults.filter(i => !i.error && !i.manual_update_required).length;
  const manual     = allResults.filter(i => i.manual_update_required).length;
  const failed     = allResults.filter(i => i.error).length;

  console.log(`\nDone. ${succeeded} fetched, ${manual} manual, ${failed} failed.`);
  if (failed > 0) process.exit(1);
}

main();
