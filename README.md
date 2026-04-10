# Transaction Risk Explorer

An interactive web-based dashboard for fraud analysts to visually investigate payment transaction patterns and identify coordinated fraud activity across Bogota.

## Quick Start

```bash
npm install
npm run dev
```

Open http://localhost:5173 in your browser.

## Tech Stack

- React 18 + TypeScript
- Vite (build tool)
- Recharts (visualizations)
- Tailwind CSS (styling)

## Features

- **Scatter Plot** -- Transactions plotted by time vs. amount, colored by risk score (green/yellow/red)
- **Neighborhood Chart** -- Bar chart showing transaction volume per neighborhood, colored by average risk
- **Hourly Volume Chart** -- Transaction volume by hour with anomaly highlighting
- **Filter Panel** -- Filter by date, risk score, status, amount, neighborhood, card number
- **Fraud Alerts** -- Auto-detected fraud patterns with click-to-highlight
- **Transaction Table** -- Sortable, filterable table with detail modal on click
- **Coordinated Views** -- All charts and table share filter state

## Embedded Fraud Patterns

The synthetic dataset (~1,200 transactions over 5 days) contains three hidden fraud patterns:

1. **Velocity Attack** (Day 3, June 17, 12:00-14:00): ~20 transactions using 3 different cards (7891, 7892, 7893) all delivering to "Calle 85 #15-23" in Suba. Look for the tight horizontal cluster in the scatter plot during lunch hours.

2. **Geographic Cluster** (Day 4, June 18, 18:00-22:00): 28 high-risk transactions concentrated in Chapinero (18) and Usaquen (10). The Neighborhood Chart shows these neighborhoods with red/orange bars. Filter to Day 4 to see the evening spike.

3. **Card Testing** (Day 2, June 16, ~10:00): Card *4532 makes 4 small transactions (15k-45k COP) followed by 2 large ones (210k, 245k COP). Type "4532" in the Card filter to isolate this pattern -- the scatter plot shows the amount escalation.

## Regenerating Test Data

```bash
npx tsx scripts/generate-data.ts
```

## Running Tests

```bash
npm test
```
