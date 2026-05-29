import fetch from 'node-fetch';

const FRED_BASE_URL = 'https://api.stlouisfed.org/fred';

/**
 * Fetch the most recent N observations for a FRED series
 * @param {string} seriesId - FRED series ID (e.g. 'T10Y2Y')
 * @param {string} apiKey - FRED API key
 * @param {number} limit - number of recent observations to fetch (default 52)
 * @returns {Promise<Array>} array of { date, value } objects
 */
export async function fetchSeries(seriesId, apiKey, limit = 52) {
  const url = new URL(`${FRED_BASE_URL}/series/observations`);
  url.searchParams.set('series_id', seriesId);
  url.searchParams.set('api_key', apiKey);
  url.searchParams.set('file_type', 'json');
  url.searchParams.set('sort_order', 'desc');
  url.searchParams.set('limit', limit);

  const res = await fetch(url.toString());
  if (!res.ok) throw new Error(`FRED API error for ${seriesId}: ${res.status}`);

  const json = await res.json();

  return json.observations
    .filter(o => o.value !== '.')
    .map(o => ({
      date: o.date,
      value: parseFloat(o.value)
    }))
    .reverse(); // return chronological order
}

/**
 * Fetch only the latest single value for a FRED series
 * @param {string} seriesId - FRED series ID
 * @param {string} apiKey - FRED API key
 * @returns {Promise<{ date: string, value: number }>}
 */
export async function fetchLatest(seriesId, apiKey) {
  const observations = await fetchSeries(seriesId, apiKey, 1);
  if (!observations.length) throw new Error(`No data returned for ${seriesId}`);
  return observations[0];
}

/**
 * Fetch series metadata (title, units, frequency) from FRED
 * @param {string} seriesId - FRED series ID
 * @param {string} apiKey - FRED API key
 * @returns {Promise<Object>}
 */
export async function fetchSeriesInfo(seriesId, apiKey) {
  const url = new URL(`${FRED_BASE_URL}/series`);
  url.searchParams.set('series_id', seriesId);
  url.searchParams.set('api_key', apiKey);
  url.searchParams.set('file_type', 'json');

  const res = await fetch(url.toString());
  if (!res.ok) throw new Error(`FRED metadata error for ${seriesId}: ${res.status}`);

  const json = await res.json();
  return json.seriess[0];
}
