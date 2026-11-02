# Plan: Add html-scrape-finra.org.js for Margin Debt

**Goal:** Automate the margin_debt indicator by scraping the FINRA Margin Statistics page,
eliminating the manual file-drop step. After this change, margin_debt updates daily via
GitHub Actions alongside all other automated indicators.

**Pre-condition:** Complete PLAN-rename-html-scrape-multpl.md first. That plan establishes
the `html-scrape-{domain}.{tld}.js` naming convention this file follows.

---

## Context

**Why scraping works here:** The FINRA Margin Statistics page is fully server-side rendered
(Drupal 10). The complete data table is present in the raw HTML — no JavaScript execution
required. Confirmed by fetching the page directly: all 13 months of data are in the HTML.

**The 13-month constraint:** The page only shows the 13 most recent months. The existing
`data/monthly/margin_debt.json` already holds up to 36 months of history from prior file-drop
runs. The scraper must merge new page data into the existing JSON rather than overwriting it,
so historical data is preserved. New months are appended; the window is trimmed to 36 months.

**The file-drop script stays:** `file-drop-margin-debt.js` remains in place as a fallback in
case FINRA changes the page structure and the scraper breaks. Its step 2 instruction text
also gets fixed in this plan (the button label on the page changed).

**FINRA page URL (confirmed stable):**
`https://www.finra.org/rules-guidance/key-topics/margin-accounts/margin-statistics`

---

## Failure Behavior Requirements

`html-scrape-finra.org.js` has exactly one indicator. There is no partial success state.
Any parse failure means zero data was written — the script must exit(1) so GitHub Actions
marks the step as failed and the broken run is visible in the Actions log.

This is intentionally stricter than `html-scrape-multpl.com.js`, which has 4 indicators
and exits 0 on partial success. That script has a known silent failure gap: if 1-3 of its
4 indicators break, the Actions step passes and the data goes stale unnoticed for up to 45
days. A single-indicator script has no excuse for the same behavior.

### Required exit conditions

| Condition | Exit | Reason |
|-----------|------|--------|
| 1h cooldown not met | 0 | Intentional soft skip, not a failure |
| Stale date guard (scraped <= existing) | 0 | Data already current, not a failure |
| HTTP error or fetch timeout | 1 | FINRA unreachable — must be visible |
| Table header not found in HTML | 1 | Page structure changed — must be visible |
| 0 rows parsed from table | 1 | Selector found nothing useful — must be visible |
| All rows fail date parsing | 1 | Date format changed — must be visible |
| All rows fail value validation | 1 | Value format changed — must be visible |
| 0 valid rows AND existing data exists | 1 | Do NOT silently keep stale data on a parse failure |

The last row is the critical one. `html-scrape-multpl.com.js` keeps existing data and exits 0
when a scrape fails — which is the source of the silent failure gap. This script must exit(1)
in that scenario so the fallback is clear: run `npm run file-drop:margin-debt` manually.

### Logging requirements

Do not silently drop rows. When a row fails date or value parsing, log a WARN with the raw
cell content so the cause is diagnosable from the Actions log without re-running locally:

```
WARN  Row skipped - unparseable date: "May-26" (expected "Month YYYY" or "Month D, YYYY")
WARN  Row skipped - unparseable value: "n/a"
```

If the total valid row count is less than expected (13 on a normal run), log the counts:

```
WARN  Parsed 8 of 13 rows. 5 rows dropped (see above).
```

---

## Steps

### 1. Read utils/html-scrape-utils.js

Before writing the new script, read `scripts/utils/html-scrape-utils.js` to confirm:

- Whether `parseMonthDate` handles "May-26" format (month abbreviation + 2-digit year)
- The exact export names for `fetchHtml`, `USER_AGENT`, and any date helpers

If `parseMonthDate` does not handle "May-26", a local date parser will be needed inside
`html-scrape-finra.org.js`. Do not modify the shared utils for a format used by only one script.

### 2. Create scripts/html-scrape-finra.org.js

New file. Must follow all html-scrape rules from CLAUDE.md:

- Import `fetchHtml`, `USER_AGENT` from `./utils/html-scrape-utils.js`
- Import `shouldRefresh` from `./utils/should-refresh.js`
- Call `shouldRefresh('html_scrape')` at top of `main()` — exit cleanly (exit 0, not exit 1)
  if cooldown not met
- Parse the FINRA table using cheerio: target the `<table>` containing "Debit Balances in
  Customers' Securities Margin Accounts" as a header
- Extract column 1 (Month/Year) and column 2 (Debit Balances) only
- Date conversion: "May-26" -> "2026-05-01", "Apr-26" -> "2026-04-01", etc.
- Value parsing: strip commas, parse as float, validate finite + positive
- **Merge strategy:**
  1. Read existing `data/monthly/margin_debt.json` if it exists
  2. Build a Map of existing history keyed by date
  3. Add/overwrite with scraped data points
  4. Sort by date ascending, keep most recent 36 months
- Stale date guard: if latest scraped date <= existing latest date, log WARN and exit 0
- Validation before write: if 0 valid rows parsed for any reason (parse failure, format
  change, empty table), exit 1 regardless of whether existing data exists. Do not silently
  keep stale data on a parse failure — see Failure Behavior Requirements above.
- Write to `data/monthly/margin_debt.json` (same path as file-drop script)
- Data unit: millions USD (matches existing file-drop output)

### 3. Update package.json

Add one script:

```json
"html-scrape:finra.org": "node scripts/html-scrape-finra.org.js",
```

Position it after `html-scrape:multpl` for grouping consistency.

### 4. Update .github/workflows/refresh.yml

Add a new step after the existing multpl step (before "Commit and push"):

```yaml
- name: Run html-scrape-finra (1h cooldown enforced in script)
  # No FRED_API_KEY needed - scrapes public HTML pages only.
  # The script enforces a 1-hour cooldown internally and exits cleanly
  # if the cooldown has not been met (warns, does not fail the workflow).
  run: npm run html-scrape:finra.org
```

No force variant needed — the 1h cooldown guard inside the script handles re-run safety.
The existing `git add data/` at the end of the workflow will pick up changes to
`data/monthly/margin_debt.json` automatically.

### 5. Update utils/series-map.js

Find the margin_debt entry and change:

```js
access_type: 'file_drop'
```

to:

```js
access_type: 'html_scrape'
```

No other fields need to change.

### 6. Read and update index.html (read full file)

Read the full file before editing. Four changes required:

**INDICATOR_META** — find the margin_debt entry and change access type from `file_drop`
to `html_scrape`.

**MANUAL_STEPS** — remove the margin_debt entry entirely from this object.

**HTML_SCRAPE_STEPS** — add a new entry for margin_debt following the same structure as
the existing multpl entries. Fields needed:
- `label`: "Margin Debt"
- `url`: `https://www.finra.org/rules-guidance/key-topics/margin-accounts/margin-statistics`
- `command`: `npm run html-scrape:finra.org`
- `dataFile`: `data/monthly/margin_debt.json`
- `description`: brief note that the script scrapes the FINRA Margin Statistics page and
  merges new months into existing history

**ALL_INDICATORS** — if the margin_debt entry has an explicit `access_type` field, update
it from `file_drop` to `html_scrape`. If the field is absent, no change needed.

### 7. Fix file-drop-margin-debt.js instruction text

Update step 2 of the no-file error message (line 84) from:

```js
console.log(`  ${c.cyan}2.${c.reset} Download the Excel file listed under ${c.bold}Monthly Margin Statistics${c.reset}`);
console.log(`     (filename may vary - that is fine)\n`);
```

to:

```js
console.log(`  ${c.cyan}2.${c.reset} Click the blue ${c.bold}DOWNLOAD THE DATA${c.reset} button on the right side of the page`);
console.log(`     (downloads an Excel file - filename may vary, that is fine)\n`);
```

No other changes to this script.

### 8. Update CLAUDE.md

Five sections need updating:

**Key Files table** — add `html-scrape-finra.org.js` entry:
```
scripts/html-scrape-finra.org.js  # HTML scrape - writes data/monthly/margin_debt.json
```

**html-scrape Rules section** — add domain mapping:
```
finra.org indicators -> html-scrape-finra.org.js
```

**Data Access Types section** — no change needed (html_scrape type already documented).

**Known Issues / Notes section** — update the margin_debt note. Remove the note that says
"No FRED alternatives exist for the 5 manual indicators (Shiller CAPE...Margin Debt)" and
replace with a note that margin_debt is now automated via html-scrape-finra.org.js, and
file-drop-margin-debt.js remains as a manual fallback if the scraper breaks.

**npm Scripts table** — add the new script:
```
npm run html-scrape:finra.org  |  Scrape FINRA margin statistics page, update margin_debt
```

### 9. Test locally

Run the new scraper against live data:

```bash
npm run html-scrape:finra.org
```

Verify:
- Script fetches the page without error
- Parses 13 months correctly
- Merges with existing `data/monthly/margin_debt.json` history
- Writes the file with the correct structure (`id`, `latest`, `history`, `unit`, etc.)
- Re-running immediately triggers the 1h cooldown WARN and exits 0 (idempotency check)

### 10. Commit and push to main

Stage all changes together:

```bash
git add scripts/html-scrape-finra.org.js
git add scripts/file-drop-margin-debt.js
git add package.json
git add .github/workflows/refresh.yml
git add utils/series-map.js
git add index.html
git add CLAUDE.md
git commit -m "feat: automate margin_debt via html-scrape-finra.org.js

Scrapes FINRA Margin Statistics page (server-side rendered, no JS required).
Merges 13 months from page with existing JSON history to maintain 36-month window.
Moves margin_debt from file_drop to html_scrape in series-map and index.html.
Fixes file-drop fallback instruction text (button label changed on FINRA site).
file-drop-margin-debt.js retained as manual fallback."
git push origin main
```

### 11. Verify GitHub Actions

After push, trigger manually to confirm the new step runs end to end:

1. Go to the repo on github.com > Actions tab > Data Refresh > Run workflow
2. Confirm "Run html-scrape-finra" step completes without error
3. Confirm the workflow commits updated `data/monthly/margin_debt.json` to main
4. Open the live dashboard at `https://egrendonDev.github.io/economy-indicators/` and
   confirm margin_debt card shows data, correct access type badge (HTML Scraper instead
   of Manually Updated), and no stale warning

---

## Files Changed Summary

| File | Change |
|------|--------|
| `scripts/html-scrape-finra.org.js` | Created — new FINRA scraper |
| `scripts/file-drop-margin-debt.js` | Step 2 instruction text fixed |
| `package.json` | Added `html-scrape:finra.org` script |
| `.github/workflows/refresh.yml` | Added `html-scrape-finra` step |
| `utils/series-map.js` | margin_debt access_type: file_drop -> html_scrape |
| `index.html` | INDICATOR_META, MANUAL_STEPS, HTML_SCRAPE_STEPS, ALL_INDICATORS |
| `CLAUDE.md` | File table, domain map, known issues, npm scripts table |

**GitHub Pages impact:** After the Actions workflow runs and commits new data, the dashboard
at `egrendonDev.github.io/economy-indicators` will show margin_debt under the HTML Scraper
tab instead of the Manual Updates tab. The card badge will change from "Manually Updated"
to "HTML Scraper". No other dashboard behavior changes.
