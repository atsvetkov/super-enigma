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
            formatter={(value: any, name: any) => [value, name === "count" ? "Transactions" : name]}
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
