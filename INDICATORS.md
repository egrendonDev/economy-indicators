# Economy Downturn Indicators - Master List

28 indicators across 6 categories. Sorted by importance then token cost within each category.

---

## Macro & Credit

| Indicator | What It Shows | Source | Type | Importance | Access | Token Cost | Refresh | FRED Series |
|---|---|---|---|---|---|---|---|---|
| Yield Curve (2yr vs 10yr) | Banks stop lending profitably when inverted; credit tightening follows | FRED | Leading | Critical | API | ~8,000-12,000 | Weekly | T10Y2Y |
| ISM Manufacturing PMI | Factory order and production health; below 50 signals contraction | FRED | Leading | High | API | ~1,000-2,000 | Monthly | MANEMP |
| Initial Jobless Claims | Weekly pace of layoffs; sustained rise signals labor market deteriorating | FRED | Leading | High | API | ~4,000-6,000 | Weekly | ICSA |
| High-Yield Credit Spreads | Borrowing cost for riskier companies; widening signals credit stress | FRED | Leading | High | API | ~8,000-12,000 | Weekly | BAMLH0A0HYM2 |
| Real M2 Money Supply | Money in circulation adjusted for inflation; shrinking reduces economic fuel | FRED | Leading | Medium | API | ~1,000-2,000 | Monthly | M2REAL |
| Avg Weekly Hours Worked | Employers cut hours before headcount; early labor stress signal | FRED | Leading | Medium | API | ~1,000-2,000 | Monthly | AWHAETP |
| Durable Goods Orders | Business investment in equipment; drops signal capex pullback | FRED | Leading | Medium | API | ~1,000-2,000 | Monthly | DGORDER |
| Senior Loan Officer Survey | Banks tightening lending standards; less credit flowing to economy | Fed | Leading | Medium | Scrape | ~10,000-20,000 | Quarterly | - |

---

## Stock Market

| Indicator | What It Shows | Source | Type | Importance | Access | Token Cost | Refresh | FRED Series |
|---|---|---|---|---|---|---|---|---|
| Shiller CAPE Ratio | 10-year inflation-adjusted P/E; high values signal large downside risk | multpl.com | Leading | High | Scrape | ~8,000-15,000 | Monthly | - |
| Buffett Indicator | Market cap vs GDP; extreme readings signal market detached from economy | longtermtrends.net | Leading | High | Scrape | ~10,000-18,000 | Monthly | - |
| Trailing P/E (S&P 500) | Current price vs earnings; elevated readings mean little margin of safety | macrotrends.net | Leading | High | Scrape | ~15,000-25,000 | Monthly | - |
| Margin Debt | Borrowed money in market; sharp drop after peak signals forced selling | FINRA | Leading | Medium | Scrape | ~8,000-15,000 | Monthly | - |
| S&P 500 Dividend Yield | Very low yield means premium prices paid with minimal income cushion | multpl.com | Leading | Medium | Scrape | ~8,000-15,000 | Monthly | - |
| Price-to-Sales (S&P 500) | Price vs revenue; harder to manipulate than earnings-based metrics | multpl.com | Leading | Medium | Scrape | ~8,000-15,000 | Monthly | - |
| Tobin's Q Ratio | Market value vs asset replacement cost; above 1 means overpaying for assets | longtermtrends.net | Leading | Low | Scrape | ~10,000-18,000 | Monthly | - |

---

## Residential Real Estate

| Indicator | What It Shows | Source | Type | Importance | Access | Token Cost | Refresh | FRED Series |
|---|---|---|---|---|---|---|---|---|
| Housing Starts & Permits | New construction pipeline; declines signal builder and buyer confidence collapsing | FRED | Leading | Medium | API | ~1,000-2,000 | Monthly | HOUST |
| Mortgage Delinquency Rate | Share of mortgages past due; rising rates signal homeowner financial stress | FRED | Lagging | Medium | API | ~1,000-2,000 | Quarterly | DRSFRMACBS |
| Foreclosure Rate | Loans entering foreclosure; measures depth of housing distress | FRED | Lagging | Medium | API | ~1,000-2,000 | Quarterly | QUSRHTSA |
| Conventional Delinquency Rate | Fannie/Freddie loan stress; baseline for prime borrower health | FHFA | Lagging | Medium | Scrape | ~8,000-15,000 | Quarterly | - |
| MBA National Delinquency Survey | Industry-wide delinquency across all mortgage loan types | MBA | Lagging | Medium | Scrape | ~8,000-15,000 | Quarterly | - |
| FHA Delinquency Rate | Low down payment borrower stress; shows strain before prime market does | HUD | Lagging | Medium | PDF | ~15,000-25,000 | Monthly | - |

---

## Commercial Real Estate & Lending

| Indicator | What It Shows | Source | Type | Importance | Access | Token Cost | Refresh | FRED Series |
|---|---|---|---|---|---|---|---|---|
| Commercial RE Loan Delinquency | Office, retail, industrial loan defaults; signals commercial property stress | FRED | Lagging | Medium | API | ~1,000-2,000 | Quarterly | DRCRELEXFACBS |
| C&I Loan Delinquency | Business loan defaults; signals corporate financial health deteriorating | FRED | Lagging | Medium | API | ~1,000-2,000 | Quarterly | DRBLACBS |

---

## Auto

| Indicator | What It Shows | Source | Type | Importance | Access | Token Cost | Refresh | FRED Series |
|---|---|---|---|---|---|---|---|---|
| Total Vehicle Sales (SAAR) | Pace of car buying; sharp drops signal consumer pullback on big purchases | FRED | Leading | Medium | API | ~1,000-2,000 | Monthly | TOTALSA |
| Auto Loan Delinquency Rate | Share of auto loans past due; consumer financial stress signal | FRED | Lagging | Medium | API | ~1,000-2,000 | Quarterly | DRCCLACBS |

---

## Credit Cards

| Indicator | What It Shows | Source | Type | Importance | Access | Token Cost | Refresh | FRED Series |
|---|---|---|---|---|---|---|---|---|
| Credit Card Delinquency Rate | Share of balances past due; first consumer stress signal before other delinquencies | FRED | Lagging* | Medium-High | API | ~1,000-2,000 | Quarterly | DRCCLACBS |
| Revolving Credit Outstanding | Total card balances; rapid rise signals consumers funding expenses with debt | FRED | Leading | Medium | API | ~1,000-2,000 | Monthly | REVOLSL |
| Credit Card Charge-Off Rate | Banks writing off bad debt; measures severity of credit card defaults | FRED | Lagging | Medium | API | ~1,000-2,000 | Quarterly | CORCCACBS |

*Lagging relative to macro but leading relative to other delinquency categories.

---

## Summary

| Category | Total | FRED API | Scrape | PDF | Weekly | Monthly | Quarterly |
|---|---|---|---|---|---|---|---|
| Macro & Credit | 8 | 7 | 1 | 0 | 3 | 4 | 1 |
| Stock Market | 7 | 0 | 7 | 0 | 0 | 7 | 0 |
| Residential | 6 | 3 | 2 | 1 | 0 | 2 | 4 |
| Commercial | 2 | 2 | 0 | 0 | 0 | 0 | 2 |
| Auto | 2 | 2 | 0 | 0 | 0 | 1 | 1 |
| Credit Cards | 3 | 3 | 0 | 0 | 0 | 1 | 2 |
| **Total** | **28** | **17** | **10** | **1** | **3** | **15** | **10** |

---

## Data Sources

- **FRED API**: https://fred.stlouisfed.org - Free API key required
- **multpl.com**: https://www.multpl.com - No API, scraping required
- **longtermtrends.net**: https://www.longtermtrends.net - No API, scraping required
- **macrotrends.net**: https://www.macrotrends.net - No API, scraping required
- **FINRA**: https://www.finra.org - No API, HTML table scraping required
- **HUD**: https://www.hud.gov - PDF parsing required
- **FHFA**: https://www.fhfa.gov - No API, scraping required
- **MBA**: https://www.mba.org - No API, scraping required
- **Federal Reserve**: https://www.federalreserve.gov - No API, scraping required
