/**
 * Master map of all economic indicators
 *
 * Fields per indicator:
 *   id          - unique key used in JSON output
 *   label       - human-readable name
 *   description - what the data signals
 *   source      - data source name
 *   access      - 'fred_api' | 'html_scrape' | 'file_drop' | 'scrape' | 'pdf'
 *                 fred_api    = pulled by api-pull-*.js scripts via FRED API
 *                 html_scrape = pulled by html-scrape-*.js scripts from public HTML pages
 *                 file_drop   = processed by file-drop-*.js scripts from manually dropped files
 *                 scrape      = legacy label, requires fully manual update
 *                 pdf         = requires manual PDF download and data entry
 *   type        - 'leading' | 'lagging'
 *   importance  - 'critical' | 'high' | 'medium' | 'low'
 *   category    - 'macro' | 'stock_market' | 'residential' | 'commercial' | 'auto' | 'credit_cards'
 *   frequency   - 'weekly' | 'monthly' | 'quarterly'
 *   fredSeries  - FRED series ID (null if not from FRED)
 *   unit        - unit label for display
 *   url         - source URL for reference
 */

export const indicators = [

  // ─── WEEKLY / MACRO ────────────────────────────────────────────────────────
  {
    id: 'yield_curve',
    label: 'Yield Curve (2yr vs 10yr)',
    description: 'Banks stop lending profitably when inverted; credit tightening follows',
    source: 'FRED',
    access: 'fred_api',
    type: 'leading',
    importance: 'critical',
    category: 'macro',
    frequency: 'weekly',
    fredSeries: 'T10Y2Y',
    unit: '%',
    url: 'https://fred.stlouisfed.org/series/T10Y2Y'
  },
  {
    id: 'jobless_claims',
    label: 'Initial Jobless Claims',
    description: 'Weekly pace of layoffs; sustained rise signals labor market deteriorating',
    source: 'FRED',
    access: 'fred_api',
    type: 'leading',
    importance: 'high',
    category: 'macro',
    frequency: 'weekly',
    fredSeries: 'ICSA',
    unit: 'thousands',
    url: 'https://fred.stlouisfed.org/series/ICSA'
  },
  {
    id: 'credit_spreads',
    label: 'High-Yield Credit Spreads',
    description: 'Borrowing cost for riskier companies; widening signals credit stress',
    source: 'FRED',
    access: 'fred_api',
    type: 'leading',
    importance: 'high',
    category: 'macro',
    frequency: 'weekly',
    fredSeries: 'BAMLH0A0HYM2',
    unit: '%',
    url: 'https://fred.stlouisfed.org/series/BAMLH0A0HYM2'
  },

  // ─── MONTHLY / MACRO ───────────────────────────────────────────────────────
  {
    id: 'ism_pmi',
    label: 'ISM Manufacturing PMI',
    description: 'Factory order and production health; below 50 signals contraction',
    source: 'FRED',
    access: 'fred_api',
    type: 'leading',
    importance: 'high',
    category: 'macro',
    frequency: 'monthly',
    fredSeries: 'MANEMP',
    unit: 'index',
    url: 'https://fred.stlouisfed.org/series/MANEMP'
  },
  {
    id: 'real_m2',
    label: 'Real M2 Money Supply',
    description: 'Money in circulation adjusted for inflation; shrinking reduces economic fuel',
    source: 'FRED',
    access: 'fred_api',
    type: 'leading',
    importance: 'medium',
    category: 'macro',
    frequency: 'monthly',
    fredSeries: 'M2REAL',
    unit: 'billions USD',
    url: 'https://fred.stlouisfed.org/series/M2REAL'
  },
  {
    id: 'weekly_hours',
    label: 'Avg Weekly Hours Worked',
    description: 'Employers cut hours before headcount; early labor stress signal',
    source: 'FRED',
    access: 'fred_api',
    type: 'leading',
    importance: 'medium',
    category: 'macro',
    frequency: 'monthly',
    fredSeries: 'AWHAETP',
    unit: 'hours',
    url: 'https://fred.stlouisfed.org/series/AWHAETP'
  },
  {
    id: 'durable_goods',
    label: 'Durable Goods Orders',
    description: 'Business investment in equipment; drops signal capex pullback',
    source: 'FRED',
    access: 'fred_api',
    type: 'leading',
    importance: 'medium',
    category: 'macro',
    frequency: 'monthly',
    fredSeries: 'DGORDER',
    unit: 'millions USD',
    url: 'https://fred.stlouisfed.org/series/DGORDER'
  },

  // ─── QUARTERLY / MACRO ─────────────────────────────────────────────────────
  {
    id: 'loan_officer_survey',
    label: 'Senior Loan Officer Survey',
    description: 'Banks tightening lending standards; less credit flowing to economy',
    source: 'FRED',
    access: 'fred_api',
    type: 'leading',
    importance: 'medium',
    category: 'macro',
    frequency: 'quarterly',
    fredSeries: 'DRTSCILM',
    unit: '% net tightening',
    url: 'https://fred.stlouisfed.org/series/DRTSCILM'
  },

  // ─── MONTHLY / STOCK MARKET ────────────────────────────────────────────────
  {
    id: 'shiller_cape',
    label: 'Shiller CAPE Ratio',
    description: '10-year inflation-adjusted P/E; high values signal large downside risk',
    source: 'multpl.com',
    access: 'html_scrape',
    type: 'leading',
    importance: 'high',
    category: 'stock_market',
    frequency: 'monthly',
    fredSeries: null,
    unit: 'ratio',
    url: 'https://www.multpl.com/shiller-pe'
  },
  {
    id: 'trailing_pe',
    label: 'Trailing P/E (S&P 500)',
    description: 'Current price vs earnings; elevated readings mean little margin of safety',
    source: 'multpl.com',
    access: 'html_scrape',
    type: 'leading',
    importance: 'high',
    category: 'stock_market',
    frequency: 'monthly',
    fredSeries: null,
    unit: 'ratio',
    url: 'https://www.multpl.com/s-p-500-pe-ratio'
  },
  {
    id: 'margin_debt',
    label: 'Margin Debt',
    description: 'Borrowed money in market; sharp drop after peak signals forced selling',
    source: 'FINRA',
    access: 'file_drop',
    type: 'leading',
    importance: 'medium',
    category: 'stock_market',
    frequency: 'monthly',
    fredSeries: null,
    unit: 'millions USD',
    url: 'https://www.finra.org/investors/learn-to-invest/advanced-investing/margin-statistics'
  },
  {
    id: 'sp500_dividend_yield',
    label: 'S&P 500 Dividend Yield',
    description: 'Very low yield means premium prices paid with minimal income cushion',
    source: 'multpl.com',
    access: 'html_scrape',
    type: 'leading',
    importance: 'medium',
    category: 'stock_market',
    frequency: 'monthly',
    fredSeries: null,
    unit: '%',
    url: 'https://www.multpl.com/s-p-500-dividend-yield'
  },
  {
    id: 'price_to_sales',
    label: 'Price-to-Sales (S&P 500)',
    description: 'Price vs revenue; harder to manipulate than earnings-based metrics',
    source: 'multpl.com',
    access: 'html_scrape',
    type: 'leading',
    importance: 'medium',
    category: 'stock_market',
    frequency: 'monthly',
    fredSeries: null,
    unit: 'ratio',
    url: 'https://www.multpl.com/s-p-500-price-to-sales'
  },
  {
    id: 'tobins_q',
    label: "Tobin's Q Ratio",
    description: 'Corporate equity market value as % of net worth; above 150% signals overvaluation',
    source: 'FRED',
    access: 'fred_api',
    type: 'leading',
    importance: 'low',
    category: 'stock_market',
    frequency: 'monthly',
    fredSeries: 'NCBCEPNW',
    unit: '%',
    url: 'https://fred.stlouisfed.org/series/NCBCEPNW'
  },

  // ─── MONTHLY / RESIDENTIAL ─────────────────────────────────────────────────
  {
    id: 'housing_starts',
    label: 'Housing Starts & Permits',
    description: 'New construction pipeline; declines signal builder and buyer confidence collapsing',
    source: 'FRED',
    access: 'fred_api',
    type: 'leading',
    importance: 'medium',
    category: 'residential',
    frequency: 'monthly',
    fredSeries: 'HOUST',
    unit: 'thousands of units',
    url: 'https://fred.stlouisfed.org/series/HOUST'
  },
  {
    id: 'fha_delinquency',
    label: 'FHA Delinquency Rate',
    description: 'Serious delinquency (90+ days + foreclosure + bankruptcy) for FHA loans; low-down-payment borrower stress shows up here first',
    source: 'HUD',
    access: 'file_drop',
    type: 'lagging',
    importance: 'medium',
    category: 'residential',
    frequency: 'monthly',
    fredSeries: null,
    unit: '%',
    url: 'https://www.hud.gov/hud-partners/single-family-loan-performance'
  },

  // ─── QUARTERLY / RESIDENTIAL ───────────────────────────────────────────────
  {
    id: 'mortgage_delinquency',
    label: 'Mortgage Delinquency Rate',
    description: 'Share of mortgages past due; rising rates signal homeowner financial stress',
    source: 'FRED',
    access: 'fred_api',
    type: 'lagging',
    importance: 'medium',
    category: 'residential',
    frequency: 'quarterly',
    fredSeries: 'DRSFRMACBS',
    unit: '%',
    url: 'https://fred.stlouisfed.org/series/DRSFRMACBS'
  },
  {
    id: 'conventional_delinquency',
    label: 'Conventional Delinquency Rate',
    description: "Fannie/Freddie loan stress; baseline for prime borrower health",
    source: 'FHFA',
    access: 'file_drop',
    type: 'lagging',
    importance: 'medium',
    category: 'residential',
    frequency: 'quarterly',
    fredSeries: null,
    unit: '%',
    url: 'https://www.fhfa.gov/data/nmdb'
  },

  // ─── QUARTERLY / COMMERCIAL ────────────────────────────────────────────────
  {
    id: 'commercial_re_delinquency',
    label: 'Commercial RE Loan Delinquency',
    description: 'Office, retail, industrial loan defaults; signals commercial property stress',
    source: 'FRED',
    access: 'fred_api',
    type: 'lagging',
    importance: 'medium',
    category: 'commercial',
    frequency: 'quarterly',
    fredSeries: 'DRCRELEXFACBS',
    unit: '%',
    url: 'https://fred.stlouisfed.org/series/DRCRELEXFACBS'
  },
  {
    id: 'ci_loan_delinquency',
    label: 'C&I Loan Delinquency',
    description: 'Business loan defaults; signals corporate financial health deteriorating',
    source: 'FRED',
    access: 'fred_api',
    type: 'lagging',
    importance: 'medium',
    category: 'commercial',
    frequency: 'quarterly',
    fredSeries: 'DRBLACBS',
    unit: '%',
    url: 'https://fred.stlouisfed.org/series/DRBLACBS'
  },

  // ─── MONTHLY / AUTO ────────────────────────────────────────────────────────
  {
    id: 'vehicle_sales',
    label: 'Total Vehicle Sales (SAAR)',
    description: 'Pace of car buying; sharp drops signal consumer pullback on big purchases',
    source: 'FRED',
    access: 'fred_api',
    type: 'leading',
    importance: 'medium',
    category: 'auto',
    frequency: 'monthly',
    fredSeries: 'TOTALSA',
    unit: 'millions of units',
    url: 'https://fred.stlouisfed.org/series/TOTALSA'
  },

  // ─── QUARTERLY / AUTO ──────────────────────────────────────────────────────
  {
    id: 'auto_delinquency',
    label: 'Auto Loan Delinquency Rate',
    description: 'Share of other consumer loans (primarily auto) past due; consumer financial stress signal',
    source: 'FRED',
    access: 'fred_api',
    type: 'lagging',
    importance: 'medium',
    category: 'auto',
    frequency: 'quarterly',
    fredSeries: 'DROCLACBS',
    unit: '%',
    url: 'https://fred.stlouisfed.org/series/DROCLACBS'
  },

  // ─── MONTHLY / CREDIT CARDS ────────────────────────────────────────────────
  {
    id: 'cc_apr',
    label: 'Credit Card Average APR',
    description: 'Average interest rate on all credit card accounts; elevated rates squeeze consumer budgets',
    source: 'FRED',
    access: 'fred_api',
    type: 'leading',
    importance: 'medium',
    category: 'credit_cards',
    frequency: 'monthly',
    fredSeries: 'TERMCBCCALLNS',
    unit: '%',
    url: 'https://fred.stlouisfed.org/series/TERMCBCCALLNS'
  },
  {
    id: 'revolving_credit',
    label: 'Revolving Credit Outstanding',
    description: 'Total card balances; rapid rise signals consumers funding expenses with debt',
    source: 'FRED',
    access: 'fred_api',
    type: 'leading',
    importance: 'medium',
    category: 'credit_cards',
    frequency: 'monthly',
    fredSeries: 'REVOLSL',
    unit: 'millions USD',
    url: 'https://fred.stlouisfed.org/series/REVOLSL'
  },

  // ─── QUARTERLY / CREDIT CARDS ──────────────────────────────────────────────
  {
    id: 'cc_delinquency',
    label: 'Credit Card Delinquency Rate',
    description: 'Share of balances past due; first consumer stress signal before other delinquencies',
    source: 'FRED',
    access: 'fred_api',
    type: 'lagging',
    importance: 'medium',
    category: 'credit_cards',
    frequency: 'quarterly',
    fredSeries: 'DRCCLACBS',
    unit: '%',
    url: 'https://fred.stlouisfed.org/series/DRCCLACBS'
  },
  {
    id: 'cc_chargeoff',
    label: 'Credit Card Charge-Off Rate',
    description: 'Banks writing off bad debt; measures severity of credit card defaults',
    source: 'FRED',
    access: 'fred_api',
    type: 'lagging',
    importance: 'medium',
    category: 'credit_cards',
    frequency: 'quarterly',
    fredSeries: 'CORCCACBS',
    unit: '%',
    url: 'https://fred.stlouisfed.org/series/CORCCACBS'
  }

];

// Convenience filters
export const byFrequency = (freq) => indicators.filter(i => i.frequency === freq);
export const byCategory = (cat) => indicators.filter(i => i.category === cat);
export const byAccess = (access) => indicators.filter(i => i.access === access);
export const fredIndicators = () => indicators.filter(i => i.fredSeries !== null);
