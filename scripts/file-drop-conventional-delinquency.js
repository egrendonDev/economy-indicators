/**
 * file-drop-conventional-delinquency.js
 *
 * Scans data/manual-file-dropzone/ for an unprocessed FHFA NMDB Residential
 * Mortgage Performance Statistics CSV, extracts the quarterly serious delinquency
 * rate (90+ days past due) for Enterprise Acquisitions (Fannie Mae / Freddie Mac)
 * at national level, and updates the conventional_delinquency entry in
 * data/quarterly/residential.json.
 *
 * After processing, renames the source file to:
 *   {originalName}-[PROCESSED]-{YYYYMMDDHHMMSS}.csv
 *
 * Usage:
 *   npm run file-drop:conventional-delinquency
 *   npm run run:file-drop-manually:conventional-delinquency   (also serves locally)
 *
 * Input: any .csv file in data/manual-file-dropzone/ that does not contain "[PROCESSED]"
 *   Source: FHFA NMDB Residential Mortgage Performance Statistics
 *   Download page: https://www.fhfa.gov/data/nmdb
 *   File: nmdb-mortgage-performance-statistics-national-census-areas-quarterly.zip
 *   Step: unzip and drop the .csv into data/manual-file-dropzone/
 *   Metric: P90DL (90+ days past due), Enterprise Acquisitions, GEOID=USA
 *
 * Output: updates conventional_delinquency in data/quarterly/residential.json
 */

import { readFileSync, writeFileSync, readdirSync, renameSync, existsSync, statSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

// ─── Logging helpers ───────────────────────────────────────────────────────────
const c = {
  reset:  '\x1b[0m',
  bold:   '\x1b[1m',
  green:  '\x1b[32m',
  red:    '\x1b[31m',
  yellow: '\x1b[33m',
  cyan:   '\x1b[36m',
  gray:   '\x1b[90m',
};
const log    = (msg)       => console.log(`  ${msg}`);
const info   = (msg)       => console.log(`${c.cyan}  >${c.reset} ${msg}`);
const ok     = (msg)       => console.log(`${c.green}  OK${c.reset}  ${msg}`);
const warn   = (msg)       => console.warn(`${c.yellow}  WARN${c.reset} ${msg}`);
const fail   = (msg, exit) => { console.error(`${c.red}  ERR${c.reset} ${msg}`); if (exit) process.exit(1); };
const banner = (msg, color) => {
  const line = '─'.repeat(52);
  console.log(`\n${color}${c.bold}  ${line}${c.reset}`);
  console.log(`${color}${c.bold}  ${msg}${c.reset}`);
  console.log(`${color}${c.bold}  ${line}${c.reset}\n`);
};

const __filename = fileURLToPath(import.meta.url);
const __dirname  = dirname(__filename);
const ROOT       = join(__dirname, '..');

const MANUAL_DIR    = join(ROOT, 'data', 'manual-file-dropzone');
const JSON_PATH     = join(ROOT, 'data', 'quarterly', 'residential.json');
const INDICATOR_ID  = 'conventional_delinquency';
const HISTORY_QTRS  = 20;

const TARGET_SERIES  = 'P90DL';
const TARGET_GEOID   = 'USA';
const TARGET_MARKET  = 'Enterprise Acquisitions';

const QUARTER_MONTH = { '1': '01', '2': '04', '3': '07', '4': '10' };

// ─── CSV helper ────────────────────────────────────────────────────────────────
function parseCSVRow(line) {
  const fields = [];
  let i = 0;
  while (i < line.length) {
    if (line[i] === '"') {
      let field = '';
      i++;
      while (i < line.length) {
        if (line[i] === '"' && line[i + 1] === '"') { field += '"'; i += 2; }
        else if (line[i] === '"') { i++; break; }
        else { field += line[i++]; }
      }
      fields.push(field);
      if (line[i] === ',') i++;
    } else {
      const end = line.indexOf(',', i);
      if (end === -1) { fields.push(line.slice(i)); break; }
      else { fields.push(line.slice(i, end)); i = end + 1; }
    }
  }
  return fields;
}

// ─── Main ──────────────────────────────────────────────────────────────────────

banner('Conventional Delinquency - FHFA NMDB CSV Import', c.cyan);

if (!existsSync(MANUAL_DIR)) {
  fail('data/manual-file-dropzone/ folder not found.', false);
  fail('Run: mkdir data/manual-file-dropzone in the project root.', true);
}

const candidates = readdirSync(MANUAL_DIR)
  .filter(f => f.toLowerCase().endsWith('.csv') && !f.includes('[PROCESSED]'))
  .map(f => ({ name: f, mtime: statSync(join(MANUAL_DIR, f)).mtimeMs }))
  .sort((a, b) => b.mtime - a.mtime);

if (candidates.length === 0) {
  fail('No unprocessed .csv file found in data/manual-file-dropzone/\n', false);
  console.log(`  To update Conventional Delinquency, follow these steps:\n`);
  console.log(`  ${c.cyan}1.${c.reset} Go to:`);
  console.log(`     https://www.fhfa.gov/data/nmdb\n`);
  console.log(`  ${c.cyan}2.${c.reset} Under ${c.bold}Residential Mortgage Performance Statistics${c.reset}, download:`);
  console.log(`     ${c.bold}National, Census Regions, and Census Divisions${c.reset} [CSV]\n`);
  console.log(`     (file: nmdb-mortgage-performance-statistics-national-census-areas-quarterly.zip)\n`);
  console.log(`  ${c.cyan}3.${c.reset} Unzip the file to get the .csv inside it.`);
  console.log(`     ${c.gray}Tip: right-click the .zip and choose "Extract All" on Windows${c.reset}\n`);
  console.log(`  ${c.cyan}4.${c.reset} Drop the extracted .csv into this folder ${c.bold}(do not rename it)${c.reset}:`);
  console.log(`     economy-indicators/data/manual-file-dropzone/\n`);
  console.log(`  ${c.cyan}5.${c.reset} Re-run: ${c.bold}npm run run:file-drop-manually:conventional-delinquency${c.reset}\n`);
  process.exit(1);
}

if (candidates.length > 1) {
  warn('Multiple unprocessed .csv files found - using most recently modified:');
  candidates.forEach((f, i) => log(`  ${i === 0 ? '->' : '  '} ${f.name}`));
}

const CSV_PATH = join(MANUAL_DIR, candidates[0].name);
info(`File found:    ${candidates[0].name}`);

// ─── Parse CSV ─────────────────────────────────────────────────────────────────

info('Parsing CSV...');
const rawText = readFileSync(CSV_PATH, 'utf8');
const lines = rawText.replace(/\r/g, '').split('\n').filter(l => l.trim().length > 0);

if (lines.length < 2) {
  fail(`CSV appears empty or has no data rows (${lines.length} lines).`, true);
}

const headers = parseCSVRow(lines[0]);
info(`CSV columns: ${headers.join(', ')}`);

const colIdx = {};
headers.forEach((h, i) => { colIdx[h.trim().toUpperCase()] = i; });

const REQUIRED = ['SERIESID', 'GEOID', 'MARKET', 'PERIOD', 'YEAR', 'QUARTER', 'SUPPRESSED', 'VALUE1'];
const missing = REQUIRED.filter(col => !(col in colIdx));
if (missing.length > 0) {
  fail(`CSV is missing required columns: ${missing.join(', ')}`, false);
  fail('Expected FHFA NMDB Residential Mortgage Performance Statistics format.', true);
}

// ─── Filter and extract data ───────────────────────────────────────────────────

const rowMap = new Map();
let rowsScanned = 0;
let rowsMatched = 0;
let rowsSuppressed = 0;
const seriesIdsSeen = new Set();

for (let i = 1; i < lines.length; i++) {
  const cols = parseCSVRow(lines[i]);
  if (cols.length < headers.length) continue;

  rowsScanned++;

  const seriesId = (cols[colIdx['SERIESID']] || '').trim();
  const geoId    = (cols[colIdx['GEOID']]    || '').trim();
  const market   = (cols[colIdx['MARKET']]   || '').trim();

  seriesIdsSeen.add(seriesId);

  if (seriesId !== TARGET_SERIES) continue;
  if (geoId    !== TARGET_GEOID)  continue;
  if (market   !== TARGET_MARKET) continue;

  rowsMatched++;

  const suppressed = parseInt(cols[colIdx['SUPPRESSED']] || '0', 10);
  if (suppressed === 1) {
    warn(`Suppressed row skipped: ${(cols[colIdx['PERIOD']] || '').trim()}`);
    rowsSuppressed++;
    continue;
  }

  const year    = (cols[colIdx['YEAR']]    || '').trim();
  const quarter = (cols[colIdx['QUARTER']] || '').trim();
  const value1  = parseFloat(cols[colIdx['VALUE1']] || '');

  if (!year || !quarter || !QUARTER_MONTH[quarter]) {
    warn(`Skipping row with invalid year/quarter: year=${year} quarter=${quarter}`);
    continue;
  }
  if (!isFinite(value1) || value1 < 0 || value1 > 50) {
    warn(`Skipping row with out-of-range value: ${value1}`);
    continue;
  }

  rowMap.set(`${year}-${QUARTER_MONTH[quarter]}-01`, value1);
}

info(`Scanned ${rowsScanned} data rows. Matched ${rowsMatched} (${rowsSuppressed} suppressed).`);

if (rowMap.size === 0) {
  const hasOrigSeries = [...seriesIdsSeen].some(s =>
    ['TOT_ORIG','AVE_LOANAMT','PCT_HP','PCT_REFI'].includes(s));
  const hasOutstandingSeries = [...seriesIdsSeen].some(s =>
    ['TOT_LOANS','TOT_UPB','AVE_MTMLTV'].includes(s));

  console.log('');
  fail(`No valid rows found for SERIESID=${TARGET_SERIES}, GEOID=${TARGET_GEOID}, MARKET="${TARGET_MARKET}".`, false);

  if (hasOrigSeries) {
    console.log(`\n  ${c.yellow}${c.bold}  WRONG FILE${c.reset} - this is the ${c.bold}New Residential Mortgage Statistics${c.reset} file`);
    console.log(`  (origination data with series like TOT_ORIG, AVE_LOANAMT)\n`);
  } else if (hasOutstandingSeries) {
    console.log(`\n  ${c.yellow}${c.bold}  WRONG FILE${c.reset} - this is the ${c.bold}Outstanding Residential Mortgage Statistics${c.reset} file`);
    console.log(`  (balance data with series like TOT_LOANS, TOT_UPB)\n`);
  }

  console.log(`  You need the ${c.bold}Residential Mortgage Performance Statistics${c.reset} file:\n`);
  console.log(`  ${c.cyan}1.${c.reset} Go to: https://www.fhfa.gov/data/nmdb`);
  console.log(`  ${c.cyan}2.${c.reset} Scroll to ${c.bold}Residential Mortgage Performance Statistics${c.reset}`);
  console.log(`  ${c.cyan}3.${c.reset} Download: ${c.bold}National, Census Regions, and Census Divisions [CSV]${c.reset}`);
  console.log(`     (nmdb-mortgage-performance-statistics-national-census-areas-quarterly.zip)\n`);
  console.log(`  ${c.cyan}4.${c.reset} Unzip and drop the .csv in data/manual-file-dropzone/ then re-run.\n`);
  process.exit(1);
}

// ─── Stale date guard ──────────────────────────────────────────────────────────

const sortedDates = [...rowMap.keys()].sort();
const history = sortedDates.slice(-HISTORY_QTRS).map(d => ({ date: d, value: rowMap.get(d) }));
const latest  = history[history.length - 1];

info(`Extracted ${history.length} quarters. Latest: ${latest.date} = ${latest.value}%`);

if (existsSync(JSON_PATH)) {
  try {
    const existing = JSON.parse(readFileSync(JSON_PATH, 'utf8'));
    const existing_ind = existing.indicators?.find(i => i.id === INDICATOR_ID);
    if (existing_ind?.latest?.date && existing_ind.latest.date >= latest.date) {
      warn(`Existing data (${existing_ind.latest.date}) is same or newer than parsed data (${latest.date}).`);
      warn('Skipping write - data is not newer. Rename the CSV to force re-process.');
      process.exit(0);
    }
  } catch { /* ignore parse errors */ }
}

// ─── Load and update residential.json ─────────────────────────────────────────

let json = { indicators: [] };
if (existsSync(JSON_PATH)) {
  try { json = JSON.parse(readFileSync(JSON_PATH, 'utf8')); }
  catch (e) { fail(`Cannot parse existing residential.json: ${e.message}. Fix the file before re-running.`, true); }
}

const timestamp = new Date().toISOString();
const updatedIndicator = {
  id:          INDICATOR_ID,
  label:       'Conventional Delinquency Rate',
  description: "Fannie/Freddie loan stress; baseline for prime borrower health",
  unit:        '%',
  source:      'FHFA',
  url:         'https://www.fhfa.gov/data/nmdb',
  type:        'lagging',
  importance:  'medium',
  category:    'residential',
  latest,
  history,
  note: `Parsed from ${candidates[0].name} on ${timestamp}. Metric: P90DL (90+ days past due), Enterprise Acquisitions, United States. Source: FHFA NMDB Residential Mortgage Performance Statistics.`
};

const idx = json.indicators.findIndex(i => i.id === INDICATOR_ID);
if (idx >= 0) { json.indicators[idx] = updatedIndicator; }
else { json.indicators.push(updatedIndicator); }

json.last_updated = timestamp;
writeFileSync(JSON_PATH, JSON.stringify(json, null, 2));
ok(`Saved ${history.length} quarters to ${JSON_PATH}`);
ok(`Latest: ${latest.date} = ${latest.value}% serious delinquency (Fannie/Freddie)`);

// ─── Rename processed CSV ──────────────────────────────────────────────────────

const stamp   = timestamp.replace(/[-:T]/g, '').slice(0, 14);
const base    = candidates[0].name.replace(/\.csv$/i, '');
const newName = `${base}-[PROCESSED]-${stamp}.csv`;
renameSync(CSV_PATH, join(MANUAL_DIR, newName));
ok(`Renamed to: ${newName}`);

banner('SUCCESS - Conventional Delinquency data updated', c.green);
