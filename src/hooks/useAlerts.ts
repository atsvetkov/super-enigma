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
