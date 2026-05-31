/**
 * file-drop-fha-delinquency.js
 *
 * Scans data/manual-file-dropzone/ for an unprocessed HUD FHA Loan Performance
 * Trends PDF, extracts the Non-Seasonally Adjusted Serious Delinquency Rate
 * from Table 1, and updates the fha_delinquency entry in
 * data/monthly/fha_delinquency.json.
 *
 * After processing, renames the source file to:
 *   [PROCESSED]-{YYYYMMDDHHMMSS}-{originalName}.pdf
 *
 * Usage:
 *   npm run file-drop:fha-delinquency
 *   npm run run:file-drop-manually:fha-delinquency   (also serves locally)
 *
 * Input: any .pdf file in data/manual-file-dropzone/ that does not contain "[PROCESSED]"
 *   Source: HUD FHA Single Family Loan Performance Trends (monthly PDF)
 *   URL: https://www.hud.gov/hud-partners/single-family-loan-performance
 *   Metric: Serious Delinquency Rate (90+ days + in-foreclosure + in-bankruptcy), Non-SA
 *
 * Output: updates fha_delinquency in data/monthly/fha_delinquency.json
 *
 * See README.md for full setup instructions.
 */

import { readFileSync, writeFileSync, readdirSync, renameSync, existsSync, statSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { createRequire } from 'module';

// pdf-parse uses CommonJS exports - must load via require in an ES module project
const require = createRequire(import.meta.url);
const pdfParse = require('pdf-parse');

// ─── Logging helpers ──────────────────────────────────────────────────────────
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

const MANUAL_DIR   = join(ROOT, 'data', 'manual-file-dropzone');
const JSON_PATH    = join(ROOT, 'data', 'monthly', 'fha_delinquency.json');
const INDICATOR_ID = 'fha_delinquency';
const HISTORY_MONTHS = 36;

// Month name to zero-padded number
const MONTH_NUM = {
  Jan:'01', Feb:'02', Mar:'03', Apr:'04', May:'05', Jun:'06',
  Jul:'07', Aug:'08', Sep:'09', Oct:'10', Nov:'11', Dec:'12'
};

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  banner('FHA Delinquency - HUD PDF Import', c.cyan);

  // ─── Find unprocessed PDF file ───────────────────────────────────────────

  if (!existsSync(MANUAL_DIR)) {
    fail('data/manual-file-dropzone/ folder not found.', false);
    fail('Run: mkdir data/manual-file-dropzone in the project root.', true);
  }

  const candidates = readdirSync(MANUAL_DIR)
    .filter(f => f.toLowerCase().endsWith('.pdf') && !f.includes('[PROCESSED]'))
    .map(f => ({ name: f, mtime: statSync(join(MANUAL_DIR, f)).mtimeMs }))
    .sort((a, b) => b.mtime - a.mtime);

  if (candidates.length === 0) {
    fail('No unprocessed .pdf file found in data/manual-file-dropzone/\n', false);
    console.log(`  To update FHA Delinquency, follow these steps:\n`);
    console.log(`  ${c.cyan}1.${c.reset} Go to:`);
    console.log(`     https://www.hud.gov/hud-partners/single-family-loan-performance\n`);
    console.log(`  ${c.cyan}2.${c.reset} Download the ${c.bold}FHA Single Family Loan Performance Trends${c.reset} PDF`);
    console.log(`     (filename may vary - that is fine)\n`);
    console.log(`  ${c.cyan}3.${c.reset} Drop the file into this folder ${c.bold}(do not rename it)${c.reset}:`);
    console.log(`     economy-indicators/data/manual-file-dropzone/\n`);
    console.log(`  ${c.cyan}4.${c.reset} Re-run: ${c.bold}npm run run:file-drop-manually:fha-delinquency${c.reset}\n`);
    process.exit(1);
  }

  if (candidates.length > 1) {
    warn('Multiple unprocessed PDF files found - using most recently modified:');
    candidates.forEach((f, i) => log(`  ${i === 0 ? '->' : '  '} ${f.name}`));
  }

  const PDF_PATH = join(MANUAL_DIR, candidates[0].name);
  info(`File found:    ${candidates[0].name}`);

  // ─── Parse PDF text ──────────────────────────────────────────────────────

  info('Parsing PDF text...');
  const buffer = readFileSync(PDF_PATH);
  let pdfData;
  try {
    pdfData = await pdfParse(buffer);
  } catch (err) {
    fail(`PDF parsing failed: ${err.message}`, true);
  }

  const text = pdfData.text;
  info(`Extracted ${text.length} characters from PDF`);

  // ─── Column-based extraction ──────────────────────────────────────────────
  // pdf-parse extracts HUD PDF tables column-by-column, not row-by-row.
  // Strategy:
  //   1. Find "Month/Year" column to get ordered dates (with year anchoring).
  //      Stop at the first repeated date - that marks the start of the SA section.
  //   2. Find the NSA section (flexible hyphen/spacing match).
  //   3. After the "Serious Delinquency Rate" column header, extract the first
  //      N decimal numbers where N = number of NSA months found in step 1.
  //   4. Zip dates with SDR values and validate.

  // Step 1: extract months from the "Month/Year" column
  const MONTH_YEAR_IDX = text.indexOf('Month/Year');
  if (MONTH_YEAR_IDX === -1) {
    fail('Could not find "Month/Year" column in PDF text.', false);
    fail('The PDF format may have changed. Check the file and update the parser.', true);
  }

  const monthColText = text.slice(MONTH_YEAR_IDX, MONTH_YEAR_IDX + 800);
  const MONTH_ENTRY_RE = /(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)(?:\s+(\d{4}))?/g;
  const nsaDates = [];
  const seenDates = new Set();
  let currentYear = null;
  let mEntry;

  while ((mEntry = MONTH_ENTRY_RE.exec(monthColText)) !== null) {
    const monthName = mEntry[1];
    const yearStr   = mEntry[2];

    if (yearStr) {
      currentYear = parseInt(yearStr, 10);
    } else if (currentYear === null) {
      continue;
    } else if (monthName === 'Jan') {
      currentYear += 1;
    }

    const dateStr = `${currentYear}-${MONTH_NUM[monthName]}-01`;
    if (seenDates.has(dateStr)) break; // SA section repeats same months - stop here
    seenDates.add(dateStr);
    nsaDates.push(dateStr);
  }

  if (nsaDates.length === 0) {
    fail('No months parsed from Month/Year column.', false);
    fail('The PDF format may have changed. Inspect the extracted text manually.', true);
  }

  info(`Found ${nsaDates.length} NSA months. Range: ${nsaDates[0]} to ${nsaDates[nsaDates.length - 1]}`);

  // Step 2: parse all data rows after the Month/Year header.
  // pdf-parse extracts "Month/Year" as a column header, with data rows following it.
  // Both NSA and SA rows appear in the same section. We use first-occurrence-wins:
  // the first time a date appears = NSA row, the second time = SA row (skipped).
  // Row pattern: MonthName [Year] InsuranceCount 30d 60d 90d Forecl Bankr SDR
  // Numbers are concatenated with no spaces in pdf-parse output, e.g.:
  //   "Mar 2025 7,969,6835.161.793.570.420.474.47"
  // Non-greedy ([\d,]+?) on the count lets the regex stop as soon as
  // the first X.XX pattern can match, correctly splitting count from rates.
  // Group order: 1=month 2=year 3=count 4=30d 5=60d 6=90d 7=forecl 8=bankr 9=SDR
  const ROW_RE = /(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)(?:\s+(\d{4}))?\s+([\d,]+?)(\d\.\d{2})(\d+\.\d{2})(\d+\.\d{2})(\d+\.\d{2})(\d+\.\d{2})(\d+\.\d{2})/g;

  const dataSection  = text.slice(MONTH_YEAR_IDX);
  const nsaDatesSet  = new Set(nsaDates);
  const dateToSDR    = new Map();
  let curYear        = null;
  let rowMatch;

  while ((rowMatch = ROW_RE.exec(dataSection)) !== null) {
    const monthName = rowMatch[1];
    const yearStr   = rowMatch[2];

    if (yearStr) {
      curYear = parseInt(yearStr, 10);
    } else if (curYear === null) {
      continue;
    } else if (monthName === 'Jan') {
      curYear += 1;
    }

    const sdr     = parseFloat(rowMatch[9]);
    const dateStr = `${curYear}-${MONTH_NUM[monthName]}-01`;

    // Only keep NSA dates; first occurrence wins (NSA appears before SA)
    if (nsaDatesSet.has(dateStr) && !dateToSDR.has(dateStr)) {
      if (!isFinite(sdr) || sdr < 0 || sdr > 50) {
        warn(`Skipping ${dateStr} - SDR value ${sdr} out of expected range [0, 50]`);
        continue;
      }
      dateToSDR.set(dateStr, sdr);
    }
  }

  // Build rows in chronological order using nsaDates as the authoritative sequence
  const rows = nsaDates
    .filter(d => dateToSDR.has(d))
    .map(d => ({ date: d, value: dateToSDR.get(d) }));

  if (rows.length === 0) {
    fail('No valid data rows parsed from the PDF.', false);
    fail('The PDF format may have changed. Inspect the extracted text manually.', true);
  }

  // rows are already in chronological order; deduplicate just in case
  const seen = new Set();
  const unique = rows.filter(r => {
    if (seen.has(r.date)) return false;
    seen.add(r.date);
    return true;
  });

  const history = unique.slice(-HISTORY_MONTHS);
  const latest  = history[history.length - 1];

  info(`Parsed ${unique.length} months of data. Latest: ${latest.date} = ${latest.value}%`);

  // ─── Duplicate / stale date guard ────────────────────────────────────────

  if (existsSync(JSON_PATH)) {
    try {
      const existing = JSON.parse(readFileSync(JSON_PATH, 'utf8'));
      const existing_ind = existing.indicators?.find(i => i.id === INDICATOR_ID);
      if (existing_ind?.latest?.date) {
        if (existing_ind.latest.date >= latest.date) {
          warn(`Existing data (${existing_ind.latest.date}) is same or newer than parsed data (${latest.date}).`);
          warn('Skipping write - data is not newer. Rename the PDF to force re-process.');
          process.exit(0);
        }
      }
    } catch { /* ignore parse errors, proceed with write */ }
  }

  // ─── Load and update fha_delinquency.json ────────────────────────────────

  let json;
  if (existsSync(JSON_PATH)) {
    try {
      json = JSON.parse(readFileSync(JSON_PATH, 'utf8'));
    } catch {
      warn('Could not parse existing fha_delinquency.json - will overwrite indicator entry.');
      json = { indicators: [] };
    }
  } else {
    json = { indicators: [] };
  }

  const timestamp = new Date().toISOString();
  const updatedIndicator = {
    id:          INDICATOR_ID,
    label:       'FHA Delinquency Rate',
    description: 'Serious delinquency rate (90+ days + foreclosure + bankruptcy) for FHA loans; low-down-payment borrower stress emerges here before prime market',
    unit:        '%',
    source:      'HUD',
    url:         'https://www.hud.gov/hud-partners/single-family-loan-performance',
    type:        'lagging',
    importance:  'medium',
    category:    'residential',
    latest,
    history,
    note: `Parsed from ${candidates[0].name} on ${timestamp}. Metric: Non-SA Serious Delinquency Rate (Table 1).`
  };

  const idx = json.indicators.findIndex(i => i.id === INDICATOR_ID);
  if (idx >= 0) {
    json.indicators[idx] = updatedIndicator;
  } else {
    json.indicators.push(updatedIndicator);
  }

  json.last_updated = timestamp;
  writeFileSync(JSON_PATH, JSON.stringify(json, null, 2));
  ok(`Saved ${history.length} months to ${JSON_PATH}`);
  ok(`Latest: ${latest.date} = ${latest.value}% Serious Delinquency Rate`);

  // ─── Rename processed PDF ─────────────────────────────────────────────────

  const stamp = timestamp.replace(/[-:T]/g, '').slice(0, 14);
  const base  = candidates[0].name.replace(/\.pdf$/i, '');
  const newName = `[PROCESSED]-${stamp}-${base}.pdf`;
  renameSync(PDF_PATH, join(MANUAL_DIR, newName));
  ok(`Renamed to: ${newName}`);

  banner('SUCCESS - FHA Delinquency data updated', c.green);
}

main().catch(err => {
  console.error(`\x1b[31m  ERR\x1b[0m Unexpected error: ${err.message}`);
  process.exit(1);
});
