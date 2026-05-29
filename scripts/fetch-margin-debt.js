/**
 * fetch-margin-debt.js
 *
 * Scans data/manual/ for any unprocessed FINRA margin statistics xlsx file,
 * extracts the last 36 months of margin debt data, and updates
 * the margin_debt entry in data/monthly/stock_market.json.
 *
 * After processing, renames the source file to:
 *   {originalName}-[PROCESSED]-{YYYYMMDDHHMMSS}.xlsx
 *
 * Usage:
 *   npm run fetch:margin-debt
 *   npm run manually:load-data:margin-debt   (also runs npm install first)
 *
 * Input: any .xlsx file in data/manual/ that does not contain "[PROCESSED]"
 *   Sheet: "Customer Margin Balances"
 *   Column A: Year-Month (YYYY-MM, newest first)
 *   Column B: Debit Balances in Customers' Securities Margin Accounts (millions USD)
 *
 * Output: updates margin_debt in data/monthly/stock_market.json
 *
 * See README.md for full setup instructions.
 */

import { readFileSync, writeFileSync, readdirSync, renameSync, existsSync, statSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join, basename, extname } from 'path';
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

const MANUAL_DIR = join(ROOT, 'data', 'manual-file-dropzone');
const JSON_PATH  = join(ROOT, 'data', 'monthly', 'stock_market.json');
const HISTORY_MONTHS = 36;

// ─── Find unprocessed xlsx file ────────────────────────────────────────────

if (!existsSync(MANUAL_DIR)) {
  console.error('ERROR: data/manual/ folder not found.');
  process.exit(1);
}

const candidates = readdirSync(MANUAL_DIR)
  .filter(f => f.toLowerCase().endsWith('.xlsx') && !f.includes('[PROCESSED]'))
  .map(f => ({ name: f, mtime: statSync(join(MANUAL_DIR, f)).mtimeMs }))
  .sort((a, b) => b.mtime - a.mtime); // most recently modified first

if (candidates.length === 0) {
  console.error('ERROR: No unprocessed .xlsx file found in data/manual/');
  console.error('Download the margin statistics file from:');
  console.error('  https://www.finra.org/investors/learn-to-invest/advanced-investing/margin-statistics');
  console.error('Place it in data/manual/ (any filename is fine).');
  console.error('See README.md for full setup instructions.');
  process.exit(1);
}

if (candidates.length > 1) {
  console.warn(`WARNING: Multiple unprocessed xlsx files found - using most recently modified:`);
  candidates.forEach((c, i) => console.warn(`  ${i === 0 ? '->' : '  '} ${c.name}`));
}

const XLSX_PATH = join(MANUAL_DIR, candidates[0].name);
console.log(`Reading: ${candidates[0].name}`);

// ─── Parse xlsx ────────────────────────────────────────────────────────────

const workbook = XLSX.readFile(XLSX_PATH);

const expectedSheet = 'Customer Margin Balances';
const sheetName = workbook.SheetNames.includes(expectedSheet)
  ? expectedSheet
  : workbook.SheetNames[0];

if (sheetName !== expectedSheet) {
  console.warn(`WARNING: Expected sheet "${expectedSheet}" not found. Using first sheet: "${sheetName}"`);
}

const sheet = workbook.Sheets[sheetName];
const rows  = XLSX.utils.sheet_to_json(sheet, { header: 1 });

// Filter to rows where column A matches YYYY-MM
const dataRows = rows.filter(row => {
  const cell = row[0];
  return typeof cell === 'string' && /^\d{4}-\d{2}$/.test(cell.trim());
});

if (dataRows.length === 0) {
  console.error('ERROR: No data rows found matching YYYY-MM pattern in column A.');
  console.error('First 5 rows:', rows.slice(0, 5));
  process.exit(1);
}

// FINRA delivers newest-first - reverse to chronological order
const chronological = [...dataRows].reverse();
const trimmed = chronological.slice(-HISTORY_MONTHS);

const history = trimmed
  .map(row => ({ date: `${row[0].trim()}-01`, value: Number(row[1]) }))
  .filter(entry => !isNaN(entry.value));

const latest = history[history.length - 1];

console.log(`Parsed ${dataRows.length} total rows from file.`);
console.log(`Using last ${history.length} months: ${history[0]?.date} to ${latest?.date}`);
console.log(`Latest margin debt: ${latest?.value?.toLocaleString()} million USD`);

// ─── Update stock_market.json ──────────────────────────────────────────────

if (!existsSync(JSON_PATH)) {
  console.error(`ERROR: ${JSON_PATH} not found. Run npm run fetch:monthly first to initialize it.`);
  process.exit(1);
}

const stockData = JSON.parse(readFileSync(JSON_PATH, 'utf8'));
const idx = stockData.indicators.findIndex(i => i.id === 'margin_debt');

if (idx === -1) {
  console.error('ERROR: margin_debt indicator not found in stock_market.json');
  process.exit(1);
}

stockData.indicators[idx] = {
  ...stockData.indicators[idx],
  latest,
  history,
  manual_update_required: false,
  note: `Parsed from ${candidates[0].name} on ${new Date().toISOString()}`
};

stockData.last_updated = new Date().toISOString();
writeFileSync(JSON_PATH, JSON.stringify(stockData, null, 2));
console.log(`Updated margin_debt in data/monthly/stock_market.json`);

// ─── Rename source file to mark as processed ──────────────────────────────

const now = new Date();
const ts = [
  now.getFullYear(),
  String(now.getMonth() + 1).padStart(2, '0'),
  String(now.getDate()).padStart(2, '0'),
  String(now.getHours()).padStart(2, '0'),
  String(now.getMinutes()).padStart(2, '0'),
  String(now.getSeconds()).padStart(2, '0')
].join('');

const ext      = extname(candidates[0].name);
const base     = basename(candidates[0].name, ext);
const renamed  = `${base}-[PROCESSED]-${ts}${ext}`;
const renamedPath = join(MANUAL_DIR, renamed);

renameSync(XLSX_PATH, renamedPath);
console.log(`Renamed source file to: ${renamed}`);
console.log('Done.');
