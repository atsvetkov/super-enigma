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

    // Sliding window: find the largest cluster within 4 hours with >=16 txns
    const WINDOW_4H = 4 * 60 * 60 * 1000;
    let start = 0;
    let bestStart = -1;
    let bestEnd = -1;

    for (let end = 0; end < sorted.length; end++) {
      const endTime = new Date(sorted[end].timestamp).getTime();
      // Advance start so the window stays within 4 hours
      while (endTime - new Date(sorted[start].timestamp).getTime() > WINDOW_4H) {
        start++;
      }
      const windowSize = end - start + 1;
      if (windowSize >= 16) {
        if (bestStart === -1 || windowSize > bestEnd - bestStart + 1) {
          bestStart = start;
          bestEnd = end;
        }
      }
    }

    if (bestStart !== -1) {
      const ids = sorted.slice(bestStart, bestEnd + 1).map((t) => t.id);
      const windowSize = ids.length;
      alerts.push({
        type: "geographic_cluster",
        description: `${windowSize} high-risk transactions in ${neighborhood} within 4hrs`,
        transactionIds: ids,
      });
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
      const largeIds: string[] = [];
      for (let j = lastSmallIdx + 1; j < sorted.length; j++) {
        const t = new Date(sorted[j].timestamp).getTime();
        if (t - windowStart > WINDOW_MS) break;
        if (sorted[j].amount >= LARGE_THRESHOLD) {
          largeCount++;
          largeIds.push(sorted[j].id);
        }
      }

      if (largeCount >= 1) {
        alerts.push({
          type: "card_testing",
          description: `Card *${card}: ${smallCount} small + ${largeCount} large transactions in <1hr`,
          transactionIds: [...ids, ...largeIds],
        });
        break; // one alert per card
      }
    }
  }

  return alerts;
}
