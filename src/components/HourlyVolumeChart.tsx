import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from "recharts";
import type { Transaction } from "../types/transaction";

interface Props {
  transactions: Transaction[];
}

function riskColor(score: number): string {
  if (score <= 40) return "#22c55e";
  if (score <= 70) return "#eab308";
  return "#ef4444";
}

export function HourlyVolumeChart({ transactions }: Props) {
  const hourly = new Map<number, { count: number; totalRisk: number }>();
  for (let h = 0; h < 24; h++) {
    hourly.set(h, { count: 0, totalRisk: 0 });
  }
  for (const t of transactions) {
    const hour = new Date(t.timestamp).getHours();
    const entry = hourly.get(hour)!;
    entry.count++;
    entry.totalRisk += t.riskScore;
  }

  const data = [...hourly.entries()].map(([hour, { count, totalRisk }]) => ({
    hour: `${String(hour).padStart(2, "0")}:00`,
    count,
    avgRisk: count > 0 ? Math.round(totalRisk / count) : 0,
  }));

  const avgCount = data.reduce((sum, d) => sum + d.count, 0) / 24;

  return (
    <div className="bg-gray-900 rounded-lg p-4">
      <h3 className="text-sm font-semibold text-gray-400 mb-3">Transaction Volume by Hour</h3>
      <ResponsiveContainer width="100%" height={250}>
        <BarChart data={data} margin={{ top: 0, right: 20, bottom: 0, left: 10 }}>
          <XAxis dataKey="hour" stroke="#6b7280" fontSize={10} interval={1} />
          <YAxis stroke="#6b7280" fontSize={11} />
          <Tooltip
            contentStyle={{ backgroundColor: "#1f2937", border: "1px solid #374151", borderRadius: "6px" }}
            labelStyle={{ color: "#d1d5db" }}
            formatter={(value: any, name: any) => {
              if (name === "count") return [value, "Transactions"];
              return [value, name];
            }}
          />
          <Bar dataKey="count">
            {data.map((entry) => (
              <Cell
                key={entry.hour}
                fill={riskColor(entry.avgRisk)}
                fillOpacity={0.8}
                stroke={entry.count > avgCount * 2 ? "#ef4444" : "none"}
                strokeWidth={entry.count > avgCount * 2 ? 2 : 0}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
