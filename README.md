# Economy Downturn Indicators

A self-hosted dashboard that tracks leading and lagging economic indicators using free public data from the FRED API and other sources. Data refreshes automatically via GitHub Actions and is served as a static site on GitHub Pages.

---

## How It Works

1. **GitHub Actions** runs a daily cron job (7am UTC) that calls Node.js fetch scripts
2. Fetch scripts pull data from the FRED API and write JSON files to the `data/` folder
3. GitHub Actions commits and pushes updated JSON to the repo
4. **GitHub Pages** serves `index.html`, which reads the JSON files at load time and renders the dashboard

No backend, no database, no server costs. Everything runs on free-tier GitHub infrastructure.

---

## Project Structure

```
economy-indicators/
├── index.html                  # Dashboard (served via GitHub Pages)
├── package.json
├── .env.example                # Template for local development
├── .gitignore
├── INDICATORS.md               # Full indicator reference list
├── data/
│   ├── weekly/
│   │   └── macro.json          # Yield curve, jobless claims, credit spreads
│   ├── monthly/
│   │   ├── macro.json          # ISM PMI, M2, weekly hours, durable goods
│   │   ├── stock_market.json   # CAPE, Buffett indicator, P/E, P/S, Q ratio
│   │   ├── residential.json    # Housing starts, FHA delinquency
│   │   ├── auto.json           # Vehicle sales
│   │   └── credit_cards.json   # Revolving credit
│   └── quarterly/
│       ├── macro.json          # Senior loan officer survey
│       ├── residential.json    # Mortgage delinquency, foreclosures
│       ├── commercial.json     # CRE and C&I loan delinquency
│       ├── auto.json           # Auto loan delinquency
│       └── credit_cards.json   # Credit card delinquency, charge-offs
├── scripts/
│   ├── fetch-weekly.js
│   ├── fetch-monthly.js
│   ├── fetch-quarterly.js
│   └── utils/
│       ├── fred-client.js      # FRED API wrapper
│       ├── series-map.js       # Master indicator definitions
│       └── should-refresh.js   # Timestamp-based refresh logic
└── .github/
    └── workflows/
        └── refresh.yml         # Daily data refresh workflow
```

---

## npm Scripts

| Script | What it does |
|--------|-------------|
| `npm run serve` | Start local server only (no fetch) at http://localhost:3000 |
| `npm run fetch:all` | Run all three fetch scripts in sequence (respects freshness check) |
| `npm run fetch:weekly` | Fetch weekly indicators - yield curve, jobless claims, credit spreads |
| `npm run fetch:monthly` | Fetch monthly indicators - macro, stock market, residential, auto, credit cards |
| `npm run fetch:quarterly` | Fetch quarterly indicators - macro, residential, commercial, auto, credit cards |
| `npm run manually:load-data:margin-debt` | Install deps and parse FINRA xlsx into stock_market.json (see below) |
| `npm run pulldata:then:serve:local` | Force fetch all data then start local server at port 3000 |

Add `-- --force` to any fetch script to bypass the freshness check and always pull new data:
```bash
npm run fetch:all -- --force
npm run fetch:weekly -- --force
```

---

## Manual Data Scripts

Some indicators require a manual file download before a script can process them. These are indicators where the source does not offer a free API.

### Margin Debt (FINRA)

Margin debt measures how much investors have borrowed to buy stocks. The data comes from FINRA and requires a one-time manual download each time you want to update.

**Steps:**

1. Go to [finra.org/investors/learn-to-invest/advanced-investing/margin-statistics](https://www.finra.org/investors/learn-to-invest/advanced-investing/margin-statistics)
2. Download the Excel file listed under **Monthly Margin Statistics** (the filename may vary - that is fine)
3. Drop the downloaded file into the `data/manual-file-dropzone/` folder in this project (do not rename it)
4. From the project root, run:

```bash
npm run manually:load-data:margin-debt
```

**What the script does:**

- Scans `data/manual-file-dropzone/` for any `.xlsx` file that has not already been processed
- If multiple unprocessed files exist, it uses the most recently modified one
- Extracts the last 36 months of debit balance data from the "Customer Margin Balances" sheet
- Writes the data into `data/monthly/stock_market.json` under the `margin_debt` indicator
- Renames the source file to `{originalName}-[PROCESSED]-{timestamp}.xlsx` so you can tell at a glance which files have already been run

**Notes:**

- The `data/manual-file-dropzone/` folder is tracked in git via `.gitkeep`, but all `.xlsx` files inside it are gitignored - they will not be committed to the repo
- You only need to re-run this script when FINRA publishes a new monthly report (approximately the 3rd week of each month)
- You do not need to delete the processed file before adding a new one - the script skips any file with `[PROCESSED]` in the name

---

## Initial Setup (Local)

### 1. Clone the repo

```bash
git clone https://github.com/egrendonDev/economy-indicators.git
cd economy-indicators
```

### 2. Install dependencies

```bash
npm install
```

### 3. Get a FRED API key

- Go to [https://fred.stlouisfed.org/](https://fred.stlouisfed.org/)
- Create a free account
- Request an API key (select "Educational" purpose)
- Key is emailed within minutes

### 4. Create your `.env` file

```bash
cp .env.example .env
```

Open `.env` and replace the placeholder:

```
FRED_API_KEY=your_actual_key_here
```

### 5. Run the fetch scripts

Run all three:

```bash
npm run fetch:all
```

Or run individually:

```bash
npm run fetch:weekly
npm run fetch:monthly
npm run fetch:quarterly
```

Force a refresh even if data is still fresh:

```bash
npm run fetch:weekly -- --force
npm run fetch:monthly -- --force
npm run fetch:quarterly -- --force
```

### 6. Open the dashboard locally

Because `index.html` fetches local JSON files via `fetch()`, you need a local server (not just opening the file directly):

```bash
npm run serve
```

Then visit `http://localhost:3000`.

---

## GitHub Actions Setup

The workflow runs daily at 7am UTC and commits updated data back to the repo.

### Add your FRED API key as a GitHub Secret

1. Go to your repo on GitHub
2. **Settings** - **Secrets and variables** - **Actions**
3. Click **New repository secret**
4. Name: `FRED_API_KEY`
5. Value: your FRED API key
6. Click **Add secret**

The workflow in `.github/workflows/refresh.yml` references this secret automatically.

### Manual trigger

Run the workflow immediately from GitHub without waiting for the daily cron.

> **Important:** The Actions tab is on the GitHub repo page, NOT on the live dashboard site.
> - Repo (correct): `https://github.com/egrendonDev/economy-indicators`
> - Dashboard (wrong): `https://egrendonDev.github.io/economy-indicators/`

Steps:

1. Go to the repo: `https://github.com/egrendonDev/economy-indicators`
2. Click the **Actions** tab in the repo nav bar (between "Pull requests" and "Projects")
3. In the left sidebar, click **Data Refresh**
4. Click the **Run workflow** button (top right of the workflow list)
5. A dropdown appears - set the `force` field to **true** if you want to force a refresh even if data is still fresh
6. Click the green **Run workflow** button
7. The run appears in the list - click it to watch the live logs

When complete, GitHub commits updated JSON files to your repo automatically.

---

## GitHub Pages Setup

GitHub Pages serves the dashboard as a public website directly from your repo.

### Enable GitHub Pages

1. Go to your repo on GitHub
2. **Settings** - **Pages** (left sidebar)
3. Under **Source**, select **Deploy from a branch**
4. Branch: `main`, Folder: `/ (root)`
5. Click **Save**

Your dashboard will be live at:

**https://egrendonDev.github.io/economy-indicators/**

It may take 1-2 minutes for the first deployment to build.

### Keeping Pages updated automatically

Every time GitHub Actions commits new JSON data, GitHub Pages automatically rebuilds. No manual steps needed after initial setup.

---

## Indicator Data Sources

| Type | Source | Access |
|------|--------|--------|
| Yield Curve, Jobless Claims, Credit Spreads | FRED API | Automatic |
| Macro monthly (M2, Hours, Durable Goods) | FRED API | Automatic |
| Stock market ratios (CAPE, Buffett, P/E, etc.) | Web scrape | Manual update required |
| Housing Starts | FRED API | Automatic |
| Mortgage / Commercial / Auto / CC Delinquency | FRED API | Automatic |
| FHA Delinquency, Loan Officer Survey | HUD / Federal Reserve | Manual update required |

Indicators marked **manual update required** display a "Pending" status with a source link until data is entered. See `INDICATORS.md` for the full list.

---

## Smart Refresh Logic

Fetch scripts check the `last_updated` timestamp in existing JSON before hitting the API. If data is still fresh, the script exits early - preventing unnecessary API calls on daily cron runs:

- Weekly data - refreshes if older than 7 days
- Monthly data - refreshes if older than 28 days
- Quarterly data - refreshes if older than 85 days

Use `--force` to override.

---

## Dashboard Features

- **Risk scoring** - Watch = 1 pt, Warning = 2 pts. Maps to Normal / Mild Concern / Elevated / High Risk / Critical
- **Leading indicators** - Change before the economy does. Early warning signals
- **Lagging indicators** - Confirm a downturn already in progress
- **Sparklines** - Inline chart of recent history per indicator
- **Healthy average** - Historical normal shown next to each current value
- **Plain-English explanations** - What each status means in plain language

---

## Screenshots

> Add screenshots to the `docs/screenshots/` folder and they will appear here.

**To capture the Actions tab for documentation:**
1. Go to `https://github.com/egrendonDev/economy-indicators/actions`
2. Click **Data Refresh** in the left sidebar
3. Screenshot the full page showing the workflow run list and **Run workflow** button
4. Save as `docs/screenshots/actions-tab.png`

```markdown
![Actions Tab](docs/screenshots/actions-tab.png)
![Dashboard](docs/screenshots/dashboard.png)
```

---

## Requirements

- Node.js 18+
- npm
- FRED API key (free at [fred.stlouisfed.org](https://fred.stlouisfed.org))
- GitHub account with Actions enabled
