/**
 * file-drop-margin-debt.js
 *
 * Scans data/manual-file-dropzone/ for any unprocessed FINRA margin statistics xlsx file,
 * extracts the last 36 months of margin debt data, and updates
 * the margin_debt entry in data/monthly/margin_debt.json.
 *
 * After processing, renames the source file to:
 *   [PROCESSED]-{YYYYMMDDHHMMSS}-{originalName}.xlsx
 *
 * Usage:
 *   npm run file-drop:margin-debt
 *   npm run run:file-drop-manually:margin-debt   (also runs npm install first)
 *
 * Input: any .xlsx file in data/manual-file-dropzone/ that does not contain "[PROCESSED]"
 *   Sheet: "Customer Margin Balances"
 *   Column A: Year-Month (YYYY-MM, newest first)
 *   Column B: Debit Balances in Customers' Securities Margin Accounts (millions USD)
 *
 * Output: updates margin_debt in data/monthly/margin_debt.json
 *
 * See README.md for full setup instructions.
 */

import { readFileSync, writeFileSync, readdirSync, renameSync, existsSync, statSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join, extname } from 'path';
import { createRequire } from 'module';

// xlsx uses CommonJS exports - must load via require in an ES module project
const require = createRequire(import.meta.url);
const XLSX = require('xlsx');

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
const log  = (msg)       => console.log(`  ${msg}`);
const info = (msg)       => console.log(`${c.cyan}  >${c.reset} ${msg}`);
const ok   = (msg)       => console.log(`${c.green}  OK${c.reset}  ${msg}`);
const warn = (msg)       => console.warn(`${c.yellow}  WARN${c.reset} ${msg}`);
const fail = (msg, exit) => { console.error(`${c.red}  ERR${c.reset} ${msg}`); if (exit) process.exit(1); };
const banner = (msg, color) => {
  const line = '─'.repeat(52);
  console.log(`\n${color}${c.bold}  ${line}${c.reset}`);
  console.log(`${color}${c.bold}  ${msg}${c.reset}`);
  console.log(`${color}${c.bold}  ${line}${c.reset}\n`);
};

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const ROOT = join(__dirname, '..');

const MANUAL_DIR    = join(ROOT, 'data', 'manual-file-dropzone');
const JSON_PATH     = join(ROOT, 'data', 'monthly', 'margin_debt.json');
const INDICATOR_ID  = 'margin_debt';
const HISTORY_MONTHS = 36;

banner('Margin Debt - FINRA xlsx Import', c.cyan);

// ─── Find unprocessed xlsx file ────────────────────────────────────────────────

if (!existsSync(MANUAL_DIR)) {
  fail('data/manual-file-dropzone/ folder not found.', false);
  fail('Run: mkdir data/manual-file-dropzone in the project root.', true);
}

const candidates = readdirSync(MANUAL_DIR)
  .filter(f => f.toLowerCase().endsWith('.xlsx') && !f.includes('[PROCESSED]'))
  .map(f => ({ name: f, mtime: statSync(join(MANUAL_DIR, f)).mtimeMs }))
  .sort((a, b) => b.mtime - a.mtime);

if (candidates.length === 0) {
  fail('No unprocessed .xlsx file found in data/manual-file-dropzone/\n', false);
  console.log(`  To update Margin Debt, follow these steps:\n`);
  console.log(`  ${c.cyan}1.${c.reset} Go to:`);
  console.log(`     https://www.finra.org/investors/learn-to-invest/advanced-investing/margin-statistics\n`);
  console.log(`  ${c.cyan}2.${c.reset} Download the Excel file listed under ${c.bold}Monthly Margin Statistics${c.reset}`);
  console.log(`     (filename may vary - that is fine)\n`);
  console.log(`  ${c.cyan}3.${c.reset} Drop the file into this folder ${c.bold}(do not rename it)${c.reset}:`);
  console.log(`     economy-indicators/data/manual-file-dropzone/\n`);
  console.log(`  ${c.cyan}4.${c.reset} Re-run: ${c.bold}npm run file-drop:margin-debt${c.reset}\n`);
  process.exit(1);
}

if (candidates.length > 1) {
  warn(`Multiple unprocessed xlsx files found - using most recently modified:`);
  candidates.forEach((f, i) => log(`  ${i === 0 ? '->' : '  '} ${f.name}`));
}

const XLSX_PATH = join(MANUAL_DIR, candidates[0].name);
info(`File found:    ${candidates[0].name}`);

// ─── Parse xlsx ────────────────────────────────────────────────────────────────

const workbook = XLSX.readFile(XLSX_PATH);

const expectedSheet = 'Customer Margin Balances';
const sheetName = workbook.SheetNames.includes(expectedSheet)
  ? expectedSheet
  : workbook.SheetNames[0];

if (sheetName !== expectedSheet) {
  warn(`Expected sheet "${expectedSheet}" not found. Using: "${sheetName}"`);
}

const sheet = workbook.Sheets[sheetName];
const rows  = XLSX.utils.sheet_to_json(sheet, { header: 1 });

const dataRows = rows.filter(row => {
  const cell = row[0];
  return typeof cell === 'string' && /^\d{4}-\d{2}$/.test(cell.trim());
});

if (dataRows.length === 0) {
  fail('No data rows matching YYYY-MM format found in column A.', false);
  fail('Check that the sheet is "Customer Margin Balances" and column A has dates.', true);
}

// ─── Build history ─────────────────────────────────────────────────────────────

// FINRA data is newest-first; reverse to get chronological order
const allPoints = dataRows
  .map(row => {
    const rawDate  = String(row[0]).trim();        // "2025-03"
    const rawValue = row[1];
    const value    = parseFloat(rawValue);
    if (!isFinite(value) || value < 0) return null;
    return { date: `${rawDate}-01`, value };
  })
  .filter(Boolean)
  .reverse();

if (allPoints.length === 0) {
  fail('No valid numeric values found in column B.', true);
}

const history = allPoints.slice(-HISTORY_MONTHS);
const latest  = history[history.length - 1];

info(`Parsed ${allPoints.length} months. Latest: ${latest.date} = ${latest.value} (millions USD)`);

// ─── Stale date guard ──────────────────────────────────────────────────────────

if (existsSync(JSON_PATH)) {
  try {
    const existing = JSON.parse(readFileSync(JSON_PATH, 'utf8'));
    const existing_ind = existing.indicators?.find(i => i.id === INDICATOR_ID);
    if (existing_ind?.latest?.date && existing_ind.latest.date >= latest.date) {
      warn(`Existing data (${existing_ind.latest.date}) is same or newer than parsed data (${latest.date}).`);
      warn('Skipping write - data is not newer. Drop a newer file to update.');
      process.exit(0);
    }
  } catch { /* ignore parse errors, proceed with write */ }
}

// ─── Load and update margin_debt.json ─────────────────────────────────────────

let json = { indicators: [] };
if (existsSync(JSON_PATH)) {
  try {
    json = JSON.parse(readFileSync(JSON_PATH, 'utf8'));
  } catch {
    warn('Could not parse existing margin_debt.json - will overwrite indicator entry.');
    json = { indicators: [] };
  }
}

const timestamp = new Date().toISOString();
const updatedIndicator = {
  id:          INDICATOR_ID,
  label:       'Margin Debt',
  description: 'Total debit balances in margin accounts at FINRA member firms; elevated margin debt amplifies drawdowns when liquidations cascade',
  unit:        'millions USD',
  source:      'FINRA',
  url:         'https://www.finra.org/investors/learn-to-invest/advanced-investing/margin-statistics',
  type:        'leading',
  importance:  'medium',
  category:    'stock_market',
  latest,
  history,
  note: `Parsed from ${candidates[0].name} on ${timestamp}. Values in millions USD.`
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
ok(`Latest: ${latest.date} = ${latest.value} million USD margin debt`);

// ─── Rename processed xlsx ─────────────────────────────────────────────────────

const stamp   = timestamp.replace(/[-:T]/g, '').slice(0, 14);
const origName = candidates[0].name.replace(/\.xlsx$/i, '');
const newName  = `[PROCESSED]-${stamp}-${origName}.xlsx`;
try {
  renameSync(XLSX_PATH, join(MANUAL_DIR, newName));
  ok(`Renamed to: ${newName}`);
} catch (e) {
  warn(`Could not rename file: ${e.message}`);
}

banner('SUCCESS - Margin Debt data updated', c.green);
