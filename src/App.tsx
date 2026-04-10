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
          {filters.highlightedIds && (
            <div className="bg-red-950/40 border border-red-900/50 rounded-lg px-3 py-2 flex justify-between items-center">
              <span className="text-xs text-red-300">Viewing {filters.highlightedIds.size} flagged transactions</span>
              <button onClick={() => setFilter("highlightedIds", null)} className="text-xs text-blue-400 hover:text-blue-300 cursor-pointer">Clear</button>
            </div>
          )}
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
