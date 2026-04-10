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
          className="text-xs text-blue-400 hover:text-blue-300 cursor-pointer"
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
            className="text-xs text-blue-400 hover:text-blue-300 mt-1 cursor-pointer"
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
