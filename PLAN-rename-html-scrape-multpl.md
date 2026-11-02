# Plan: Rename html-scrape-multpl-shared.js to html-scrape-multpl.com.js

**Goal:** Enforce the `html-scrape-{full-domain}.js` naming convention so every website-specific
scraper is identifiable by its full domain name (including TLD). This eliminates the misleading
`-shared` suffix that makes the file look like a utility rather than a site-specific scraper,
and makes the target website unambiguous at a glance.

**Convention:** `html-scrape-{domain}.{tld}.js`
Examples: `html-scrape-multpl.com.js`, `html-scrape-finra.org.js`, `html-scrape-macrotrends.net.js`

**Pre-condition:** Complete this plan before executing PLAN-html-scrape-finra.md.

---

## Context

Two files currently exist in `scripts/`:

| File | Status |
|------|--------|
| `html-scrape-multpl.js` | Pre-refactor leftover — exits with an error, points to renamed script. Must be deleted first to avoid confusion during the rename. |
| `html-scrape-multpl-shared.js` | The live scraper for multpl.com. This is the file being renamed. |

The `refresh.yml` workflow calls the npm script by name (`npm run html-scrape:multpl`), not
the file directly — so the Actions workflow does not break if only `package.json` is updated.
However, the step name on line 70 also contains the old filename and should be updated for
clarity.

---

## Steps

### 1. Delete the pre-refactor leftover

Delete `scripts/html-scrape-multpl.js`.

This file is a deprecation stub. CLAUDE.md already notes it can be deleted. Remove it before
step 2 to keep the scripts folder clean.

### 2. Rename the live scraper

Rename `scripts/html-scrape-multpl-shared.js` to `scripts/html-scrape-multpl.com.js`.

Use `git mv` to preserve git history:

```bash
git mv scripts/html-scrape-multpl-shared.js scripts/html-scrape-multpl.com.js
```

### 3. Update package.json

Change line 13 from:

```json
"html-scrape:multpl": "node scripts/html-scrape-multpl-shared.js",
```

to:

```json
"html-scrape:multpl": "node scripts/html-scrape-multpl.com.js",
```

No other npm scripts reference this file.

### 4. Update .github/workflows/refresh.yml

Update the step name on line 70 from:

```yaml
- name: Run html-scrape-multpl-shared (1h cooldown enforced in script)
```

to:

```yaml
- name: Run html-scrape-multpl.com (1h cooldown enforced in script)
```

The `run:` command on line 74 (`npm run html-scrape:multpl`) does not change.

### 5. Update CLAUDE.md

Four sections need updating:

**Key Files table** — change the filename entry:

```
scripts/html-scrape-multpl-shared.js  ->  scripts/html-scrape-multpl.com.js
```

**html-scrape Rules section** — update the domain mapping comment:

```
multpl.com indicators -> html-scrape-multpl.com.js
```

**Script Naming Convention table** — add a note under the `html-scrape-` row clarifying
the full convention:

```
html-scrape-{domain}.{tld}.js where the filename is the full domain name
(e.g., html-scrape-multpl.com.js for multpl.com, html-scrape-finra.org.js for finra.org)
```

**Known Issues / Notes section** — remove the sentence that reads:
> `html-scrape-multpl.js` also exists as a pre-refactor leftover. All of these can be deleted manually from the repo.

That sentence will no longer be accurate after step 1.

### 6. Verify locally

Run the renamed script to confirm nothing broke:

```bash
npm run html-scrape:multpl
```

Expected: script runs (or exits cleanly with 1h cooldown WARN if recently run). No errors.

### 7. Commit atomically

Stage all changes together so the repo is never in a broken state between commits:

```bash
git add scripts/html-scrape-multpl.com.js       # renamed file
git add scripts/html-scrape-multpl-shared.js    # deleted file (git mv handles this)
git add scripts/html-scrape-multpl.js           # deleted leftover stub
git add package.json
git add .github/workflows/refresh.yml
git add CLAUDE.md
git commit -m "refactor: rename html-scrape-multpl-shared.js to html-scrape-multpl.com.js

Enforces html-scrape-{domain}.{tld}.js naming convention so each scraper
file is identifiable by its full target domain. Deleted pre-refactor
leftover html-scrape-multpl.js stub."
git push origin main
```

### 8. Verify GitHub Actions

After pushing to main, trigger the workflow manually to confirm the renamed step runs cleanly:

1. Go to the repo on github.com (not the Pages site)
2. Actions tab > Data Refresh > Run workflow > Run workflow (force: false)
3. Confirm the step "Run html-scrape-multpl.com" completes without error

The workflow calls `npm run html-scrape:multpl` which now resolves to `html-scrape-multpl.com.js`.
The 1h cooldown will likely fire (WARN + exit 0) if run shortly after a local test — that is
correct behavior, not a failure.

---

## Files Changed Summary

| File | Change |
|------|--------|
| `scripts/html-scrape-multpl.js` | Deleted (was pre-refactor stub) |
| `scripts/html-scrape-multpl-shared.js` | Renamed to `html-scrape-multpl.com.js` |
| `package.json` | Updated script value on line 13 |
| `.github/workflows/refresh.yml` | Updated step name on line 70 |
| `CLAUDE.md` | Updated 4 sections (file table, domain map, convention rule, removed stale note) |

**GitHub Pages impact:** None. This plan touches no data files and no `index.html`. The live
dashboard at egrendonDev.github.io/economy-indicators is unaffected.
