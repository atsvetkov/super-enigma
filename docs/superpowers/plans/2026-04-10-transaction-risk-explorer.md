# Transaction Risk Explorer Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build an interactive single-page dashboard that lets fraud analysts visually explore payment transactions and spot fraud patterns across Bogota.

**Architecture:** React SPA with Vite. All data is static JSON generated once by a script. Filter state lives in a custom hook and is shared across all chart components. Fraud detection runs once on load and produces clickable alerts.

**Tech Stack:** React 18, TypeScript, Vite, Recharts, Tailwind CSS, Vitest (for detection logic tests)

---

## File Map

| File | Responsibility |
|---|---|
| `src/types/transaction.ts` | Transaction type + FilterState type + Alert type |
| `scripts/generate-data.ts` | One-time script to produce synthetic dataset |
| `src/data/transactions.json` | Static dataset (~1200 transactions) |
| `src/utils/detection.ts` | Fraud pattern detection functions |
| `src/utils/detection.test.ts` | Tests for detection functions |
| `src/hooks/useFilters.ts` | Filter state management + memoized filtering |
| `src/hooks/useAlerts.ts` | Runs detection on load, returns alerts |
| `src/App.tsx` | Layout shell, wires hooks to components |
| `src/components/SummaryMetrics.tsx` | Top bar with key stats |
| `src/components/FilterPanel.tsx` | Left sidebar with filter controls |
| `src/components/ScatterPlot.tsx` | Main scatter chart (time x amount x risk) |
| `src/components/NeighborhoodChart.tsx` | Horizontal bar chart by neighborhood |
| `src/components/HourlyVolumeChart.tsx` | Bar chart by hour of day |
| `src/components/FraudAlerts.tsx` | Clickable alert list |
| `src/components/TransactionTable.tsx` | Sortable filtered table |
| `src/components/TransactionDetail.tsx` | Modal showing all fields for one transaction |
| `README.md` | Run instructions + fraud pattern docs |

---

### Task 1: Project Scaffolding

**Files:**
- Create: `package.json`, `tsconfig.json`, `vite.config.ts`, `tailwind.config.js`, `postcss.config.js`, `index.html`, `src/main.tsx`, `src/index.css`, `src/App.tsx`

- [ ] **Step 1: Scaffold Vite React-TS project**

```bash
npm create vite@latest . -- --template react-ts
```

Select overwrite if prompted (only README/gitignore conflict).

- [ ] **Step 2: Install dependencies**

```bash
npm install recharts
npm install -D tailwindcss @tailwindcss/vite
```

- [ ] **Step 3: Configure Tailwind**

Replace `src/index.css` with:

```css
@import "tailwindcss";
```

Update `vite.config.ts`:

```ts
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
})
```

- [ ] **Step 4: Create minimal App.tsx**

```tsx
function App() {
  return (
    <div className="min-h-screen bg-gray-950 text-gray-100">
      <h1 className="text-2xl font-bold p-6">Transaction Risk Explorer</h1>
    </div>
  )
}

export default App
```

- [ ] **Step 5: Verify it runs**

```bash
npm run dev
```

Open browser, confirm you see "Transaction Risk Explorer" on dark background.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat: scaffold Vite + React + TypeScript + Tailwind project"
```

---

### Task 2: Type Definitions

**Files:**
- Create: `src/types/transaction.ts`

- [ ] **Step 1: Define Transaction type**

```ts
export interface Transaction {
  id: string;
  timestamp: string;
  customerId: string;
  cardLast4: string;
  amount: number;
  neighborhood: string;
  status: "approved" | "declined" | "under_review";
  riskScore: number;
  deliveryAddress: string;
  deviceId: string;
  paymentMethod: string;
  merchantCategory: string;
}
```

- [ ] **Step 2: Define FilterState type**

```ts
export interface FilterState {
  dateRange: [string, string] | null;
  riskRange: [number, number];
  statuses: Transaction["status"][];
  amountRange: [number, number];
  neighborhoods: string[];
  cardLast4: string;
  highlightedIds: Set<string> | null;
}
```

- [ ] **Step 3: Define Alert type**

```ts
export type AlertType = "velocity" | "geographic_cluster" | "card_testing";

export interface Alert {
  type: AlertType;
  description: string;
  transactionIds: string[];
}
```

- [ ] **Step 4: Commit**

```bash
git add src/types/transaction.ts
git commit -m "feat: add Transaction, FilterState, and Alert type definitions"
```

---

### Task 3: Synthetic Data Generation

**Files:**
- Create: `scripts/generate-data.ts`
- Create: `src/data/transactions.json`

- [ ] **Step 1: Install tsx for running the script**

```bash
npm install -D tsx
```

- [ ] **Step 2: Write the data generation script**

Create `scripts/generate-data.ts`. The script must:

1. Define constants: 12 neighborhoods, 5-day date range starting `2025-06-15`, base hours 7-23.
2. Generate ~1020 normal transactions:
   - `id`: `TXN-NNNNN` sequential
   - `timestamp`: random within 7am-11pm across 5 days, weighted toward lunch (12-14) and dinner (18-21)
   - `customerId`: `CUST-NNNN` from pool of ~200 customers
   - `cardLast4`: 4-digit string from pool of ~300 cards
   - `amount`: normally distributed around 80,000 COP, min 25,000, max 250,000
   - `neighborhood`: random from 12 neighborhoods
   - `status`: 88% approved, 8% declined, 4% under_review
   - `riskScore`: 0-45 (80%), 45-65 (20%)
   - `deliveryAddress`: generated as `"Calle/Carrera {N} #{N}-{N}"` random
   - `deviceId`: `DEV-XXXX` from pool of ~400
   - `paymentMethod`: `"credit_card"`
   - `merchantCategory`: `"grocery"`

3. Generate velocity attack (~20 transactions):
   - Day 3 (`2025-06-17`), 12:00-14:00 window
   - 3 different cards: `"7891"`, `"7892"`, `"7893"`
   - All to same address: `"Calle 85 #15-23"`
   - ~6-7 transactions per card, spread within the 2-hour window
   - Various amounts 40,000-180,000 COP
   - Risk scores 55-85
   - Various customer IDs from a small cluster (`CUST-0901` through `CUST-0905`)
   - Status: mix of approved and under_review

4. Generate geographic cluster (~28 transactions):
   - Day 4 (`2025-06-18`), 18:00-22:00 window
   - Concentrated in `"Chapinero"` (~18) and `"Usaquen"` (~10)
   - High risk scores 70-95
   - Various cards, customers, addresses within those neighborhoods
   - Higher amounts 100,000-250,000 COP
   - Status: mix of approved, declined, under_review

5. Generate card testing pattern (6 transactions):
   - Day 2 (`2025-06-16`), starting at 10:00
   - Card `"4532"`, customer `"CUST-0800"`
   - 4 small transactions: 15,000, 22,000, 35,000, 45,000 COP over 30 minutes
   - 2 large transactions: 210,000 and 245,000 COP, 15 minutes after last small one
   - Risk scores: small ones 25-40, large ones 75-90
   - Neighborhood: `"Teusaquillo"`

6. Combine all, sort by timestamp, write to `src/data/transactions.json`.

```ts
import { writeFileSync, mkdirSync } from "fs";
import { join } from "path";

interface Transaction {
  id: string;
  timestamp: string;
  customerId: string;
  cardLast4: string;
  amount: number;
  neighborhood: string;
  status: "approved" | "declined" | "under_review";
  riskScore: number;
  deliveryAddress: string;
  deviceId: string;
  paymentMethod: string;
  merchantCategory: string;
}

const NEIGHBORHOODS = [
  "Chapinero", "Usaquen", "Suba", "Kennedy", "Teusaquillo",
  "La Candelaria", "Engativa", "Fontibon", "Bosa",
  "Ciudad Bolivar", "Rafael Uribe", "San Cristobal",
];

const BASE_DATE = new Date("2025-06-15T00:00:00");
const DAYS = 5;

function rand(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randFloat(min: number, max: number): number {
  return Math.random() * (max - min) + min;
}

function normalRand(mean: number, stddev: number): number {
  // Box-Muller transform
  const u1 = Math.random();
  const u2 = Math.random();
  const z = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
  return mean + z * stddev;
}

function pad(n: number, len: number): string {
  return String(n).padStart(len, "0");
}

function randomTimestamp(day: number, hourMin: number, hourMax: number): string {
  const date = new Date(BASE_DATE);
  date.setDate(date.getDate() + day);

  // Weight toward lunch (12-14) and dinner (18-21)
  let hour: number;
  const r = Math.random();
  if (r < 0.3) {
    hour = rand(12, 13); // lunch
  } else if (r < 0.6) {
    hour = rand(18, 20); // dinner
  } else {
    hour = rand(hourMin, hourMax);
  }

  date.setHours(hour, rand(0, 59), rand(0, 59));
  return date.toISOString();
}

function randomAddress(): string {
  const type = Math.random() > 0.5 ? "Calle" : "Carrera";
  return `${type} ${rand(1, 170)} #${rand(1, 99)}-${rand(1, 99)}`;
}

function randomStatus(): Transaction["status"] {
  const r = Math.random();
  if (r < 0.88) return "approved";
  if (r < 0.96) return "declined";
  return "under_review";
}

function randomRiskScore(): number {
  if (Math.random() < 0.8) return rand(0, 45);
  return rand(45, 65);
}

let txnCounter = 1;

function makeTxn(overrides: Partial<Transaction> & { timestamp: string }): Transaction {
  const id = `TXN-${pad(txnCounter++, 5)}`;
  return {
    id,
    timestamp: overrides.timestamp,
    customerId: overrides.customerId ?? `CUST-${pad(rand(1, 200), 4)}`,
    cardLast4: overrides.cardLast4 ?? pad(rand(1000, 9999), 4),
    amount: overrides.amount ?? Math.round(Math.max(25000, Math.min(250000, normalRand(80000, 35000)))),
    neighborhood: overrides.neighborhood ?? NEIGHBORHOODS[rand(0, NEIGHBORHOODS.length - 1)],
    status: overrides.status ?? randomStatus(),
    riskScore: overrides.riskScore ?? randomRiskScore(),
    deliveryAddress: overrides.deliveryAddress ?? randomAddress(),
    deviceId: overrides.deviceId ?? `DEV-${pad(rand(1, 400), 4)}`,
    paymentMethod: overrides.paymentMethod ?? "credit_card",
    merchantCategory: overrides.merchantCategory ?? "grocery",
  };
}

const transactions: Transaction[] = [];

// --- Normal transactions (~1020) ---
for (let i = 0; i < 1020; i++) {
  const day = rand(0, DAYS - 1);
  transactions.push(makeTxn({ timestamp: randomTimestamp(day, 7, 22) }));
}

// --- Velocity attack: Day 3, 12:00-14:00, same address ---
const velocityCards = ["7891", "7892", "7893"];
const velocityAddress = "Calle 85 #15-23";
for (const card of velocityCards) {
  const numTxns = rand(6, 7);
  for (let i = 0; i < numTxns; i++) {
    const date = new Date("2025-06-17T12:00:00");
    date.setMinutes(date.getMinutes() + rand(0, 119));
    date.setSeconds(rand(0, 59));
    transactions.push(makeTxn({
      timestamp: date.toISOString(),
      cardLast4: card,
      deliveryAddress: velocityAddress,
      customerId: `CUST-${pad(rand(901, 905), 4)}`,
      amount: rand(40000, 180000),
      riskScore: rand(55, 85),
      status: Math.random() < 0.6 ? "approved" : "under_review",
      neighborhood: "Suba",
    }));
  }
}

// --- Geographic cluster: Day 4, 18:00-22:00, Chapinero + Usaquen ---
for (let i = 0; i < 18; i++) {
  const date = new Date("2025-06-18T18:00:00");
  date.setMinutes(date.getMinutes() + rand(0, 239));
  date.setSeconds(rand(0, 59));
  transactions.push(makeTxn({
    timestamp: date.toISOString(),
    neighborhood: "Chapinero",
    riskScore: rand(70, 95),
    amount: rand(100000, 250000),
    status: ["approved", "declined", "under_review"][rand(0, 2)] as Transaction["status"],
  }));
}
for (let i = 0; i < 10; i++) {
  const date = new Date("2025-06-18T18:00:00");
  date.setMinutes(date.getMinutes() + rand(0, 239));
  date.setSeconds(rand(0, 59));
  transactions.push(makeTxn({
    timestamp: date.toISOString(),
    neighborhood: "Usaquen",
    riskScore: rand(70, 95),
    amount: rand(100000, 250000),
    status: ["approved", "declined", "under_review"][rand(0, 2)] as Transaction["status"],
  }));
}

// --- Card testing: Day 2, card 4532 ---
const cardTestBase = new Date("2025-06-16T10:00:00");
const smallAmounts = [15000, 22000, 35000, 45000];
for (let i = 0; i < 4; i++) {
  const date = new Date(cardTestBase);
  date.setMinutes(date.getMinutes() + i * 8 + rand(0, 3));
  transactions.push(makeTxn({
    timestamp: date.toISOString(),
    cardLast4: "4532",
    customerId: "CUST-0800",
    amount: smallAmounts[i],
    riskScore: rand(25, 40),
    neighborhood: "Teusaquillo",
    status: "approved",
  }));
}
const largeAmounts = [210000, 245000];
for (let i = 0; i < 2; i++) {
  const date = new Date(cardTestBase);
  date.setMinutes(date.getMinutes() + 45 + i * 5 + rand(0, 3));
  transactions.push(makeTxn({
    timestamp: date.toISOString(),
    cardLast4: "4532",
    customerId: "CUST-0800",
    amount: largeAmounts[i],
    riskScore: rand(75, 90),
    neighborhood: "Teusaquillo",
    status: i === 0 ? "approved" : "declined",
  }));
}

// Sort by timestamp
transactions.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

// Write output
const outDir = join(import.meta.dirname, "..", "src", "data");
mkdirSync(outDir, { recursive: true });
writeFileSync(join(outDir, "transactions.json"), JSON.stringify(transactions, null, 2));

console.log(`Generated ${transactions.length} transactions`);
console.log(`  Velocity attack: ${velocityCards.length} cards -> ${velocityAddress}`);
console.log(`  Geographic cluster: 28 txns in Chapinero/Usaquen`);
console.log(`  Card testing: card *4532, ${smallAmounts.length} small + ${largeAmounts.length} large`);
```

- [ ] **Step 3: Run the generation script**

```bash
npx tsx scripts/generate-data.ts
```

Expected output: `Generated 1074 transactions` (approximately -- depends on velocity rand).

- [ ] **Step 4: Verify the output file exists and has correct structure**

```bash
node -e "const d = require('./src/data/transactions.json'); console.log('Count:', d.length); console.log('Sample:', JSON.stringify(d[0], null, 2));"
```

Confirm count is ~1074 and the sample has all expected fields.

- [ ] **Step 5: Commit**

```bash
git add scripts/generate-data.ts src/data/transactions.json
git commit -m "feat: add data generation script and synthetic transaction dataset"
```

---

### Task 4: Detection Utilities (TDD)

**Files:**
- Create: `src/utils/detection.ts`
- Create: `src/utils/detection.test.ts`

- [ ] **Step 1: Install vitest**

```bash
npm install -D vitest
```

Add to `package.json` scripts:

```json
"test": "vitest run",
"test:watch": "vitest"
```

- [ ] **Step 2: Write failing tests for detectVelocity**

Create `src/utils/detection.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { detectVelocity, detectGeographicClusters, detectCardTesting } from "./detection";
import type { Transaction } from "../types/transaction";

function makeTxn(overrides: Partial<Transaction>): Transaction {
  return {
    id: "TXN-00001",
    timestamp: "2025-06-17T12:00:00.000Z",
    customerId: "CUST-0001",
    cardLast4: "1234",
    amount: 50000,
    neighborhood: "Chapinero",
    status: "approved",
    riskScore: 30,
    deliveryAddress: "Calle 10 #5-20",
    deviceId: "DEV-0001",
    paymentMethod: "credit_card",
    merchantCategory: "grocery",
    ...overrides,
  };
}

describe("detectVelocity", () => {
  it("detects >5 transactions to same address within 2 hours", () => {
    const txns: Transaction[] = [];
    // 6 transactions to same address within 1 hour
    for (let i = 0; i < 6; i++) {
      const date = new Date("2025-06-17T12:00:00Z");
      date.setMinutes(date.getMinutes() + i * 10);
      txns.push(makeTxn({
        id: `TXN-${i}`,
        timestamp: date.toISOString(),
        deliveryAddress: "Calle 85 #15-23",
        cardLast4: String(1000 + i),
      }));
    }
    // 2 unrelated transactions
    txns.push(makeTxn({ id: "TXN-99", deliveryAddress: "Calle 1 #1-1", timestamp: "2025-06-17T12:00:00Z" }));
    txns.push(makeTxn({ id: "TXN-98", deliveryAddress: "Calle 2 #2-2", timestamp: "2025-06-17T12:00:00Z" }));

    const alerts = detectVelocity(txns);
    expect(alerts.length).toBe(1);
    expect(alerts[0].type).toBe("velocity");
    expect(alerts[0].transactionIds.length).toBe(6);
  });

  it("returns empty when no velocity pattern exists", () => {
    const txns = [
      makeTxn({ id: "TXN-1", deliveryAddress: "Addr A", timestamp: "2025-06-17T12:00:00Z" }),
      makeTxn({ id: "TXN-2", deliveryAddress: "Addr B", timestamp: "2025-06-17T12:00:00Z" }),
    ];
    expect(detectVelocity(txns)).toEqual([]);
  });
});

describe("detectGeographicClusters", () => {
  it("detects neighborhood with >15 high-risk txns in 4-hour window", () => {
    const txns: Transaction[] = [];
    for (let i = 0; i < 18; i++) {
      const date = new Date("2025-06-18T18:00:00Z");
      date.setMinutes(date.getMinutes() + i * 12);
      txns.push(makeTxn({
        id: `TXN-${i}`,
        timestamp: date.toISOString(),
        neighborhood: "Chapinero",
        riskScore: 80,
      }));
    }
    // Low-risk noise in same neighborhood
    txns.push(makeTxn({ id: "TXN-99", neighborhood: "Chapinero", riskScore: 20, timestamp: "2025-06-18T19:00:00Z" }));

    const alerts = detectGeographicClusters(txns);
    expect(alerts.length).toBe(1);
    expect(alerts[0].type).toBe("geographic_cluster");
    expect(alerts[0].transactionIds.length).toBe(18);
  });

  it("returns empty when no cluster exists", () => {
    const txns = [
      makeTxn({ id: "TXN-1", neighborhood: "Chapinero", riskScore: 80, timestamp: "2025-06-18T18:00:00Z" }),
      makeTxn({ id: "TXN-2", neighborhood: "Suba", riskScore: 80, timestamp: "2025-06-18T18:00:00Z" }),
    ];
    expect(detectGeographicClusters(txns)).toEqual([]);
  });
});

describe("detectCardTesting", () => {
  it("detects small transactions followed by large ones on same card", () => {
    const base = new Date("2025-06-16T10:00:00Z");
    const txns: Transaction[] = [];
    // 3 small transactions
    for (let i = 0; i < 3; i++) {
      const date = new Date(base);
      date.setMinutes(date.getMinutes() + i * 8);
      txns.push(makeTxn({
        id: `TXN-${i}`,
        timestamp: date.toISOString(),
        cardLast4: "4532",
        amount: 20000 + i * 5000,
      }));
    }
    // 1 large transaction after
    const largDate = new Date(base);
    largDate.setMinutes(largDate.getMinutes() + 40);
    txns.push(makeTxn({
      id: "TXN-LARGE",
      timestamp: largDate.toISOString(),
      cardLast4: "4532",
      amount: 210000,
    }));

    const alerts = detectCardTesting(txns);
    expect(alerts.length).toBe(1);
    expect(alerts[0].type).toBe("card_testing");
    expect(alerts[0].transactionIds.length).toBe(4);
  });

  it("returns empty when no card testing pattern exists", () => {
    const txns = [
      makeTxn({ id: "TXN-1", cardLast4: "4532", amount: 80000, timestamp: "2025-06-16T10:00:00Z" }),
      makeTxn({ id: "TXN-2", cardLast4: "4532", amount: 90000, timestamp: "2025-06-16T10:30:00Z" }),
    ];
    expect(detectCardTesting(txns)).toEqual([]);
  });
});
```

- [ ] **Step 3: Run tests to verify they fail**

```bash
npm test
```

Expected: all tests fail (module not found).

- [ ] **Step 4: Implement detection functions**

Create `src/utils/detection.ts`:

```ts
import type { Transaction } from "../types/transaction";
import type { Alert } from "../types/transaction";

export function detectVelocity(transactions: Transaction[]): Alert[] {
  const alerts: Alert[] = [];
  const byAddress = new Map<string, Transaction[]>();

  for (const txn of transactions) {
    const group = byAddress.get(txn.deliveryAddress) ?? [];
    group.push(txn);
    byAddress.set(txn.deliveryAddress, group);
  }

  for (const [address, txns] of byAddress) {
    if (txns.length < 6) continue;

    // Sort by time
    const sorted = [...txns].sort(
      (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
    );

    // Sliding window: find clusters within 2 hours
    let start = 0;
    for (let end = 0; end < sorted.length; end++) {
      const endTime = new Date(sorted[end].timestamp).getTime();
      const startTime = new Date(sorted[start].timestamp).getTime();
      if (endTime - startTime > 2 * 60 * 60 * 1000) {
        start++;
        end--; // re-check this end with new start
        continue;
      }
      const windowSize = end - start + 1;
      if (windowSize >= 6) {
        const ids = sorted.slice(start, end + 1).map((t) => t.id);
        const uniqueCards = new Set(sorted.slice(start, end + 1).map((t) => t.cardLast4)).size;
        alerts.push({
          type: "velocity",
          description: `${windowSize} transactions to "${address}" in <2hrs (${uniqueCards} cards)`,
          transactionIds: ids,
        });
        // Skip past this cluster to avoid overlapping alerts
        start = end + 1;
        break;
      }
    }
  }

  return alerts;
}

export function detectGeographicClusters(transactions: Transaction[]): Alert[] {
  const alerts: Alert[] = [];
  const highRisk = transactions.filter((t) => t.riskScore >= 70);
  const byNeighborhood = new Map<string, Transaction[]>();

  for (const txn of highRisk) {
    const group = byNeighborhood.get(txn.neighborhood) ?? [];
    group.push(txn);
    byNeighborhood.set(txn.neighborhood, group);
  }

  for (const [neighborhood, txns] of byNeighborhood) {
    if (txns.length < 16) continue;

    const sorted = [...txns].sort(
      (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
    );

    // Sliding window: find clusters within 4 hours
    let start = 0;
    for (let end = 0; end < sorted.length; end++) {
      const endTime = new Date(sorted[end].timestamp).getTime();
      const startTime = new Date(sorted[start].timestamp).getTime();
      if (endTime - startTime > 4 * 60 * 60 * 1000) {
        start++;
        end--;
        continue;
      }
      const windowSize = end - start + 1;
      if (windowSize >= 16) {
        const ids = sorted.slice(start, end + 1).map((t) => t.id);
        alerts.push({
          type: "geographic_cluster",
          description: `${windowSize} high-risk transactions in ${neighborhood} within 4hrs`,
          transactionIds: ids,
        });
        start = end + 1;
        break;
      }
    }
  }

  return alerts;
}

export function detectCardTesting(transactions: Transaction[]): Alert[] {
  const alerts: Alert[] = [];
  const byCard = new Map<string, Transaction[]>();

  for (const txn of transactions) {
    const group = byCard.get(txn.cardLast4) ?? [];
    group.push(txn);
    byCard.set(txn.cardLast4, group);
  }

  const SMALL_THRESHOLD = 50000;
  const LARGE_THRESHOLD = 200000;
  const WINDOW_MS = 60 * 60 * 1000; // 1 hour

  for (const [card, txns] of byCard) {
    if (txns.length < 4) continue;

    const sorted = [...txns].sort(
      (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
    );

    // Look for 3+ small transactions followed by 1+ large within 1 hour total
    for (let i = 0; i < sorted.length - 3; i++) {
      const windowStart = new Date(sorted[i].timestamp).getTime();
      let smallCount = 0;
      let largeCount = 0;
      const ids: string[] = [];
      let lastSmallIdx = -1;

      for (let j = i; j < sorted.length; j++) {
        const t = new Date(sorted[j].timestamp).getTime();
        if (t - windowStart > WINDOW_MS) break;

        if (sorted[j].amount < SMALL_THRESHOLD) {
          smallCount++;
          lastSmallIdx = j;
          ids.push(sorted[j].id);
        }
      }

      if (smallCount < 3 || lastSmallIdx === -1) continue;

      // Check for large transactions after the last small one
      const lastSmallTime = new Date(sorted[lastSmallIdx].timestamp).getTime();
      for (let j = lastSmallIdx + 1; j < sorted.length; j++) {
        const t = new Date(sorted[j].timestamp).getTime();
        if (t - windowStart > WINDOW_MS) break;
        if (sorted[j].amount >= LARGE_THRESHOLD) {
          largeCount++;
          ids.push(sorted[j].id);
        }
      }

      if (largeCount >= 1) {
        alerts.push({
          type: "card_testing",
          description: `Card *${card}: ${smallCount} small + ${largeCount} large transactions in <1hr`,
          transactionIds: ids,
        });
        break; // one alert per card
      }
    }
  }

  return alerts;
}
```

- [ ] **Step 5: Run tests to verify they pass**

```bash
npm test
```

Expected: all 6 tests pass.

- [ ] **Step 6: Commit**

```bash
git add src/utils/detection.ts src/utils/detection.test.ts package.json
git commit -m "feat: add fraud detection utilities with tests (velocity, geographic, card testing)"
```

---

### Task 5: useFilters Hook

**Files:**
- Create: `src/hooks/useFilters.ts`

- [ ] **Step 1: Implement useFilters**

```ts
import { useState, useMemo, useCallback } from "react";
import type { Transaction, FilterState } from "../types/transaction";

const DEFAULT_FILTERS: FilterState = {
  dateRange: null,
  riskRange: [0, 100],
  statuses: ["approved", "declined", "under_review"],
  amountRange: [0, 300000],
  neighborhoods: [],
  cardLast4: "",
  highlightedIds: null,
};

export function useFilters(transactions: Transaction[]) {
  const [filters, setFilters] = useState<FilterState>(DEFAULT_FILTERS);

  const setFilter = useCallback(
    <K extends keyof FilterState>(key: K, value: FilterState[K]) => {
      setFilters((prev) => ({ ...prev, [key]: value }));
    },
    []
  );

  const resetFilters = useCallback(() => {
    setFilters(DEFAULT_FILTERS);
  }, []);

  const filteredTransactions = useMemo(() => {
    return transactions.filter((txn) => {
      // Date range
      if (filters.dateRange) {
        const t = txn.timestamp;
        if (t < filters.dateRange[0] || t > filters.dateRange[1]) return false;
      }

      // Risk range
      if (txn.riskScore < filters.riskRange[0] || txn.riskScore > filters.riskRange[1]) {
        return false;
      }

      // Status
      if (!filters.statuses.includes(txn.status)) return false;

      // Amount range
      if (txn.amount < filters.amountRange[0] || txn.amount > filters.amountRange[1]) {
        return false;
      }

      // Neighborhoods
      if (filters.neighborhoods.length > 0 && !filters.neighborhoods.includes(txn.neighborhood)) {
        return false;
      }

      // Card last 4
      if (filters.cardLast4 && txn.cardLast4 !== filters.cardLast4) {
        return false;
      }

      return true;
    });
  }, [transactions, filters]);

  return { filters, setFilter, resetFilters, filteredTransactions };
}
```

- [ ] **Step 2: Commit**

```bash
git add src/hooks/useFilters.ts
git commit -m "feat: add useFilters hook for coordinated filter state"
```

---

### Task 6: useAlerts Hook

**Files:**
- Create: `src/hooks/useAlerts.ts`

- [ ] **Step 1: Implement useAlerts**

```ts
import { useMemo } from "react";
import type { Transaction, Alert } from "../types/transaction";
import { detectVelocity, detectGeographicClusters, detectCardTesting } from "../utils/detection";

export function useAlerts(transactions: Transaction[]): Alert[] {
  return useMemo(() => {
    return [
      ...detectVelocity(transactions),
      ...detectGeographicClusters(transactions),
      ...detectCardTesting(transactions),
    ];
  }, [transactions]);
}
```

- [ ] **Step 2: Commit**

```bash
git add src/hooks/useAlerts.ts
git commit -m "feat: add useAlerts hook combining all fraud detection"
```

---

### Task 7: App Shell + SummaryMetrics

**Files:**
- Modify: `src/App.tsx`
- Create: `src/components/SummaryMetrics.tsx`

- [ ] **Step 1: Create SummaryMetrics component**

```tsx
import type { Transaction } from "../types/transaction";

interface Props {
  filtered: Transaction[];
  total: number;
}

export function SummaryMetrics({ filtered, total }: Props) {
  const avgRisk = filtered.length
    ? Math.round(filtered.reduce((sum, t) => sum + t.riskScore, 0) / filtered.length)
    : 0;

  const declineRate = filtered.length
    ? ((filtered.filter((t) => t.status === "declined").length / filtered.length) * 100).toFixed(1)
    : "0.0";

  const highRiskCount = filtered.filter((t) => t.riskScore > 70).length;

  return (
    <div className="flex gap-6 flex-wrap">
      <Stat label="Transactions" value={`${filtered.length.toLocaleString()} / ${total.toLocaleString()}`} />
      <Stat label="Avg Risk Score" value={String(avgRisk)} highlight={avgRisk > 50} />
      <Stat label="Decline Rate" value={`${declineRate}%`} />
      <Stat label="High Risk (>70)" value={String(highRiskCount)} highlight={highRiskCount > 10} />
    </div>
  );
}

function Stat({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className="bg-gray-800 rounded-lg px-4 py-3 min-w-[140px]">
      <div className="text-xs text-gray-400 uppercase tracking-wide">{label}</div>
      <div className={`text-xl font-semibold mt-1 ${highlight ? "text-red-400" : "text-gray-100"}`}>
        {value}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Wire up App.tsx with data loading and layout shell**

```tsx
import { useMemo } from "react";
import transactionData from "./data/transactions.json";
import type { Transaction } from "./types/transaction";
import { useFilters } from "./hooks/useFilters";
import { useAlerts } from "./hooks/useAlerts";
import { SummaryMetrics } from "./components/SummaryMetrics";

const transactions: Transaction[] = transactionData as Transaction[];

function App() {
  const { filters, setFilter, resetFilters, filteredTransactions } = useFilters(transactions);
  const alerts = useAlerts(transactions);

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100">
      {/* Header */}
      <header className="border-b border-gray-800 px-6 py-4">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-bold tracking-tight">Transaction Risk Explorer</h1>
          <SummaryMetrics filtered={filteredTransactions} total={transactions.length} />
        </div>
      </header>

      {/* Body */}
      <div className="flex">
        {/* Sidebar - filters + alerts */}
        <aside className="w-72 shrink-0 border-r border-gray-800 p-4 overflow-y-auto h-[calc(100vh-65px)]">
          <p className="text-sm text-gray-500">Filters will go here</p>
        </aside>

        {/* Main content */}
        <main className="flex-1 p-4 overflow-y-auto h-[calc(100vh-65px)]">
          <p className="text-sm text-gray-500">Charts will go here</p>
        </main>
      </div>
    </div>
  );
}

export default App;
```

- [ ] **Step 3: Verify it runs**

```bash
npm run dev
```

Confirm: header with "Transaction Risk Explorer", summary metrics showing numbers, sidebar placeholder, main area placeholder.

- [ ] **Step 4: Commit**

```bash
git add src/App.tsx src/components/SummaryMetrics.tsx
git commit -m "feat: add App shell layout with SummaryMetrics"
```

---

### Task 8: FilterPanel

**Files:**
- Create: `src/components/FilterPanel.tsx`
- Modify: `src/App.tsx`

- [ ] **Step 1: Create FilterPanel component**

```tsx
import type { FilterState, Transaction } from "../types/transaction";

interface Props {
  filters: FilterState;
  setFilter: <K extends keyof FilterState>(key: K, value: FilterState[K]) => void;
  resetFilters: () => void;
  transactions: Transaction[];
}

const ALL_STATUSES: Transaction["status"][] = ["approved", "declined", "under_review"];

export function FilterPanel({ filters, setFilter, resetFilters, transactions }: Props) {
  // Derive available neighborhoods from data
  const neighborhoods = [...new Set(transactions.map((t) => t.neighborhood))].sort();

  // Derive date range from data
  const dates = transactions.map((t) => t.timestamp.slice(0, 10));
  const uniqueDates = [...new Set(dates)].sort();

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-400">Filters</h2>
        <button
          onClick={resetFilters}
          className="text-xs text-blue-400 hover:text-blue-300"
        >
          Reset
        </button>
      </div>

      {/* Date Range */}
      <FilterSection label="Date Range">
        <select
          value={filters.dateRange?.[0]?.slice(0, 10) ?? ""}
          onChange={(e) => {
            const start = e.target.value;
            if (!start) {
              setFilter("dateRange", null);
            } else {
              const end = filters.dateRange?.[1] ?? `${uniqueDates[uniqueDates.length - 1]}T23:59:59`;
              setFilter("dateRange", [`${start}T00:00:00`, end]);
            }
          }}
          className="w-full bg-gray-800 border border-gray-700 rounded px-2 py-1.5 text-sm"
        >
          <option value="">All dates</option>
          {uniqueDates.map((d) => (
            <option key={d} value={d}>{d}</option>
          ))}
        </select>
        <select
          value={filters.dateRange?.[1]?.slice(0, 10) ?? ""}
          onChange={(e) => {
            const end = e.target.value;
            if (!end) {
              setFilter("dateRange", null);
            } else {
              const start = filters.dateRange?.[0] ?? `${uniqueDates[0]}T00:00:00`;
              setFilter("dateRange", [start, `${end}T23:59:59`]);
            }
          }}
          className="w-full bg-gray-800 border border-gray-700 rounded px-2 py-1.5 text-sm mt-1"
        >
          <option value="">All dates</option>
          {uniqueDates.map((d) => (
            <option key={d} value={d}>{d}</option>
          ))}
        </select>
      </FilterSection>

      {/* Risk Score Range */}
      <FilterSection label={`Risk Score: ${filters.riskRange[0]} - ${filters.riskRange[1]}`}>
        <input
          type="range"
          min={0}
          max={100}
          value={filters.riskRange[0]}
          onChange={(e) => setFilter("riskRange", [Number(e.target.value), filters.riskRange[1]])}
          className="w-full"
        />
        <input
          type="range"
          min={0}
          max={100}
          value={filters.riskRange[1]}
          onChange={(e) => setFilter("riskRange", [filters.riskRange[0], Number(e.target.value)])}
          className="w-full"
        />
      </FilterSection>

      {/* Status */}
      <FilterSection label="Status">
        {ALL_STATUSES.map((status) => (
          <label key={status} className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={filters.statuses.includes(status)}
              onChange={(e) => {
                const next = e.target.checked
                  ? [...filters.statuses, status]
                  : filters.statuses.filter((s) => s !== status);
                setFilter("statuses", next);
              }}
              className="rounded"
            />
            <span className="capitalize">{status.replace("_", " ")}</span>
          </label>
        ))}
      </FilterSection>

      {/* Amount Range */}
      <FilterSection label={`Amount: ${filters.amountRange[0].toLocaleString()} - ${filters.amountRange[1].toLocaleString()} COP`}>
        <input
          type="range"
          min={0}
          max={300000}
          step={5000}
          value={filters.amountRange[0]}
          onChange={(e) => setFilter("amountRange", [Number(e.target.value), filters.amountRange[1]])}
          className="w-full"
        />
        <input
          type="range"
          min={0}
          max={300000}
          step={5000}
          value={filters.amountRange[1]}
          onChange={(e) => setFilter("amountRange", [filters.amountRange[0], Number(e.target.value)])}
          className="w-full"
        />
      </FilterSection>

      {/* Neighborhood */}
      <FilterSection label="Neighborhood">
        <select
          multiple
          value={filters.neighborhoods}
          onChange={(e) => {
            const selected = Array.from(e.target.selectedOptions, (o) => o.value);
            setFilter("neighborhoods", selected);
          }}
          className="w-full bg-gray-800 border border-gray-700 rounded px-2 py-1.5 text-sm h-28"
        >
          {neighborhoods.map((n) => (
            <option key={n} value={n}>{n}</option>
          ))}
        </select>
        {filters.neighborhoods.length > 0 && (
          <button
            onClick={() => setFilter("neighborhoods", [])}
            className="text-xs text-blue-400 hover:text-blue-300 mt-1"
          >
            Clear
          </button>
        )}
      </FilterSection>

      {/* Card Last 4 */}
      <FilterSection label="Card Last 4">
        <input
          type="text"
          maxLength={4}
          placeholder="e.g. 4532"
          value={filters.cardLast4}
          onChange={(e) => setFilter("cardLast4", e.target.value.replace(/\D/g, ""))}
          className="w-full bg-gray-800 border border-gray-700 rounded px-2 py-1.5 text-sm"
        />
      </FilterSection>
    </div>
  );
}

function FilterSection({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs text-gray-400 mb-1.5">{label}</label>
      {children}
    </div>
  );
}
```

- [ ] **Step 2: Wire FilterPanel into App.tsx**

In `App.tsx`, replace the sidebar placeholder:

```tsx
import { FilterPanel } from "./components/FilterPanel";
```

Replace `<p className="text-sm text-gray-500">Filters will go here</p>` with:

```tsx
<FilterPanel
  filters={filters}
  setFilter={setFilter}
  resetFilters={resetFilters}
  transactions={transactions}
/>
```

- [ ] **Step 3: Verify it runs**

```bash
npm run dev
```

Confirm: sidebar shows all filter controls. Adjust sliders, check/uncheck statuses, select neighborhoods. Summary metrics should update as filters change.

- [ ] **Step 4: Commit**

```bash
git add src/components/FilterPanel.tsx src/App.tsx
git commit -m "feat: add FilterPanel with all filter controls"
```

---

### Task 9: ScatterPlot

**Files:**
- Create: `src/components/ScatterPlot.tsx`
- Modify: `src/App.tsx`

- [ ] **Step 1: Create ScatterPlot component**

```tsx
import {
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
  ReferenceArea,
} from "recharts";
import { useState, useCallback } from "react";
import type { Transaction } from "../types/transaction";

interface Props {
  transactions: Transaction[];
  onSelect: (txn: Transaction) => void;
}

function riskColor(score: number): string {
  if (score <= 40) return "#22c55e"; // green
  if (score <= 70) return "#eab308"; // yellow
  return "#ef4444"; // red
}

function formatAmount(value: number): string {
  return `${(value / 1000).toFixed(0)}k`;
}

export function ScatterPlot({ transactions, onSelect }: Props) {
  const data = transactions.map((t) => ({
    x: new Date(t.timestamp).getTime(),
    y: t.amount,
    ...t,
  }));

  const CustomTooltip = ({ active, payload }: any) => {
    if (!active || !payload?.[0]) return null;
    const t = payload[0].payload as Transaction & { x: number; y: number };
    return (
      <div className="bg-gray-800 border border-gray-700 rounded p-2 text-xs shadow-lg">
        <div className="font-semibold">{t.id}</div>
        <div>Amount: {t.amount.toLocaleString()} COP</div>
        <div>Risk: {t.riskScore}</div>
        <div>Card: *{t.cardLast4}</div>
        <div>{t.neighborhood}</div>
        <div>{new Date(t.timestamp).toLocaleString()}</div>
      </div>
    );
  };

  return (
    <div className="bg-gray-900 rounded-lg p-4">
      <h3 className="text-sm font-semibold text-gray-400 mb-3">
        Transactions: Time vs Amount (color = risk)
      </h3>
      <ResponsiveContainer width="100%" height={350}>
        <ScatterChart margin={{ top: 10, right: 20, bottom: 10, left: 10 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
          <XAxis
            dataKey="x"
            type="number"
            domain={["dataMin", "dataMax"]}
            tickFormatter={(v) => new Date(v).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
            stroke="#6b7280"
            fontSize={11}
            name="Time"
          />
          <YAxis
            dataKey="y"
            type="number"
            tickFormatter={formatAmount}
            stroke="#6b7280"
            fontSize={11}
            name="Amount"
            unit=" COP"
          />
          <Tooltip content={<CustomTooltip />} />
          <Scatter data={data} onClick={(point: any) => onSelect(point)} cursor="pointer">
            {data.map((entry, i) => (
              <Cell key={entry.id} fill={riskColor(entry.riskScore)} fillOpacity={0.7} r={3} />
            ))}
          </Scatter>
        </ScatterChart>
      </ResponsiveContainer>
      <div className="flex gap-4 mt-2 text-xs text-gray-500 justify-center">
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-green-500 inline-block" /> Low (0-40)</span>
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-yellow-500 inline-block" /> Medium (41-70)</span>
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-red-500 inline-block" /> High (71-100)</span>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Add ScatterPlot to App.tsx**

Import and add to main content area, replacing the placeholder:

```tsx
import { ScatterPlot } from "./components/ScatterPlot";
```

Add state for selected transaction:

```tsx
const [selectedTxn, setSelectedTxn] = useState<Transaction | null>(null);
```

In the main area:

```tsx
<ScatterPlot transactions={filteredTransactions} onSelect={setSelectedTxn} />
```

- [ ] **Step 3: Verify it runs**

```bash
npm run dev
```

Confirm: scatter plot shows dots colored green/yellow/red. Hover shows tooltip. Dots shift when filters change.

- [ ] **Step 4: Commit**

```bash
git add src/components/ScatterPlot.tsx src/App.tsx
git commit -m "feat: add ScatterPlot visualization (time x amount x risk)"
```

---

### Task 10: NeighborhoodChart + HourlyVolumeChart

**Files:**
- Create: `src/components/NeighborhoodChart.tsx`
- Create: `src/components/HourlyVolumeChart.tsx`
- Modify: `src/App.tsx`

- [ ] **Step 1: Create NeighborhoodChart**

```tsx
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from "recharts";
import type { Transaction, FilterState } from "../types/transaction";

interface Props {
  transactions: Transaction[];
  setFilter: <K extends keyof FilterState>(key: K, value: FilterState[K]) => void;
}

function riskColor(score: number): string {
  if (score <= 40) return "#22c55e";
  if (score <= 70) return "#eab308";
  return "#ef4444";
}

export function NeighborhoodChart({ transactions, setFilter }: Props) {
  const grouped = new Map<string, { count: number; totalRisk: number }>();
  for (const t of transactions) {
    const entry = grouped.get(t.neighborhood) ?? { count: 0, totalRisk: 0 };
    entry.count++;
    entry.totalRisk += t.riskScore;
    grouped.set(t.neighborhood, entry);
  }

  const data = [...grouped.entries()]
    .map(([name, { count, totalRisk }]) => ({
      name,
      count,
      avgRisk: Math.round(totalRisk / count),
    }))
    .sort((a, b) => b.count - a.count);

  return (
    <div className="bg-gray-900 rounded-lg p-4">
      <h3 className="text-sm font-semibold text-gray-400 mb-3">Transactions by Neighborhood</h3>
      <ResponsiveContainer width="100%" height={250}>
        <BarChart data={data} layout="vertical" margin={{ top: 0, right: 20, bottom: 0, left: 80 }}>
          <XAxis type="number" stroke="#6b7280" fontSize={11} />
          <YAxis dataKey="name" type="category" stroke="#6b7280" fontSize={11} width={75} />
          <Tooltip
            contentStyle={{ backgroundColor: "#1f2937", border: "1px solid #374151", borderRadius: "6px" }}
            labelStyle={{ color: "#d1d5db" }}
            formatter={(value: number, name: string) => [value, name === "count" ? "Transactions" : name]}
          />
          <Bar
            dataKey="count"
            cursor="pointer"
            onClick={(entry: any) => setFilter("neighborhoods", [entry.name])}
          >
            {data.map((entry) => (
              <Cell key={entry.name} fill={riskColor(entry.avgRisk)} fillOpacity={0.8} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
```

- [ ] **Step 2: Create HourlyVolumeChart**

```tsx
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from "recharts";
import type { Transaction } from "../types/transaction";

interface Props {
  transactions: Transaction[];
}

function riskColor(score: number): string {
  if (score <= 40) return "#22c55e";
  if (score <= 70) return "#eab308";
  return "#ef4444";
}

export function HourlyVolumeChart({ transactions }: Props) {
  const hourly = new Map<number, { count: number; totalRisk: number }>();
  for (let h = 0; h < 24; h++) {
    hourly.set(h, { count: 0, totalRisk: 0 });
  }
  for (const t of transactions) {
    const hour = new Date(t.timestamp).getHours();
    const entry = hourly.get(hour)!;
    entry.count++;
    entry.totalRisk += t.riskScore;
  }

  const data = [...hourly.entries()].map(([hour, { count, totalRisk }]) => ({
    hour: `${String(hour).padStart(2, "0")}:00`,
    count,
    avgRisk: count > 0 ? Math.round(totalRisk / count) : 0,
  }));

  const avgCount = data.reduce((sum, d) => sum + d.count, 0) / 24;

  return (
    <div className="bg-gray-900 rounded-lg p-4">
      <h3 className="text-sm font-semibold text-gray-400 mb-3">Transaction Volume by Hour</h3>
      <ResponsiveContainer width="100%" height={250}>
        <BarChart data={data} margin={{ top: 0, right: 20, bottom: 0, left: 10 }}>
          <XAxis dataKey="hour" stroke="#6b7280" fontSize={10} interval={1} />
          <YAxis stroke="#6b7280" fontSize={11} />
          <Tooltip
            contentStyle={{ backgroundColor: "#1f2937", border: "1px solid #374151", borderRadius: "6px" }}
            labelStyle={{ color: "#d1d5db" }}
            formatter={(value: number, name: string) => {
              if (name === "count") return [value, "Transactions"];
              return [value, name];
            }}
          />
          <Bar dataKey="count">
            {data.map((entry) => (
              <Cell
                key={entry.hour}
                fill={riskColor(entry.avgRisk)}
                fillOpacity={0.8}
                stroke={entry.count > avgCount * 2 ? "#ef4444" : "none"}
                strokeWidth={entry.count > avgCount * 2 ? 2 : 0}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
```

- [ ] **Step 3: Wire both charts into App.tsx**

Import:

```tsx
import { NeighborhoodChart } from "./components/NeighborhoodChart";
import { HourlyVolumeChart } from "./components/HourlyVolumeChart";
```

Add below the ScatterPlot in main content:

```tsx
<div className="grid grid-cols-2 gap-4 mt-4">
  <NeighborhoodChart transactions={filteredTransactions} setFilter={setFilter} />
  <HourlyVolumeChart transactions={filteredTransactions} />
</div>
```

- [ ] **Step 4: Verify it runs**

```bash
npm run dev
```

Confirm: both charts render below the scatter plot. Neighborhood bars are clickable (filters update). Hourly chart shows volume with anomaly highlights.

- [ ] **Step 5: Commit**

```bash
git add src/components/NeighborhoodChart.tsx src/components/HourlyVolumeChart.tsx src/App.tsx
git commit -m "feat: add NeighborhoodChart and HourlyVolumeChart"
```

---

### Task 11: TransactionTable + TransactionDetail

**Files:**
- Create: `src/components/TransactionTable.tsx`
- Create: `src/components/TransactionDetail.tsx`
- Modify: `src/App.tsx`

- [ ] **Step 1: Create TransactionDetail modal**

```tsx
import type { Transaction } from "../types/transaction";

interface Props {
  transaction: Transaction;
  onClose: () => void;
}

export function TransactionDetail({ transaction: t, onClose }: Props) {
  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50" onClick={onClose}>
      <div
        className="bg-gray-900 border border-gray-700 rounded-lg p-6 max-w-md w-full mx-4 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">{t.id}</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-200 text-xl">&times;</button>
        </div>
        <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
          <Row label="Timestamp" value={new Date(t.timestamp).toLocaleString()} />
          <Row label="Amount" value={`${t.amount.toLocaleString()} COP`} />
          <Row label="Risk Score" value={String(t.riskScore)} />
          <Row label="Status" value={t.status} />
          <Row label="Customer" value={t.customerId} />
          <Row label="Card" value={`*${t.cardLast4}`} />
          <Row label="Neighborhood" value={t.neighborhood} />
          <Row label="Delivery Address" value={t.deliveryAddress} />
          <Row label="Device" value={t.deviceId} />
          <Row label="Payment Method" value={t.paymentMethod} />
          <Row label="Category" value={t.merchantCategory} />
        </dl>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <>
      <dt className="text-gray-400">{label}</dt>
      <dd className="text-gray-100">{value}</dd>
    </>
  );
}
```

- [ ] **Step 2: Create TransactionTable**

```tsx
import { useState } from "react";
import type { Transaction } from "../types/transaction";

interface Props {
  transactions: Transaction[];
  highlightedIds: Set<string> | null;
  onSelect: (txn: Transaction) => void;
}

type SortKey = "timestamp" | "amount" | "riskScore" | "neighborhood" | "status" | "cardLast4";

export function TransactionTable({ transactions, highlightedIds, onSelect }: Props) {
  const [sortKey, setSortKey] = useState<SortKey>("timestamp");
  const [sortAsc, setSortAsc] = useState(false);

  const sorted = [...transactions].sort((a, b) => {
    const aVal = a[sortKey];
    const bVal = b[sortKey];
    const cmp = typeof aVal === "number" ? aVal - (bVal as number) : String(aVal).localeCompare(String(bVal));
    return sortAsc ? cmp : -cmp;
  });

  // Show max 200 rows for performance
  const display = sorted.slice(0, 200);

  function handleSort(key: SortKey) {
    if (key === sortKey) {
      setSortAsc(!sortAsc);
    } else {
      setSortKey(key);
      setSortAsc(true);
    }
  }

  const headers: { key: SortKey; label: string }[] = [
    { key: "timestamp", label: "Time" },
    { key: "amount", label: "Amount (COP)" },
    { key: "riskScore", label: "Risk" },
    { key: "neighborhood", label: "Neighborhood" },
    { key: "status", label: "Status" },
    { key: "cardLast4", label: "Card" },
  ];

  return (
    <div className="bg-gray-900 rounded-lg p-4 mt-4">
      <h3 className="text-sm font-semibold text-gray-400 mb-3">
        Transactions ({transactions.length}{transactions.length > 200 ? ", showing first 200" : ""})
      </h3>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-700">
              {headers.map((h) => (
                <th
                  key={h.key}
                  onClick={() => handleSort(h.key)}
                  className="text-left py-2 px-3 text-gray-400 font-medium cursor-pointer hover:text-gray-200 select-none"
                >
                  {h.label} {sortKey === h.key ? (sortAsc ? "\u2191" : "\u2193") : ""}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {display.map((t) => {
              const highlighted = highlightedIds?.has(t.id);
              return (
                <tr
                  key={t.id}
                  onClick={() => onSelect(t)}
                  className={`border-b border-gray-800 cursor-pointer hover:bg-gray-800 ${highlighted ? "bg-yellow-900/30" : ""}`}
                >
                  <td className="py-1.5 px-3 text-gray-300">{new Date(t.timestamp).toLocaleString()}</td>
                  <td className="py-1.5 px-3">{t.amount.toLocaleString()}</td>
                  <td className="py-1.5 px-3">
                    <span className={t.riskScore > 70 ? "text-red-400" : t.riskScore > 40 ? "text-yellow-400" : "text-green-400"}>
                      {t.riskScore}
                    </span>
                  </td>
                  <td className="py-1.5 px-3 text-gray-300">{t.neighborhood}</td>
                  <td className="py-1.5 px-3">
                    <span className={`text-xs px-1.5 py-0.5 rounded ${
                      t.status === "approved" ? "bg-green-900/50 text-green-400" :
                      t.status === "declined" ? "bg-red-900/50 text-red-400" :
                      "bg-yellow-900/50 text-yellow-400"
                    }`}>
                      {t.status}
                    </span>
                  </td>
                  <td className="py-1.5 px-3 text-gray-400">*{t.cardLast4}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Wire into App.tsx**

Import:

```tsx
import { TransactionTable } from "./components/TransactionTable";
import { TransactionDetail } from "./components/TransactionDetail";
```

Add below the charts grid in main content:

```tsx
<TransactionTable
  transactions={filteredTransactions}
  highlightedIds={filters.highlightedIds}
  onSelect={setSelectedTxn}
/>

{selectedTxn && (
  <TransactionDetail
    transaction={selectedTxn}
    onClose={() => setSelectedTxn(null)}
  />
)}
```

- [ ] **Step 4: Verify it runs**

```bash
npm run dev
```

Confirm: table renders below charts, sortable by clicking headers. Click a row to open detail modal. Close modal by clicking backdrop or X.

- [ ] **Step 5: Commit**

```bash
git add src/components/TransactionTable.tsx src/components/TransactionDetail.tsx src/App.tsx
git commit -m "feat: add TransactionTable and TransactionDetail modal"
```

---

### Task 12: FraudAlerts

**Files:**
- Create: `src/components/FraudAlerts.tsx`
- Modify: `src/App.tsx`

- [ ] **Step 1: Create FraudAlerts component**

```tsx
import type { Alert, FilterState } from "../types/transaction";

interface Props {
  alerts: Alert[];
  setFilter: <K extends keyof FilterState>(key: K, value: FilterState[K]) => void;
}

const ICONS: Record<Alert["type"], string> = {
  velocity: "\u26A1",
  geographic_cluster: "\uD83D\uDCCD",
  card_testing: "\uD83D\uDCB3",
};

const LABELS: Record<Alert["type"], string> = {
  velocity: "Velocity",
  geographic_cluster: "Geo Cluster",
  card_testing: "Card Testing",
};

export function FraudAlerts({ alerts, setFilter }: Props) {
  if (alerts.length === 0) return null;

  function handleClick(alert: Alert) {
    setFilter("highlightedIds", new Set(alert.transactionIds));
  }

  return (
    <div className="mt-5">
      <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-400 mb-2">
        Fraud Alerts ({alerts.length})
      </h2>
      <div className="space-y-2">
        {alerts.map((alert, i) => (
          <button
            key={i}
            onClick={() => handleClick(alert)}
            className="w-full text-left bg-red-950/40 border border-red-900/50 rounded-lg px-3 py-2 hover:bg-red-950/60 transition-colors"
          >
            <div className="flex items-center gap-2">
              <span>{ICONS[alert.type]}</span>
              <span className="text-xs font-medium text-red-400">{LABELS[alert.type]}</span>
              <span className="text-xs text-gray-500 ml-auto">{alert.transactionIds.length} txns</span>
            </div>
            <div className="text-xs text-gray-300 mt-1">{alert.description}</div>
          </button>
        ))}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Wire into App.tsx sidebar**

Import:

```tsx
import { FraudAlerts } from "./components/FraudAlerts";
```

Add below the FilterPanel in the sidebar:

```tsx
<FraudAlerts alerts={alerts} setFilter={setFilter} />
```

- [ ] **Step 3: Verify it runs**

```bash
npm run dev
```

Confirm: alerts appear in sidebar below filters. Clicking an alert highlights matching rows in the table (yellow background). Should see at least 3 alerts: velocity, geographic cluster, card testing.

- [ ] **Step 4: Commit**

```bash
git add src/components/FraudAlerts.tsx src/App.tsx
git commit -m "feat: add FraudAlerts with clickable pattern highlights"
```

---

### Task 13: Final App.tsx Assembly + Polish

**Files:**
- Modify: `src/App.tsx`

- [ ] **Step 1: Assemble the final App.tsx**

Ensure `App.tsx` has all imports and the complete layout:

```tsx
import { useState } from "react";
import transactionData from "./data/transactions.json";
import type { Transaction } from "./types/transaction";
import { useFilters } from "./hooks/useFilters";
import { useAlerts } from "./hooks/useAlerts";
import { SummaryMetrics } from "./components/SummaryMetrics";
import { FilterPanel } from "./components/FilterPanel";
import { FraudAlerts } from "./components/FraudAlerts";
import { ScatterPlot } from "./components/ScatterPlot";
import { NeighborhoodChart } from "./components/NeighborhoodChart";
import { HourlyVolumeChart } from "./components/HourlyVolumeChart";
import { TransactionTable } from "./components/TransactionTable";
import { TransactionDetail } from "./components/TransactionDetail";

const transactions: Transaction[] = transactionData as Transaction[];

function App() {
  const { filters, setFilter, resetFilters, filteredTransactions } = useFilters(transactions);
  const alerts = useAlerts(transactions);
  const [selectedTxn, setSelectedTxn] = useState<Transaction | null>(null);

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100">
      {/* Header */}
      <header className="border-b border-gray-800 px-6 py-4">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <h1 className="text-xl font-bold tracking-tight">Transaction Risk Explorer</h1>
          <SummaryMetrics filtered={filteredTransactions} total={transactions.length} />
        </div>
      </header>

      {/* Body */}
      <div className="flex">
        {/* Sidebar */}
        <aside className="w-72 shrink-0 border-r border-gray-800 p-4 overflow-y-auto h-[calc(100vh-65px)]">
          <FilterPanel
            filters={filters}
            setFilter={setFilter}
            resetFilters={resetFilters}
            transactions={transactions}
          />
          <FraudAlerts alerts={alerts} setFilter={setFilter} />
        </aside>

        {/* Main content */}
        <main className="flex-1 p-4 overflow-y-auto h-[calc(100vh-65px)] space-y-4">
          <ScatterPlot transactions={filteredTransactions} onSelect={setSelectedTxn} />
          <div className="grid grid-cols-2 gap-4">
            <NeighborhoodChart transactions={filteredTransactions} setFilter={setFilter} />
            <HourlyVolumeChart transactions={filteredTransactions} />
          </div>
          <TransactionTable
            transactions={filteredTransactions}
            highlightedIds={filters.highlightedIds}
            onSelect={setSelectedTxn}
          />
        </main>
      </div>

      {/* Detail modal */}
      {selectedTxn && (
        <TransactionDetail transaction={selectedTxn} onClose={() => setSelectedTxn(null)} />
      )}
    </div>
  );
}

export default App;
```

- [ ] **Step 2: Verify full dashboard works end-to-end**

```bash
npm run dev
```

Walk through these checks:
1. Page loads with all charts and table
2. Summary metrics show correct totals
3. Filter by risk score -- all charts and table update
4. Filter by neighborhood (click a bar) -- scatter plot and table filter
5. Click a fraud alert -- table rows highlight
6. Click a scatter dot -- detail modal opens
7. Click a table row -- detail modal opens
8. Reset filters -- everything returns to full dataset
9. Filter by card "4532" -- see the card testing pattern

- [ ] **Step 3: Run tests**

```bash
npm test
```

Expected: all detection tests pass.

- [ ] **Step 4: Commit**

```bash
git add src/App.tsx
git commit -m "feat: assemble final dashboard layout"
```

---

### Task 14: README

**Files:**
- Modify: `README.md`

- [ ] **Step 1: Write README**

```markdown
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
```

- [ ] **Step 2: Commit**

```bash
git add README.md
git commit -m "docs: add README with run instructions and fraud pattern descriptions"
```
