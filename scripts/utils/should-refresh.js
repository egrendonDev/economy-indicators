import { readFileSync, existsSync } from 'fs';

// Minimum time between refreshes per frequency type
// api-pull scripts use days; html_scrape uses hours (converted to days for unified math)
const REFRESH_INTERVALS = {
  weekly:      7,          // days
  monthly:     28,         // days
  quarterly:   85,         // days
  html_scrape: 1 / 24     // 1 hour expressed as a fraction of a day
};

/**
 * Check whether a data file needs refreshing based on its last_updated timestamp.
 *
 * @param {string} filePath   - path to the JSON data file
 * @param {string} frequency  - 'weekly' | 'monthly' | 'quarterly' | 'html_scrape'
 * @param {boolean} force     - bypass the check and always refresh
 * @returns {{ needed: boolean, reason: string, daysSince: number|null, hoursSince: number|null }}
 */
export function shouldRefresh(filePath, frequency, force = false) {
  const isHtmlScrape = frequency === 'html_scrape';

  if (force) {
    return { needed: true, reason: 'forced', daysSince: null, hoursSince: null };
  }

  if (!existsSync(filePath)) {
    return { needed: true, reason: 'file does not exist yet', daysSince: null, hoursSince: null };
  }

  let lastUpdated;
  try {
    const contents = JSON.parse(readFileSync(filePath, 'utf8'));
    lastUpdated    = contents.last_updated ? new Date(contents.last_updated) : null;
  } catch {
    return { needed: true, reason: 'file is unreadable or malformed', daysSince: null, hoursSince: null };
  }

  if (!lastUpdated || isNaN(lastUpdated.getTime())) {
    return { needed: true, reason: 'last_updated timestamp is missing or invalid', daysSince: null, hoursSince: null };
  }

  const msSince      = Date.now() - lastUpdated.getTime();
  const daysSince    = msSince / (1000 * 60 * 60 * 24);
  const hoursSince   = msSince / (1000 * 60 * 60);
  const intervalDays = REFRESH_INTERVALS[frequency] ?? 7;
  const needed       = daysSince >= intervalDays;

  if (isHtmlScrape) {
    const minutesSince = Math.floor(msSince / (1000 * 60));
    const hoursDisplay = hoursSince.toFixed(1);
    return {
      needed,
      reason: needed
        ? `${hoursDisplay}h since last scrape (cooldown: 1h) - OK to run`
        : `only ${minutesSince}m since last scrape (cooldown: 1h) - skipping to avoid hammering site`,
      daysSince: null,
      hoursSince: Math.round(hoursSince * 10) / 10
    };
  }

  return {
    needed,
    reason: needed
      ? `${Math.floor(daysSince)} days since last refresh (interval: ${Math.round(intervalDays)} days)`
      : `only ${Math.floor(daysSince)} days since last refresh (interval: ${Math.round(intervalDays)} days)`,
    daysSince: Math.floor(daysSince),
    hoursSince: null
  };
}

/**
 * Log the refresh decision clearly to the console.
 */
export function logRefreshDecision(label, filePath, frequency, result) {
  const icon = result.needed ? '>' : '--';
  console.log(`  ${icon} ${label} [${filePath}]`);
  console.log(`     ${result.reason}`);
  if (!result.needed) console.log(`     Skipping.`);
}
