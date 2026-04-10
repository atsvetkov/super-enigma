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
            className="w-full text-left bg-red-950/40 border border-red-900/50 rounded-lg px-3 py-2 hover:bg-red-950/60 transition-colors cursor-pointer"
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
