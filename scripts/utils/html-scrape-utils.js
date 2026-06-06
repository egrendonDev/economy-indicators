/**
 * html-scrape-utils.js
 *
 * Shared utilities for all html-scrape-*.js scripts.
 *
 * Rules for html-scrape scripts:
 *   - One script file per website domain (html-scrape-{domain}.js)
 *   - Always import helpers from this file - do not copy-paste them
 *   - Always use USER_AGENT from this file - never use a bot identifier
 *   - Always enforce the 1-hour cooldown via shouldRefresh('html_scrape')
 */

// Real browser User-Agent - avoids bot detection on public data sites.
// Using a generic Chrome string - not tied to any specific user session.
export const USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';

/**
 * Fetch raw HTML from a URL using the standard browser User-Agent.
 * Throws on non-2xx response.
 *
 * @param {string} url
 * @returns {Promise<string>} raw HTML
 */
export async function fetchHtml(url) {
  const { default: nodeFetch } = await import('node-fetch');
  const res = await nodeFetch(url, {
    headers: { 'User-Agent': USER_AGENT }
  });
  if (!res.ok) throw new Error(`HTTP ${res.status} from ${url}`);
  return res.text();
}

/**
 * Parse a date string from multpl.com and similar sites into YYYY-MM-01 format.
 * Handles two formats:
 *   "May 1, 2026"  -> "2026-05-01"
 *   "May 2026"     -> "2026-05-01"
 *
 * Returns null if the string cannot be parsed.
 *
 * @param {string} raw
 * @returns {string|null}
 */
export function parseMonthDate(raw) {
  const cleaned = raw.trim();
  const full = cleaned.match(/^([A-Za-z]+)\s+(\d{1,2}),\s*(\d{4})$/);
  if (full) {
    const d = new Date(`${full[1]} ${full[2]}, ${full[3]}`);
    if (!isNaN(d)) {
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, '0');
      return `${y}-${m}-01`;
    }
  }
  const short = cleaned.match(/^([A-Za-z]+)\s+(\d{4})$/);
  if (short) {
    const d = new Date(`${short[1]} 1, ${short[2]}`);
    if (!isNaN(d)) {
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, '0');
      return `${y}-${m}-01`;
    }
  }
  return null;
}

/**
 * Parse a numeric value from a table cell string.
 * Strips %, commas, and whitespace. Returns null if not a valid number.
 *
 * @param {string} raw
 * @returns {number|null}
 */
export function parseNumericValue(raw) {
  const cleaned = raw.trim().replace(/[%,\s]/g, '');
  const n = Number(cleaned);
  return isNaN(n) ? null : n;
}
