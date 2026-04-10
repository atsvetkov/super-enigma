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
