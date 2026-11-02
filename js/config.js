// config.js - Static config: data files, thresholds, messages, layout, metadata, steps, tooltips, clusters, indicator list.
// Classic script (not a module): top-level names are shared globals across all
// dashboard scripts. Load order in index.html: config.js -> helpers.js -> charts.js -> render.js -> chart-popup.js -> app.js.

// ─── CONFIG ────────────────────────────────────────────────────────────────────

const DATA_FILES = [
  // Weekly
  'data/weekly/yield_curve.json',
  'data/weekly/jobless_claims.json',
  'data/weekly/credit_spreads.json',
  // Monthly - macro
  'data/monthly/ism_pmi.json',
  'data/monthly/real_m2.json',
  'data/monthly/weekly_hours.json',
  'data/monthly/durable_goods.json',
  // Monthly - stock market
  'data/monthly/shiller_cape.json',
  'data/monthly/sp500_dividend_yield.json',
  'data/monthly/price_to_sales.json',
  'data/monthly/trailing_pe.json',
  'data/monthly/margin_debt.json',
  'data/monthly/tobins_q.json',
  // Monthly - residential / auto / credit
  'data/monthly/housing_starts.json',
  'data/monthly/fha_delinquency.json',
  'data/monthly/vehicle_sales.json',
  'data/monthly/revolving_credit.json',
  'data/monthly/cc_apr.json',
  // Quarterly - macro
  'data/quarterly/loan_officer_survey.json',
  // Quarterly - residential
  'data/quarterly/mortgage_delinquency.json',
  'data/quarterly/conventional_delinquency.json',
  // Quarterly - commercial
  'data/quarterly/commercial_re_delinquency.json',
  'data/quarterly/ci_loan_delinquency.json',
  // Quarterly - auto / credit
  'data/quarterly/auto_delinquency.json',
  'data/quarterly/cc_delinquency.json',
  'data/quarterly/cc_chargeoff.json'
];

// direction: 'higher' = higher is worse (delinquency, spreads, CAPE)
//            'lower'  = lower is worse (yield curve, hours, starts)
//            'inverted' = negative is worse (yield curve specifically)
const THRESHOLDS = {
  yield_curve:              { warn: 0,     danger: -0.5,  direction: 'inverted', avg: '+1.0%' },
  jobless_claims:           { warn: 250000, danger: 350000, direction: 'higher', avg: '220K' }, // raw FRED ICSA units (people), not thousands
  credit_spreads:           { warn: 4,     danger: 6,     direction: 'higher',   avg: '4.0%' },
  ism_pmi:                  { warn: 12500, danger: 12000, direction: 'lower',    avg: '~12,500K' },
  real_m2:                  { warn: 0,     danger: -2,    direction: 'lower',    avg: '0% to +5%',  yoy: true },
  weekly_hours:             { warn: 34.2,  danger: 33.5,  direction: 'lower',    avg: '34.5 hrs' },
  durable_goods:            { warn: -5,    danger: -10,   direction: 'lower',    avg: 'warn < -5%', yoy: true },
  loan_officer_survey:      { warn: 20,    danger: 40,    direction: 'higher',   avg: '~0%' },
  shiller_cape:             { warn: 25,    danger: 35,    direction: 'higher',   avg: '17' },
  trailing_pe:              { warn: 22,    danger: 28,    direction: 'higher',   avg: '18' },
  margin_debt:              { warn: 20,    danger: 40,    direction: 'higher',   avg: 'warn > +20%', yoy: true },
  sp500_dividend_yield:     { warn: 1.8,   danger: 1.4,   direction: 'lower',    avg: '2.0%' },
  price_to_sales:           { warn: 2.2,   danger: 3.0,   direction: 'higher',   avg: '1.5' },
  tobins_q:                 { warn: 150,   danger: 200,   direction: 'higher',   avg: '95%' },
  housing_starts:           { warn: 1200,  danger: 900,   direction: 'lower',    avg: '1,400K' },
  fha_delinquency:          { warn: 6,     danger: 8,     direction: 'higher',   avg: '4%' },
  mortgage_delinquency:     { warn: 3,     danger: 5,     direction: 'higher',   avg: '2.0%' },
  conventional_delinquency: { warn: 2,     danger: 4,     direction: 'higher',   avg: '1.5%' },
  commercial_re_delinquency:{ warn: 1.5,   danger: 3,     direction: 'higher',   avg: '0.8%' },
  ci_loan_delinquency:      { warn: 1,     danger: 2,     direction: 'higher',   avg: '0.8%' },
  vehicle_sales:            { warn: 14,    danger: 12,    direction: 'lower',    avg: '16M' },
  auto_delinquency:         { warn: 4,     danger: 6,     direction: 'higher',   avg: '2.5%' },
  revolving_credit:         { warn: 5,       danger: 10,      direction: 'higher', avg: 'warn > +5%', yoy: true },
  cc_delinquency:           { warn: 3,     danger: 5,     direction: 'higher',   avg: '2.5%' },
  cc_chargeoff:             { warn: 3.5,   danger: 6,     direction: 'higher',   avg: '3.5%' },
  cc_apr:                   { warn: 20,    danger: 24,    direction: 'higher',   avg: '~15%' }
};

// Plain-English status messages per indicator
const MESSAGES = {
  yield_curve:              { green: 'Normal yield curve - banks lending profitably', orange: 'Yield curve slightly inverted - credit caution signal', red: 'Deep inversion - historically precedes recession by 6-18 months' },
  jobless_claims:           { green: 'Low layoff activity - labor market healthy', orange: 'Claims ticking up - worth watching for sustained trend', red: 'Elevated layoffs - labor market deteriorating' },
  credit_spreads:           { green: 'Tight spreads - investors comfortable with risk', orange: 'Spreads widening - credit stress building', red: 'Wide spreads - companies paying premium to borrow, stress is real' },
  ism_pmi:                  { green: 'Factory payrolls stable - manufacturing sector holding employment', orange: 'Manufacturing employment softening - factory sector showing strain', red: 'Manufacturing employment falling - factory sector in contraction' },
  real_m2:                  { green: 'Money supply growing YoY - healthy liquidity conditions', orange: 'Real M2 growth near zero YoY - liquidity tightening', red: 'Real M2 contracting YoY - economic fuel running low' },
  weekly_hours:             { green: 'Employers maintaining worker hours - stable demand', orange: 'Hours being trimmed - early labor stress signal', red: 'Hours cut significantly - layoffs likely next' },
  durable_goods:            { green: 'Business capex growing YoY - companies investing confidently', orange: 'Durable goods orders slowing YoY - business investment cooling', red: 'Durable goods contracting YoY - companies pulling back on capex' },
  loan_officer_survey:      { green: 'Banks lending freely - credit flowing normally', orange: 'Banks tightening standards - credit becoming selective', red: 'Significant tightening - credit crunch risk elevated' },
  shiller_cape:             { green: 'Valuations in reasonable range historically', orange: 'Market moderately overvalued vs history', red: 'Extreme overvaluation - large drawdown risk if earnings disappoint' },
  trailing_pe:              { green: 'Earnings supporting current prices reasonably', orange: 'Paying a premium - less margin of safety', red: 'Very high premium - vulnerable to any earnings miss' },
  margin_debt:              { green: 'Margin debt growing at normal pace YoY', orange: 'Margin debt rising rapidly YoY - speculative leverage building', red: 'Extreme margin debt surge YoY - forced selling risk if market dips' },
  sp500_dividend_yield:     { green: 'Decent income floor under stock prices', orange: 'Minimal income buffer - market priced for perfection', red: 'Near-zero yield - stocks offer almost no income cushion' },
  price_to_sales:           { green: 'Price reflects reasonable revenue multiples', orange: 'Revenue premium elevated', red: 'Extreme revenue multiple - hard to justify at these prices' },
  tobins_q:                 { green: 'Market values assets near replacement cost', orange: 'Paying premium over asset replacement cost', red: 'Extreme premium - market prices well above asset values' },
  housing_starts:           { green: 'Construction pipeline healthy - builders confident', orange: 'Housing starts slowing - affordability or demand concerns', red: 'Construction collapsed - housing market under severe stress' },
  fha_delinquency:          { green: 'FHA borrowers keeping up with payments', orange: 'FHA delinquency rising - lower down payment borrowers stressed', red: 'High FHA delinquency - widespread distress in entry-level market' },
  mortgage_delinquency:     { green: 'Most homeowners current on mortgages', orange: 'Rising mortgage delinquency - homeowner stress building', red: 'High delinquency - significant portion of homeowners struggling' },
  conventional_delinquency: { green: 'Prime borrowers current on payments', orange: 'Prime market showing some stress', red: 'Even prime borrowers struggling - broad mortgage distress' },
  commercial_re_delinquency:{ green: 'Commercial property loans performing', orange: 'Some CRE loan stress - office/retail weakness', red: 'Significant CRE defaults - commercial real estate under distress' },
  ci_loan_delinquency:      { green: 'Businesses keeping up with loans', orange: 'Business loan stress increasing', red: 'Elevated business defaults - corporate health deteriorating' },
  vehicle_sales:            { green: 'Auto demand healthy - consumers buying', orange: 'Car sales slowing - big-ticket hesitation', red: 'Steep sales drop - consumers pulling back on major purchases' },
  auto_delinquency:         { green: 'Auto borrowers current on payments', orange: 'Auto delinquency rising - lower-income stress', red: 'High auto defaults - consumer financial stress confirmed' },
  revolving_credit:         { green: 'Revolving balances growing modestly YoY - pace not alarming', orange: 'Revolving credit accelerating YoY - consumers stretching budgets', red: 'Revolving credit surging YoY - consumers funding expenses with debt' },
  cc_delinquency:           { green: 'Cardholders keeping up with minimum payments', orange: 'More cardholders missing payments', red: 'Widespread payment missed - consumer financial distress confirmed' },
  cc_chargeoff:             { green: 'Banks writing off minimal bad debt', orange: 'Charge-offs rising - defaults materializing', red: 'Banks absorbing heavy credit losses - deep consumer distress' },
  cc_apr:                   { green: 'Card rates within historical range - borrowing costs manageable', orange: 'Elevated APR squeezing household budgets - watch delinquency next', red: 'Record-high card rates - minimum payments consuming large share of income' }
};

// Section layout: type -> category order with display names
const LAYOUT = {
  leading: [
    { key: 'macro', label: 'Macro & Credit', icon: 'ti-building-bank', desc: 'Credit conditions, money supply, and yield signals',
      investigate: [
        { label: 'Fed Meeting Minutes',    url: 'https://www.federalreserve.gov/monetarypolicy/fomccalendars.htm' },
        { label: 'Bank Lending Survey',    url: 'https://www.federalreserve.gov/releases/sloos/' },
        { label: 'FRED Yield Curve',       url: 'https://fred.stlouisfed.org/series/T10Y2Y' },
        { label: 'HY Credit Spreads',      url: 'https://fred.stlouisfed.org/series/BAMLH0A0HYM2' },
      ]
    },
    { key: 'stock_market', label: 'Stock Market', icon: 'ti-chart-candlestick', desc: 'Valuation multiples and investor leverage',
      investigate: [
        { label: 'SEC Insider Filings',    url: 'https://efts.sec.gov/LATEST/search-index?q=%22form+4%22&dateRange=custom&startdt=2025-01-01&forms=4' },
        { label: 'VIX Fear Index',         url: 'https://finance.yahoo.com/quote/%5EVIX/' },
        { label: 'Shiller CAPE History',   url: 'https://www.multpl.com/shiller-pe' },
        { label: 'Forward P/E History',    url: 'https://www.multpl.com/s-p-500-pe-ratio' },
      ]
    },
    { key: 'residential', label: 'Residential', icon: 'ti-home', desc: 'New construction pipeline and builder confidence',
      investigate: [
        { label: '30yr Mortgage Rate',     url: 'https://fred.stlouisfed.org/series/MORTGAGE30US' },
        { label: 'Housing Affordability',  url: 'https://fred.stlouisfed.org/series/FIXHAI' },
        { label: 'Building Permits',       url: 'https://fred.stlouisfed.org/series/PERMIT' },
        { label: 'Housing Starts',         url: 'https://fred.stlouisfed.org/series/HOUST' },
      ]
    },
    { key: 'auto', label: 'Auto', icon: 'ti-car', desc: 'Consumer demand for big-ticket purchases',
      investigate: [
        { label: 'NY Fed HH Debt',         url: 'https://www.newyorkfed.org/microeconomics/hhdc' },
        { label: 'Avg Auto Loan Term',     url: 'https://fred.stlouisfed.org/series/DTCTLNM' },
        { label: 'Used Car Price Index',   url: 'https://fred.stlouisfed.org/series/CUSR0000SETA02' },
      ]
    },
    { key: 'credit_cards', label: 'Credit Cards', icon: 'ti-credit-card', desc: 'Borrowing costs and revolving balance trends',
      investigate: [
        { label: 'CFPB Credit Trends',     url: 'https://www.consumerfinance.gov/data-research/consumer-credit-trends/' },
        { label: 'NY Fed HH Debt',         url: 'https://www.newyorkfed.org/microeconomics/hhdc' },
        { label: 'Household Debt Service', url: 'https://fred.stlouisfed.org/series/TDSP' },
      ]
    },
  ],
  lagging: [
    { key: 'residential', label: 'Residential', icon: 'ti-home', desc: 'Actual mortgage delinquency and foreclosure stress',
      investigate: [
        { label: 'FRED Mortgage Delinquency', url: 'https://fred.stlouisfed.org/series/DRSFRMACBS' },
        { label: 'FHFA Mortgage Data',     url: 'https://www.fhfa.gov/data/nmdb' },
        { label: 'HUD FHA Performance',    url: 'https://www.hud.gov/program_offices/housing/sfh' },
      ]
    },
    { key: 'commercial', label: 'Commercial', icon: 'ti-building', desc: 'Office, retail, and business loan defaults',
      investigate: [
        { label: 'FRED CRE Delinquency',   url: 'https://fred.stlouisfed.org/series/DRCRELEXFACBS' },
        { label: 'FRED C&I Delinquency',   url: 'https://fred.stlouisfed.org/series/DRBLACBS' },
        { label: 'FDIC Quarterly Profile', url: 'https://www.fdic.gov/analysis/quarterly-banking-profile/' },
      ]
    },
    { key: 'auto', label: 'Auto', icon: 'ti-car', desc: 'Auto loan defaults and repossession stress',
      investigate: [
        { label: 'NY Fed Auto Delinquency',url: 'https://www.newyorkfed.org/microeconomics/hhdc' },
        { label: 'Used Car Price Index',   url: 'https://fred.stlouisfed.org/series/CUSR0000SETA02' },
        { label: 'FRED Auto Delinquency',  url: 'https://fred.stlouisfed.org/series/DROCLACBS' },
      ]
    },
    { key: 'credit_cards', label: 'Credit Cards', icon: 'ti-credit-card', desc: 'Payment failures and bank charge-offs',
      investigate: [
        { label: 'CFPB Complaint Database',url: 'https://www.consumerfinance.gov/data-research/consumer-complaints/' },
        { label: 'NY Fed HH Debt Report',  url: 'https://www.newyorkfed.org/microeconomics/hhdc' },
        { label: 'FRED Loan Loss Reserves',url: 'https://fred.stlouisfed.org/series/ALLACBM027SBOG' },
      ]
    },
  ]
};

// ─── INDICATOR METADATA ───────────────────────────────────────────────────────
// frequency, access, importance live here - not in JSON data files

const INDICATOR_META = {
  yield_curve:              { frequency: 'Weekly',    access: 'fred_api', importance: 'Critical' },
  jobless_claims:           { frequency: 'Weekly',    access: 'fred_api', importance: 'High' },
  credit_spreads:           { frequency: 'Weekly',    access: 'fred_api', importance: 'High' },
  ism_pmi:                  { frequency: 'Monthly',   access: 'fred_api', importance: 'High' },
  real_m2:                  { frequency: 'Monthly',   access: 'fred_api', importance: 'Medium' },
  weekly_hours:             { frequency: 'Monthly',   access: 'fred_api', importance: 'Medium' },
  durable_goods:            { frequency: 'Monthly',   access: 'fred_api', importance: 'Medium' },
  loan_officer_survey:      { frequency: 'Quarterly', access: 'fred_api', importance: 'Medium' },
  shiller_cape:             { frequency: 'Monthly',   access: 'html_scrape', importance: 'High' },
  trailing_pe:              { frequency: 'Monthly',   access: 'html_scrape', importance: 'High' },
  margin_debt:              { frequency: 'Monthly',   access: 'file_drop',   importance: 'Medium' },
  sp500_dividend_yield:     { frequency: 'Monthly',   access: 'html_scrape', importance: 'Medium' },
  price_to_sales:           { frequency: 'Monthly',   access: 'html_scrape', importance: 'Medium' },
  tobins_q:                 { frequency: 'Monthly',   access: 'fred_api', importance: 'Low' },
  housing_starts:           { frequency: 'Monthly',   access: 'fred_api', importance: 'Medium' },
  vehicle_sales:            { frequency: 'Monthly',   access: 'fred_api', importance: 'Medium' },
  revolving_credit:         { frequency: 'Monthly',   access: 'fred_api', importance: 'Medium' },
  fha_delinquency:          { frequency: 'Monthly',   access: 'file_drop', importance: 'Medium' },
  mortgage_delinquency:     { frequency: 'Quarterly', access: 'fred_api', importance: 'Medium' },
  conventional_delinquency: { frequency: 'Quarterly', access: 'file_drop', importance: 'Medium' },
  commercial_re_delinquency:{ frequency: 'Quarterly', access: 'fred_api', importance: 'Medium' },
  ci_loan_delinquency:      { frequency: 'Quarterly', access: 'fred_api', importance: 'Medium' },
  auto_delinquency:         { frequency: 'Quarterly', access: 'fred_api', importance: 'Medium' },
  cc_delinquency:           { frequency: 'Quarterly', access: 'fred_api', importance: 'Medium' },
  cc_chargeoff:             { frequency: 'Quarterly', access: 'fred_api', importance: 'Medium' },
  cc_apr:                   { frequency: 'Monthly',   access: 'fred_api', importance: 'Medium' }
};

// ─── MANUAL STEPS (file_drop indicators only) ─────────────────────────────────
// Step-by-step instructions for indicators that require a file to be manually
// downloaded and dropped into data/manual-file-dropzone/

const MANUAL_STEPS = {
  margin_debt: {
    label: 'Margin Debt',
    frequency: 'Monthly',
    sourceUrl: 'https://www.finra.org/investors/learn-to-invest/advanced-investing/margin-statistics',
    steps: [
      'Go to the source link above and download the Excel file under "Monthly Margin Statistics". Drop it into <code>data/manual-file-dropzone/</code> (do not rename it).',
      'From the project root, run: <code>npm run file-drop:margin-debt</code>',
      'The script auto-detects the xlsx, extracts 36 months of debit balance data, writes to <code>data/monthly/margin_debt.json</code>, and renames the file to mark it processed. Safe to re-run.'
    ]
  },
  fha_delinquency: {
    label: 'FHA Delinquency Rate',
    frequency: 'Monthly',
    sourceUrl: 'https://www.hud.gov/hud-partners/single-family-loan-performance',
    steps: [
      'Go to the source link above and download the latest FHA Loan Performance Trends PDF.',
      'Drop the PDF into <code>data/manual-file-dropzone/</code> (do not rename it).',
      'From the project root, run: <code>npm run file-drop:fha-delinquency</code> - extracts the Non-SA Serious Delinquency Rate from Table 1 and writes to <code>data/monthly/fha_delinquency.json</code>. Safe to re-run.'
    ]
  },
  conventional_delinquency: {
    label: 'Conventional Delinquency Rate',
    frequency: 'Quarterly',
    sourceUrl: 'https://www.fhfa.gov/data/nmdb',
    steps: [
      'Go to the source link above, under "Residential Mortgage Performance Statistics" download the National, Census Regions, and Census Divisions [CSV] (quarterly ZIP file).',
      'Drop the .zip into <code>data/manual-file-dropzone/</code> (do not rename it - the script handles unzipping).',
      'From the project root, run: <code>npm run file-drop:conventional-delinquency</code> - extracts P90DL data for Enterprise Acquisitions and writes to <code>data/quarterly/conventional_delinquency.json</code>. Safe to re-run.'
    ]
  }
};

// ─── HTML SCRAPE STEPS ────────────────────────────────────────────────────────
// Step-by-step for indicators scraped from multpl.com via html-scrape-multpl-shared.js

const HTML_SCRAPE_STEPS = {
  shiller_cape: {
    label: 'Shiller CAPE Ratio',
    frequency: 'Monthly',
    sourceUrl: 'https://www.multpl.com/shiller-pe',
    dataFile: 'data/monthly/shiller_cape.json',
    steps: [
      'No file download needed. Data is scraped automatically from <a href="https://www.multpl.com/shiller-pe" target="_blank" style="color:var(--blue)">multpl.com/shiller-pe</a>.',
      'From the project root, run: <code>npm run html-scrape:multpl</code> - this refreshes all 4 multpl.com indicators at once.',
      'The script validates the scraped data and writes to <code>data/monthly/shiller_cape.json</code>. A 1-hour cooldown guard prevents hammering the site.'
    ]
  },
  trailing_pe: {
    label: 'Trailing P/E (S&amp;P 500)',
    frequency: 'Monthly',
    sourceUrl: 'https://www.multpl.com/s-p-500-pe-ratio',
    dataFile: 'data/monthly/trailing_pe.json',
    steps: [
      'No file download needed. Data is scraped automatically from <a href="https://www.multpl.com/s-p-500-pe-ratio" target="_blank" style="color:var(--blue)">multpl.com/s-p-500-pe-ratio</a>.',
      'From the project root, run: <code>npm run html-scrape:multpl</code> - this refreshes all 4 multpl.com indicators at once.',
      'The script validates the scraped data and writes to <code>data/monthly/trailing_pe.json</code>. A 1-hour cooldown guard prevents hammering the site.'
    ]
  },
  sp500_dividend_yield: {
    label: 'S&amp;P 500 Dividend Yield',
    frequency: 'Monthly',
    sourceUrl: 'https://www.multpl.com/s-p-500-dividend-yield',
    dataFile: 'data/monthly/sp500_dividend_yield.json',
    steps: [
      'No file download needed. Data is scraped automatically from <a href="https://www.multpl.com/s-p-500-dividend-yield" target="_blank" style="color:var(--blue)">multpl.com/s-p-500-dividend-yield</a>.',
      'From the project root, run: <code>npm run html-scrape:multpl</code> - this refreshes all 4 multpl.com indicators at once.',
      'The script validates the scraped data and writes to <code>data/monthly/sp500_dividend_yield.json</code>. A 1-hour cooldown guard prevents hammering the site.'
    ]
  },
  price_to_sales: {
    label: 'Price-to-Sales (S&amp;P 500)',
    frequency: 'Monthly',
    sourceUrl: 'https://www.multpl.com/s-p-500-price-to-sales',
    dataFile: 'data/monthly/price_to_sales.json',
    steps: [
      'No file download needed. Data is scraped automatically from <a href="https://www.multpl.com/s-p-500-price-to-sales" target="_blank" style="color:var(--blue)">multpl.com/s-p-500-price-to-sales</a>.',
      'From the project root, run: <code>npm run html-scrape:multpl</code> - this refreshes all 4 multpl.com indicators at once.',
      'The script validates the scraped data and writes to <code>data/monthly/price_to_sales.json</code>. A 1-hour cooldown guard prevents hammering the site.'
    ]
  }
};

// ─── STALE DETECTION ──────────────────────────────────────────────────────────
const STALE_THRESHOLDS = { Weekly: 14, Monthly: 45, Quarterly: 100 };

function isStale(fileUpdated, frequency) {
  if (!fileUpdated || !frequency) return false;
  const days = (Date.now() - new Date(fileUpdated)) / 86400000;
  return days > (STALE_THRESHOLDS[frequency] || 999);
}

// ─── TOOLTIPS ─────────────────────────────────────────────────────────────────
// Hover explanations: what the data is, what signals trouble, why it matters

const TOOLTIPS = {
  yield_curve:              'Measures the gap between 10-year and 2-year Treasury yields. When short-term rates exceed long-term rates (inversion), banks cannot profit from lending and tighten credit. Every U.S. recession since 1950 was preceded by an inverted yield curve.',
  jobless_claims:           'Tracks how many people filed for unemployment benefits in the past week. A sustained rise above 300K signals layoffs are accelerating across the economy. Reported weekly, making it one of the fastest-moving labor market signals available.',
  credit_spreads:           'Measures the extra interest rate high-risk companies must pay vs. safe U.S. Treasuries. When spreads widen sharply, investors are demanding higher compensation for risk - a sign credit markets are stressed and lending conditions are tightening economy-wide.',
  ism_pmi:                  'Tracks employment levels in U.S. manufacturing. Declining manufacturing employment signals factories are cutting workers due to falling orders - often an early sign of broader economic contraction spreading from goods production to services.',
  real_m2:                  'Measures total money in circulation adjusted for inflation. When real M2 shrinks, there is less economic fuel available - consumer spending and business investment typically slow 6-12 months later as households and companies have less purchasing power.',
  weekly_hours:             'Tracks average hours worked per week across all private industries. Employers typically cut hours before cutting headcount, making this an early warning of layoffs. A drop of 0.5 hours or more sustained over several months is historically significant.',
  durable_goods:            'Measures new orders for long-lasting manufactured goods like machinery and equipment. When businesses stop investing in equipment, they are signaling lower demand expectations ahead - a leading indicator of economic slowdown 3-6 months out.',
  loan_officer_survey:      'Federal Reserve survey asking bank officers if they are tightening lending standards. When banks tighten, fewer businesses and consumers can access credit. Tightening typically slows economic activity 2-4 quarters later as credit becomes harder to obtain.',
  shiller_cape:             'Price-to-earnings ratio using 10 years of inflation-adjusted earnings to smooth economic cycles. High values mean investors are paying a large premium relative to long-run earnings capacity. Historically, CAPE above 30 has preceded significant multi-year market corrections.',
  trailing_pe:              'Current S&P 500 price divided by the past 12 months of actual reported earnings. A high P/E means investors pay a large premium per dollar of real earnings, leaving little margin of safety when earnings disappoint or economic conditions soften.',
  margin_debt:              'Total money borrowed from brokers to buy stocks on leverage. Rising margin debt amplifies gains on the way up but creates forced selling on the way down - when prices drop, margin calls trigger cascading sell-offs that can accelerate market declines rapidly.',
  sp500_dividend_yield:     'Annual dividend income as a percentage of the S&P 500 index price. Very low yields mean stocks provide almost no income cushion. Historically, yields below 1.5% have coincided with overvalued markets that are highly vulnerable to sharp price corrections.',
  price_to_sales:           'Stock market price divided by company revenues. Unlike earnings, revenues are harder to manipulate with accounting adjustments. A high P/S ratio means investors are paying a steep premium per dollar of actual sales, signaling potential overvaluation.',
  tobins_q:                 'Corporate equity market value as a percentage of net worth (book equity), sourced from the Federal Reserve Z.1 Flow of Funds (NCBCEPNW). Values above 150% indicate the market is pricing equities at a significant premium over book value. Above 200% is historically extreme, seen near the dot-com and 2021 peaks.',
  housing_starts:           'Number of new residential construction projects begun each month. Declining starts signal builders and buyers are losing confidence. Housing drives significant economic activity through materials, labor, and furnishings - weakness here spreads broadly.',
  fha_delinquency:          'Serious Delinquency Rate (90+ days past due, in-foreclosure, or in-bankruptcy) for FHA-insured loans. FHA borrowers use low down payments (3.5% min) and are more financially vulnerable than conventional borrowers. FHA stress shows up 6-12 months before prime mortgage markets. Above 6% is elevated; above 8% signals widespread distress in the entry-level housing market.',
  mortgage_delinquency:     'Percentage of single-family mortgages 30+ days past due. Rising delinquency means homeowners are struggling with payments, which leads to foreclosures, bank losses, and tighter lending standards - a lagging confirmation that a downturn is underway.',
  conventional_delinquency: 'Delinquency rate on conventional prime mortgages backed by Fannie Mae and Freddie Mac. When even prime borrowers miss payments, financial stress has moved beyond subprime into the mainstream market - indicating a broad and severe downturn.',
  commercial_re_delinquency:'Percentage of commercial real estate loans past due at banks. Stress in office, retail, and industrial loans signals businesses are unable to service debt, which flows back to falling property values, bank losses, and tighter credit conditions.',
  ci_loan_delinquency:      'Percentage of commercial and industrial business loans past due. When businesses miss loan payments it confirms corporate financial distress is deepening - typically a lagging signal that an economic downturn has spread across multiple sectors of the economy.',
  vehicle_sales:            'Seasonally adjusted annualized rate of total vehicle sales. Cars are major purchases that consumers delay when uncertain about the future. A sharp sustained drop signals deteriorating consumer confidence and tightening credit conditions in auto lending.',
  auto_delinquency:         'Percentage of auto loans 30+ days past due. Auto loans often show delinquency early in a downturn since they are smaller than mortgages and consumers prioritize housing payments. Rising rates signal spreading consumer financial stress.',
  revolving_credit:         'Total revolving credit (primarily credit card balances) outstanding. Rapid growth signals consumers are funding everyday expenses with debt rather than income - a warning that household finances are stretched and spending is not supported by real earnings.',
  cc_delinquency:           'Percentage of credit card balances 30+ days past due. Credit card delinquency is often the first consumer stress indicator since cards are unsecured - consumers prioritize mortgage and auto payments first, making card delinquency an early warning signal.',
  cc_chargeoff:             'Percentage of credit card debt written off by banks as uncollectible losses. Charge-offs are a lagging confirmation that delinquencies have materialized into actual bank losses, measuring the true depth of consumer financial distress in the economy.',
  cc_apr:                   'Average annual percentage rate charged on all credit card accounts at commercial banks. At 20%+, the minimum payment on a $5,000 balance consumes over $80/month in interest alone. Rising APR directly compresses consumer spending power and accelerates delinquency when unemployment rises.'
};

// ─── FRED API STEPS ───────────────────────────────────────────────────────────
// Reference cards for all 18 FRED-API indicators - auto-fetched by GitHub Actions

const FRED_API_STEPS = {
  yield_curve: {
    label: 'Yield Curve (2yr vs 10yr)',
    frequency: 'Weekly',
    fredSeries: 'T10Y2Y',
    npmCmd: 'npm run api-pull:weekly',
    dataFile: 'data/weekly/yield_curve.json',
    sourceUrl: 'https://fred.stlouisfed.org/series/T10Y2Y',
    steps: [
      'Fetched automatically every day at 7am UTC by GitHub Actions. No manual action needed.',
      'To refresh locally, run: <code>npm run api-pull:weekly</code> (add <code>-- --force</code> to bypass the freshness check).',
      'FRED Series: <code>T10Y2Y</code> - Measures the gap between 10-year and 2-year Treasury yields. When short-term rates exceed long-term rates (inversion), banks cannot profit from lending and tighten credit. Every U.S. recession since 1950 was preceded by an inverted yield curve.'
    ]
  },
  jobless_claims: {
    label: 'Initial Jobless Claims',
    frequency: 'Weekly',
    fredSeries: 'ICSA',
    npmCmd: 'npm run api-pull:weekly',
    dataFile: 'data/weekly/jobless_claims.json',
    sourceUrl: 'https://fred.stlouisfed.org/series/ICSA',
    steps: [
      'Fetched automatically every day at 7am UTC by GitHub Actions. No manual action needed.',
      'To refresh locally, run: <code>npm run api-pull:weekly</code> (add <code>-- --force</code> to bypass the freshness check).',
      'FRED Series: <code>ICSA</code> - Tracks how many people filed for unemployment benefits in the past week. A sustained rise above 300K signals layoffs are accelerating. Reported weekly, making it one of the fastest-moving labor market signals available.'
    ]
  },
  credit_spreads: {
    label: 'High-Yield Credit Spreads',
    frequency: 'Weekly',
    fredSeries: 'BAMLH0A0HYM2',
    npmCmd: 'npm run api-pull:weekly',
    dataFile: 'data/weekly/credit_spreads.json',
    sourceUrl: 'https://fred.stlouisfed.org/series/BAMLH0A0HYM2',
    steps: [
      'Fetched automatically every day at 7am UTC by GitHub Actions. No manual action needed.',
      'To refresh locally, run: <code>npm run api-pull:weekly</code> (add <code>-- --force</code> to bypass the freshness check).',
      'FRED Series: <code>BAMLH0A0HYM2</code> - Measures the extra interest rate high-risk companies must pay vs. safe U.S. Treasuries. When spreads widen sharply, investors are demanding higher compensation for risk - a sign credit markets are stressed and lending conditions are tightening.'
    ]
  },
  ism_pmi: {
    label: 'ISM Manufacturing PMI',
    frequency: 'Monthly',
    fredSeries: 'MANEMP',
    npmCmd: 'npm run api-pull:monthly',
    dataFile: 'data/monthly/ism_pmi.json',
    sourceUrl: 'https://fred.stlouisfed.org/series/MANEMP',
    steps: [
      'Fetched automatically every day at 7am UTC by GitHub Actions. No manual action needed.',
      'To refresh locally, run: <code>npm run api-pull:monthly</code> (add <code>-- --force</code> to bypass the freshness check).',
      'FRED Series: <code>MANEMP</code> (Manufacturing Employment) - Tracks employment levels in U.S. manufacturing. Declining manufacturing employment signals factories are cutting workers due to falling orders - often an early sign of broader economic contraction.'
    ]
  },
  real_m2: {
    label: 'Real M2 Money Supply',
    frequency: 'Monthly',
    fredSeries: 'M2REAL',
    npmCmd: 'npm run api-pull:monthly',
    dataFile: 'data/monthly/real_m2.json',
    sourceUrl: 'https://fred.stlouisfed.org/series/M2REAL',
    steps: [
      'Fetched automatically every day at 7am UTC by GitHub Actions. No manual action needed.',
      'To refresh locally, run: <code>npm run api-pull:monthly</code> (add <code>-- --force</code> to bypass the freshness check).',
      'FRED Series: <code>M2REAL</code> - Measures total money in circulation adjusted for inflation. When real M2 shrinks, there is less economic fuel available - consumer spending and business investment typically slow 6-12 months later as households have less purchasing power.'
    ]
  },
  weekly_hours: {
    label: 'Avg Weekly Hours Worked',
    frequency: 'Monthly',
    fredSeries: 'AWHAETP',
    npmCmd: 'npm run api-pull:monthly',
    dataFile: 'data/monthly/weekly_hours.json',
    sourceUrl: 'https://fred.stlouisfed.org/series/AWHAETP',
    steps: [
      'Fetched automatically every day at 7am UTC by GitHub Actions. No manual action needed.',
      'To refresh locally, run: <code>npm run api-pull:monthly</code> (add <code>-- --force</code> to bypass the freshness check).',
      'FRED Series: <code>AWHAETP</code> - Tracks average hours worked per week across all private industries. Employers typically cut hours before cutting headcount, making this an early warning of layoffs. A drop of 0.5 hours or more sustained over several months is historically significant.'
    ]
  },
  durable_goods: {
    label: 'Durable Goods Orders',
    frequency: 'Monthly',
    fredSeries: 'DGORDER',
    npmCmd: 'npm run api-pull:monthly',
    dataFile: 'data/monthly/durable_goods.json',
    sourceUrl: 'https://fred.stlouisfed.org/series/DGORDER',
    steps: [
      'Fetched automatically every day at 7am UTC by GitHub Actions. No manual action needed.',
      'To refresh locally, run: <code>npm run api-pull:monthly</code> (add <code>-- --force</code> to bypass the freshness check).',
      'FRED Series: <code>DGORDER</code> - Measures new orders for long-lasting manufactured goods like machinery and equipment. When businesses stop investing in equipment, they are signaling lower demand expectations ahead - a leading indicator of economic slowdown 3-6 months out.'
    ]
  },
  tobins_q: {
    label: "Tobin's Q Ratio",
    frequency: 'Monthly',
    fredSeries: 'NCBCEPNW',
    npmCmd: 'npm run api-pull:monthly',
    dataFile: 'data/monthly/tobins_q.json',
    sourceUrl: 'https://fred.stlouisfed.org/series/NCBCEPNW',
    steps: [
      'Fetched automatically every day at 7am UTC by GitHub Actions. No manual action needed.',
      'To refresh locally, run: <code>npm run api-pull:monthly</code> (add <code>-- --force</code> to bypass the freshness check).',
      'FRED Series: <code>NCBCEPNW</code> (Corporate Equities as % of Net Worth, Z.1 Flow of Funds) - Values above 150% indicate equities are priced at a significant premium over book value. Above 200% is historically extreme, seen near the dot-com and 2021 peaks.'
    ]
  },
  housing_starts: {
    label: 'Housing Starts & Permits',
    frequency: 'Monthly',
    fredSeries: 'HOUST',
    npmCmd: 'npm run api-pull:monthly',
    dataFile: 'data/monthly/housing_starts.json',
    sourceUrl: 'https://fred.stlouisfed.org/series/HOUST',
    steps: [
      'Fetched automatically every day at 7am UTC by GitHub Actions. No manual action needed.',
      'To refresh locally, run: <code>npm run api-pull:monthly</code> (add <code>-- --force</code> to bypass the freshness check).',
      'FRED Series: <code>HOUST</code> - Number of new residential construction projects begun each month. Declining starts signal builders and buyers are losing confidence. Housing drives significant economic activity through materials, labor, and furnishings - weakness here spreads broadly.'
    ]
  },
  vehicle_sales: {
    label: 'Total Vehicle Sales (SAAR)',
    frequency: 'Monthly',
    fredSeries: 'TOTALSA',
    npmCmd: 'npm run api-pull:monthly',
    dataFile: 'data/monthly/vehicle_sales.json',
    sourceUrl: 'https://fred.stlouisfed.org/series/TOTALSA',
    steps: [
      'Fetched automatically every day at 7am UTC by GitHub Actions. No manual action needed.',
      'To refresh locally, run: <code>npm run api-pull:monthly</code> (add <code>-- --force</code> to bypass the freshness check).',
      'FRED Series: <code>TOTALSA</code> - Seasonally adjusted annualized rate of total vehicle sales. Cars are major purchases that consumers delay when uncertain about the future. A sharp sustained drop signals deteriorating consumer confidence and tightening credit conditions in auto lending.'
    ]
  },
  revolving_credit: {
    label: 'Revolving Credit Outstanding',
    frequency: 'Monthly',
    fredSeries: 'REVOLSL',
    npmCmd: 'npm run api-pull:monthly',
    dataFile: 'data/monthly/revolving_credit.json',
    sourceUrl: 'https://fred.stlouisfed.org/series/REVOLSL',
    steps: [
      'Fetched automatically every day at 7am UTC by GitHub Actions. No manual action needed.',
      'To refresh locally, run: <code>npm run api-pull:monthly</code> (add <code>-- --force</code> to bypass the freshness check).',
      'FRED Series: <code>REVOLSL</code> (values in millions on FRED, displayed as trillions) - Total revolving credit (primarily credit card balances) outstanding. Rapid growth signals consumers are funding everyday expenses with debt rather than income - a warning that household finances are stretched.'
    ]
  },
  loan_officer_survey: {
    label: 'Senior Loan Officer Survey',
    frequency: 'Quarterly',
    fredSeries: 'DRTSCILM',
    npmCmd: 'npm run api-pull:quarterly',
    dataFile: 'data/quarterly/loan_officer_survey.json',
    sourceUrl: 'https://fred.stlouisfed.org/series/DRTSCILM',
    steps: [
      'Fetched automatically every day at 7am UTC by GitHub Actions. No manual action needed.',
      'To refresh locally, run: <code>npm run api-pull:quarterly</code> (add <code>-- --force</code> to bypass the freshness check).',
      'FRED Series: <code>DRTSCILM</code> (Net % of banks tightening C&I lending standards) - Federal Reserve survey asking bank officers if they are tightening lending standards. When banks tighten, fewer businesses and consumers can access credit. Tightening typically slows economic activity 2-4 quarters later.'
    ]
  },
  mortgage_delinquency: {
    label: 'Mortgage Delinquency Rate',
    frequency: 'Quarterly',
    fredSeries: 'DRSFRMACBS',
    npmCmd: 'npm run api-pull:quarterly',
    dataFile: 'data/quarterly/mortgage_delinquency.json',
    sourceUrl: 'https://fred.stlouisfed.org/series/DRSFRMACBS',
    steps: [
      'Fetched automatically every day at 7am UTC by GitHub Actions. No manual action needed.',
      'To refresh locally, run: <code>npm run api-pull:quarterly</code> (add <code>-- --force</code> to bypass the freshness check).',
      'FRED Series: <code>DRSFRMACBS</code> - Percentage of single-family mortgages 30+ days past due. Rising delinquency means homeowners are struggling with payments, which leads to foreclosures, bank losses, and tighter lending standards - a lagging confirmation that a downturn is underway.'
    ]
  },
  commercial_re_delinquency: {
    label: 'Commercial RE Loan Delinquency',
    frequency: 'Quarterly',
    fredSeries: 'DRCRELEXFACBS',
    npmCmd: 'npm run api-pull:quarterly',
    dataFile: 'data/quarterly/commercial_re_delinquency.json',
    sourceUrl: 'https://fred.stlouisfed.org/series/DRCRELEXFACBS',
    steps: [
      'Fetched automatically every day at 7am UTC by GitHub Actions. No manual action needed.',
      'To refresh locally, run: <code>npm run api-pull:quarterly</code> (add <code>-- --force</code> to bypass the freshness check).',
      'FRED Series: <code>DRCRELEXFACBS</code> - Percentage of commercial real estate loans past due at banks. Stress in office, retail, and industrial loans signals businesses are unable to service debt, which flows back to falling property values, bank losses, and tighter credit conditions.'
    ]
  },
  ci_loan_delinquency: {
    label: 'C&I Loan Delinquency',
    frequency: 'Quarterly',
    fredSeries: 'DRBLACBS',
    npmCmd: 'npm run api-pull:quarterly',
    dataFile: 'data/quarterly/ci_loan_delinquency.json',
    sourceUrl: 'https://fred.stlouisfed.org/series/DRBLACBS',
    steps: [
      'Fetched automatically every day at 7am UTC by GitHub Actions. No manual action needed.',
      'To refresh locally, run: <code>npm run api-pull:quarterly</code> (add <code>-- --force</code> to bypass the freshness check).',
      'FRED Series: <code>DRBLACBS</code> - Percentage of commercial and industrial business loans past due. When businesses miss loan payments it confirms corporate financial distress is deepening - typically a lagging signal that an economic downturn has spread across multiple sectors.'
    ]
  },
  auto_delinquency: {
    label: 'Auto Loan Delinquency Rate',
    frequency: 'Quarterly',
    fredSeries: 'DROCLACBS',
    npmCmd: 'npm run api-pull:quarterly',
    dataFile: 'data/quarterly/auto_delinquency.json',
    sourceUrl: 'https://fred.stlouisfed.org/series/DROCLACBS',
    steps: [
      'Fetched automatically every day at 7am UTC by GitHub Actions. No manual action needed.',
      'To refresh locally, run: <code>npm run api-pull:quarterly</code> (add <code>-- --force</code> to bypass the freshness check).',
      'FRED Series: <code>DROCLACBS</code> (Other Consumer Loans Delinquency - primarily auto and personal installment loans) - Percentage of other consumer loans 30+ days past due. Best available FRED proxy for auto delinquency. Rising rates signal spreading consumer financial stress beyond credit cards.'
    ]
  },
  cc_delinquency: {
    label: 'Credit Card Delinquency Rate',
    frequency: 'Quarterly',
    fredSeries: 'DRCCLACBS',
    npmCmd: 'npm run api-pull:quarterly',
    dataFile: 'data/quarterly/cc_delinquency.json',
    sourceUrl: 'https://fred.stlouisfed.org/series/DRCCLACBS',
    steps: [
      'Fetched automatically every day at 7am UTC by GitHub Actions. No manual action needed.',
      'To refresh locally, run: <code>npm run api-pull:quarterly</code> (add <code>-- --force</code> to bypass the freshness check).',
      'FRED Series: <code>DRCCLACBS</code> - Percentage of credit card balances 30+ days past due. Credit card delinquency is often the first consumer stress indicator since cards are unsecured - consumers prioritize mortgage and auto payments first, making card delinquency an early warning signal.'
    ]
  },
  cc_chargeoff: {
    label: 'Credit Card Charge-Off Rate',
    frequency: 'Quarterly',
    fredSeries: 'CORCCACBS',
    npmCmd: 'npm run api-pull:quarterly',
    dataFile: 'data/quarterly/cc_chargeoff.json',
    sourceUrl: 'https://fred.stlouisfed.org/series/CORCCACBS',
    steps: [
      'Fetched automatically every day at 7am UTC by GitHub Actions. No manual action needed.',
      'To refresh locally, run: <code>npm run api-pull:quarterly</code> (add <code>-- --force</code> to bypass the freshness check).',
      'FRED Series: <code>CORCCACBS</code> - Percentage of credit card debt written off by banks as uncollectible losses. Charge-offs are a lagging confirmation that delinquencies have materialized into actual bank losses, measuring the true depth of consumer financial distress in the economy.'
    ]
  },
  cc_apr: {
    label: 'Credit Card Average APR',
    frequency: 'Monthly',
    fredSeries: 'TERMCBCCALLNS',
    npmCmd: 'npm run api-pull:monthly',
    dataFile: 'data/monthly/cc_apr.json',
    sourceUrl: 'https://fred.stlouisfed.org/series/TERMCBCCALLNS',
    steps: [
      'Fetched automatically every day at 7am UTC by GitHub Actions. No manual action needed.',
      'To refresh locally, run: <code>npm run api-pull:monthly</code> (add <code>-- --force</code> to bypass the freshness check).',
      'FRED Series: <code>TERMCBCCALLNS</code> (Commercial Bank Interest Rate on Credit Card Plans, All Accounts) - Average APR on all credit card accounts. Note: FRED reports bimonthly (Feb, May, Aug, Nov readings); months without data use the last reported value. Currently ~21%. Above 20% warn, above 24% danger.'
    ]
  }
};

// ─── CORRELATION CLUSTERS ─────────────────────────────────────────────────────
// Each cluster groups indicators by their underlying economic driver.
// Weights reflect leading/lagging importance: leading clusters carry more weight.
// Scoring: per-cluster % = (orange*1 + red*2) / (clusterSize*2) * 100
// Final weighted score = sum(cluster_pct * weight) mapped to 0-56 display range.

const CLUSTERS = {
  monetary_credit: {
    label: 'Monetary & Credit',
    weight: 0.30,
    indicators: ['yield_curve', 'credit_spreads', 'real_m2', 'loan_officer_survey', 'revolving_credit']
  },
  labor_market: {
    label: 'Labor Market',
    weight: 0.25,
    indicators: ['jobless_claims', 'weekly_hours', 'ism_pmi', 'durable_goods']
  },
  asset_valuations: {
    label: 'Asset Valuations',
    weight: 0.20,
    indicators: ['shiller_cape', 'trailing_pe', 'sp500_dividend_yield', 'price_to_sales', 'tobins_q', 'margin_debt']
  },
  real_economy: {
    label: 'Real Economy',
    weight: 0.15,
    indicators: ['housing_starts', 'vehicle_sales']
  },
  debt_stress: {
    label: 'Debt Stress',
    weight: 0.10,
    indicators: ['fha_delinquency', 'mortgage_delinquency', 'conventional_delinquency', 'commercial_re_delinquency', 'ci_loan_delinquency', 'auto_delinquency', 'cc_delinquency', 'cc_chargeoff', 'cc_apr']
  }
};


// ─── ALL INDICATORS ──────────────────────────────────────────────────────────
const ALL_INDICATORS = [
  { id:'yield_curve',              label:'Yield Curve (2yr vs 10yr)',       type:'leading',  category:'macro',        unit:'%',               url:'https://fred.stlouisfed.org/series/T10Y2Y' },
  { id:'jobless_claims',           label:'Initial Jobless Claims',          type:'leading',  category:'macro',        unit:'thousands',        url:'https://fred.stlouisfed.org/series/ICSA' },
  { id:'credit_spreads',           label:'High-Yield Credit Spreads',       type:'leading',  category:'macro',        unit:'%',               url:'https://fred.stlouisfed.org/series/BAMLH0A0HYM2' },
  { id:'ism_pmi',                  label:'Manufacturing Employment',         type:'leading',  category:'macro',        unit:'thousands',        url:'https://fred.stlouisfed.org/series/MANEMP' },
  { id:'real_m2',                  label:'Real M2 Money Supply',            type:'leading',  category:'macro',        unit:'billions USD',     url:'https://fred.stlouisfed.org/series/M2REAL' },
  { id:'weekly_hours',             label:'Avg Weekly Hours Worked',         type:'leading',  category:'macro',        unit:'hours',            url:'https://fred.stlouisfed.org/series/AWHAETP' },
  { id:'durable_goods',            label:'Durable Goods Orders',            type:'leading',  category:'macro',        unit:'millions USD',     url:'https://fred.stlouisfed.org/series/DGORDER' },
  { id:'loan_officer_survey',      label:'Senior Loan Officer Survey',      type:'leading',  category:'macro',        unit:'% net tightening', url:'https://fred.stlouisfed.org/series/DRTSCILM' },
  { id:'shiller_cape',             label:'Shiller CAPE Ratio',              type:'leading',  category:'stock_market', unit:'ratio',            url:'https://www.multpl.com/shiller-pe' },
  { id:'trailing_pe',              label:'Trailing P/E (S&P 500)',          type:'leading',  category:'stock_market', unit:'ratio',            url:'https://www.multpl.com/s-p-500-pe-ratio' },
  { id:'margin_debt',              label:'Margin Debt',                     type:'leading',  category:'stock_market', unit:'millions USD',     url:'https://www.finra.org/investors/learn-to-invest/advanced-investing/margin-statistics' },
  { id:'sp500_dividend_yield',     label:'S&P 500 Dividend Yield',          type:'leading',  category:'stock_market', unit:'%',               url:'https://www.multpl.com/s-p-500-dividend-yield' },
  { id:'price_to_sales',           label:'Price-to-Sales (S&P 500)',        type:'leading',  category:'stock_market', unit:'ratio',            url:'https://www.multpl.com/s-p-500-price-to-sales' },
  { id:'tobins_q',                 label:"Tobin's Q Ratio",                 type:'leading',  category:'stock_market', unit:'%',                url:'https://fred.stlouisfed.org/series/NCBCEPNW' },
  { id:'housing_starts',           label:'Housing Starts & Permits',        type:'leading',  category:'residential',  unit:'thousands of units',url:'https://fred.stlouisfed.org/series/HOUST' },
  { id:'vehicle_sales',            label:'Total Vehicle Sales (SAAR)',      type:'leading',  category:'auto',         unit:'millions of units', url:'https://fred.stlouisfed.org/series/TOTALSA' },
  { id:'revolving_credit',         label:'Revolving Credit Outstanding',    type:'leading',  category:'credit_cards', unit:'trillions USD',    url:'https://fred.stlouisfed.org/series/REVOLSL' },
  { id:'cc_apr',                   label:'Credit Card Average APR',         type:'leading',  category:'credit_cards', unit:'%',               url:'https://fred.stlouisfed.org/series/TERMCBCCALLNS' },
  { id:'fha_delinquency',          label:'FHA Delinquency Rate',            type:'lagging',  category:'residential',  unit:'%',               url:'https://www.hud.gov/hud-partners/single-family-loan-performance' },
  { id:'mortgage_delinquency',     label:'Mortgage Delinquency Rate',       type:'lagging',  category:'residential',  unit:'%',               url:'https://fred.stlouisfed.org/series/DRSFRMACBS' },
  { id:'conventional_delinquency', label:'Conventional Delinquency Rate',   type:'lagging',  category:'residential',  unit:'%',               url:'https://www.fhfa.gov/data/nmdb' },
  { id:'commercial_re_delinquency',label:'Commercial RE Loan Delinquency',  type:'lagging',  category:'commercial',   unit:'%',               url:'https://fred.stlouisfed.org/series/DRCRELEXFACBS' },
  { id:'ci_loan_delinquency',      label:'C&I Loan Delinquency',            type:'lagging',  category:'commercial',   unit:'%',               url:'https://fred.stlouisfed.org/series/DRBLACBS' },
  { id:'auto_delinquency',         label:'Auto Loan Delinquency Rate',      type:'lagging',  category:'auto',         unit:'%',               url:'https://fred.stlouisfed.org/series/DROCLACBS' },
  { id:'cc_delinquency',           label:'Credit Card Delinquency Rate',    type:'lagging',  category:'credit_cards', unit:'%',               url:'https://fred.stlouisfed.org/series/DRCCLACBS' },
  { id:'cc_chargeoff',             label:'Credit Card Charge-Off Rate',     type:'lagging',  category:'credit_cards', unit:'%',               url:'https://fred.stlouisfed.org/series/CORCCACBS' }
];
