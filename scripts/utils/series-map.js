/**
 * Master map of all economic indicators
 *
 * Fields per indicator:
 *   id          - unique key used in JSON output
 *   label       - human-readable name
 *   description - what the data signals
 *   source      - data source name
 *   access      - 'fred_api' | 'scrape' | 'pdf'
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
    source: 'Federal Reserve',
    access: 'scrape',
    type: 'leading',
    importance: 'medium',
    category: 'macro',
    frequency: 'quarterly',
    fredSeries: null,
    unit: '% net tightening',
    url: 'https://www.federalreserve.gov/releases/sloos/'
  },

  // ─── MONTHLY / STOCK MARKET ────────────────────────────────────────────────
  {
    id: 'shiller_cape',
    label: 'Shiller CAPE Ratio',
    description: '10-year inflation-adjusted P/E; high values signal large downside risk',
    source: 'multpl.com',
    access: 'scrape',
    type: 'leading',
    importance: 'high',
    category: 'stock_market',
    frequency: 'monthly',
    fredSeries: null,
    unit: 'ratio',
    url: 'https://www.multpl.com/shiller-pe'
  },
  {
    id: 'buffett_indicator',
    label: 'Buffett Indicator',
    description: 'Market cap vs GDP; extreme readings signal market detached from economy',
    source: 'longtermtrends.net',
    access: 'scrape',
    type: 'leading',
    importance: 'high',
    category: 'stock_market',
    frequency: 'monthly',
    fredSeries: null,
    unit: '%',
    url: 'https://www.longtermtrends.net/market-cap-to-gdp-the-buffett-indicator/'
  },
  {
    id: 'trailing_pe',
    label: 'Trailing P/E (S&P 500)',
    description: 'Current price vs earnings; elevated readings mean little margin of safety',
    source: 'macrotrends.net',
    access: 'scrape',
    type: 'leading',
    importance: 'high',
    category: 'stock_market',
    frequency: 'monthly',
    fredSeries: null,
    unit: 'ratio',
    url: 'https://www.macrotrends.net/2577/sp-500-pe-ratio-price-to-earnings-chart'
  },
  {
    id: 'margin_debt',
    label: 'Margin Debt',
    description: 'Borrowed money in market; sharp drop after peak signals forced selling',
    source: 'FINRA',
    access: 'scrape',
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
    access: 'scrape',
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
    access: 'scrape',
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
    description: 'Market value vs asset replacement cost; above 1 means overpaying for assets',
    source: 'longtermtrends.net',
    access: 'scrape',
    type: 'leading',
    importance: 'low',
    category: 'stock_market',
    frequency: 'monthly',
    fredSeries: null,
    unit: 'ratio',
    url: 'https://www.longtermtrends.net/tobins-q/'
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
    description: 'Low down payment borrower stress; shows strain before prime market does',
    source: 'HUD',
    access: 'pdf',
    type: 'lagging',
    importance: 'medium',
    category: 'residential',
    frequency: 'monthly',
    fredSeries: null,
    unit: '%',
    url: 'https://www.hud.gov/program_offices/housing/rmra/oe/rpts/sfnotes/index'
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
    id: 'foreclosure_rate',
    label: 'Foreclosure Rate',
    description: 'Loans entering foreclosure; measures depth of housing distress',
    source: 'MBA',
    access: 'scrape',
    type: 'lagging',
    importance: 'medium',
    category: 'residential',
    frequency: 'quarterly',
    fredSeries: null,
    unit: '%',
    url: 'https://www.mba.org/news-and-research/research-and-economics/single-family-research/national-delinquency-survey'
  },
  {
    id: 'conventional_delinquency',
    label: 'Conventional Delinquency Rate',
    description: "Fannie/Freddie loan stress; baseline for prime borrower health",
    source: 'FHFA',
    access: 'scrape',
    type: 'lagging',
    importance: 'medium',
    category: 'residential',
    frequency: 'quarterly',
    fredSeries: null,
    unit: '%',
    url: 'https://www.fhfa.gov/data'
  },
  {
    id: 'mba_delinquency',
    label: 'MBA National Delinquency Survey',
    description: 'Industry-wide delinquency across all mortgage loan types',
    source: 'MBA',
    access: 'scrape',
    type: 'lagging',
    importance: 'medium',
    category: 'residential',
    frequency: 'quarterly',
    fredSeries: null,
    unit: '%',
    url: 'https://www.mba.org/news-and-research/research-and-economics/single-family-research/national-delinquency-survey'
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
    description: 'Share of auto loans past due; consumer financial stress signal',
    source: 'FRED',
    access: 'fred_api',
    type: 'lagging',
    importance: 'medium',
    category: 'auto',
    frequency: 'quarterly',
    fredSeries: 'DRCCLACBS',
    unit: '%',
    url: 'https://fred.stlouisfed.org/series/DRCCLACBS'
  },

  // ─── MONTHLY / CREDIT CARDS ────────────────────────────────────────────────
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
