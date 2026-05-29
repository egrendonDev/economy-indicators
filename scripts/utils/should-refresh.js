import { readFileSync, existsSync } from 'fs';

// Minimum days between refreshes per frequency type
const REFRESH_INTERVALS = {
  weekly:    7,
  monthly:   28,
  quarterly: 85
};

/**
 * Check whether a data file needs refreshing based on its last_updated timestamp.
 *
 * @param {string} filePath   - path to the JSON data file
 * @param {string} frequency  - 'weekly' | 'monthly' | 'quarterly'
 * @param {boolean} force     - bypass the check and always refresh
 * @returns {{ needed: boolean, reason: string, daysSince: number|null }}
 */
export function shouldRefresh(filePath, frequency, force = false) {
  if (force) {
    return { needed: true, reason: 'forced', daysSince: null };
  }

  if (!existsSync(filePath)) {
    return { needed: true, reason: 'file does not exist yet', daysSince: null };
  }

  let lastUpdated;
  try {
    const contents  = JSON.parse(readFileSync(filePath, 'utf8'));
    lastUpdated     = contents.last_updated ? new Date(contents.last_updated) : null;
  } catch {
    return { needed: true, reason: 'file is unreadable or malformed', daysSince: null };
  }

  if (!lastUpdated || isNaN(lastUpdated.getTime())) {
    return { needed: true, reason: 'last_updated timestamp is missing or invalid', daysSince: null };
  }

  const daysSince      = (Date.now() - lastUpdated.getTime()) / (1000 * 60 * 60 * 24);
  const intervalDays   = REFRESH_INTERVALS[frequency] ?? 7;
  const needed         = daysSince >= intervalDays;

  return {
    needed,
    reason: needed
      ? `${Math.floor(daysSince)} days since last refresh (interval: ${intervalDays} days)`
      : `only ${Math.floor(daysSince)} days since last refresh (interval: ${intervalDays} days)`,
    daysSince: Math.floor(daysSince)
  };
}

/**
 * Log the refresh decision clearly to the console.
 */
export function logRefreshDecision(label, filePath, frequency, result) {
  const icon = result.needed ? '🔄' : '✅';
  console.log(`${icon} ${label} [${filePath}]`);
  console.log(`   ${result.reason}`);
  if (!result.needed) console.log(`   Skipping - data is still fresh.`);
}
