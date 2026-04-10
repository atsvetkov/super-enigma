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

      // Highlighted (fraud alert) filter
      if (filters.highlightedIds && !filters.highlightedIds.has(txn.id)) {
        return false;
      }

      return true;
    });
  }, [transactions, filters]);

  return { filters, setFilter, resetFilters, filteredTransactions };
}
