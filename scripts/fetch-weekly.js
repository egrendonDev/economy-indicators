import 'dotenv/config';
import { writeFileSync, mkdirSync } from 'fs';
import { fetchSeries } from './utils/fred-client.js';
import { byFrequency } from './utils/series-map.js';
import { shouldRefresh, logRefreshDecision } from './utils/should-refresh.js';

const API_KEY = process.env.FRED_API_KEY;
if (!API_KEY) {
  console.error('ERROR: FRED_API_KEY environment variable is not set.');
  process.exit(1);
}

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
      console.log(`Skipping non-FRED indicator: ${indicator.label}`);
      continue;
    }

    console.log(`Fetching ${indicator.label} (${indicator.fredSeries})...`);

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

      console.log(`  OK - latest: ${latest.value} ${indicator.unit} on ${latest.date}`);
    } catch (err) {
      console.error(`  FAILED: ${err.message}`);
      results.push({
        id:    indicator.id,
        label: indicator.label,
        error: err.message
      });
    }
  }

  return results;
}

async function main() {
  console.log('=== Weekly Macro Fetch ===');
  console.log(`Started: ${new Date().toISOString()}\n`);

  const force   = process.argv.includes('--force');
  const check   = shouldRefresh('data/weekly/macro.json', 'weekly', force);
  logRefreshDecision('Weekly Macro', 'data/weekly/macro.json', 'weekly', check);
  if (!check.needed) process.exit(0);

  const indicators = await fetchWeeklyMacro();

  const output = {
    last_updated: new Date().toISOString(),
    indicators
  };

  mkdirSync('data/weekly', { recursive: true });
  writeFileSync('data/weekly/macro.json', JSON.stringify(output, null, 2));

  const succeeded = indicators.filter(i => !i.error).length;
  const failed    = indicators.filter(i =>  i.error).length;

  console.log(`\nDone. ${succeeded} succeeded, ${failed} failed.`);
  console.log(`Output: data/weekly/macro.json`);

  if (failed > 0) process.exit(1);
}

main();
