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
