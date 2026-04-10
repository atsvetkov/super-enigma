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
