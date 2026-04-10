import {
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";
import type { Transaction } from "../types/transaction";

interface Props {
  transactions: Transaction[];
  onSelect: (txn: Transaction) => void;
}

function riskColor(score: number): string {
  if (score <= 40) return "#22c55e"; // green
  if (score <= 70) return "#eab308"; // yellow
  return "#ef4444"; // red
}

function formatAmount(value: number): string {
  return `${(value / 1000).toFixed(0)}k`;
}

function CustomTooltip({ active, payload }: any) {
  if (!active || !payload?.[0]) return null;
  const t = payload[0].payload as Transaction & { x: number; y: number };
  return (
    <div className="bg-gray-800 border border-gray-700 rounded p-2 text-xs shadow-lg">
      <div className="font-semibold">{t.id}</div>
      <div>Amount: {t.amount.toLocaleString()} COP</div>
      <div>Risk: {t.riskScore}</div>
      <div>Card: *{t.cardLast4}</div>
      <div>{t.neighborhood}</div>
      <div>{new Date(t.timestamp).toLocaleString()}</div>
    </div>
  );
}

export function ScatterPlot({ transactions, onSelect }: Props) {
  const data = transactions.map((t) => ({
    x: new Date(t.timestamp).getTime(),
    y: t.amount,
    ...t,
  }));

  return (
    <div className="bg-gray-900 rounded-lg p-4">
      <h3 className="text-sm font-semibold text-gray-400 mb-3">
        Transactions: Time vs Amount (color = risk)
      </h3>
      <ResponsiveContainer width="100%" height={350}>
        <ScatterChart margin={{ top: 10, right: 20, bottom: 10, left: 10 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
          <XAxis
            dataKey="x"
            type="number"
            domain={["dataMin", "dataMax"]}
            tickFormatter={(v) => new Date(v).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
            stroke="#6b7280"
            fontSize={11}
            name="Time"
          />
          <YAxis
            dataKey="y"
            type="number"
            tickFormatter={formatAmount}
            stroke="#6b7280"
            fontSize={11}
            name="Amount"
            unit=" COP"
          />
          <Tooltip content={<CustomTooltip />} />
          <Scatter data={data} onClick={(point: any) => onSelect(point)} cursor="pointer">
            {data.map((entry) => (
              <Cell key={entry.id} fill={riskColor(entry.riskScore)} fillOpacity={0.7} r={3} />
            ))}
          </Scatter>
        </ScatterChart>
      </ResponsiveContainer>
      <div className="flex gap-4 mt-2 text-xs text-gray-500 justify-center">
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-green-500 inline-block" /> Low (0-40)</span>
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-yellow-500 inline-block" /> Medium (41-70)</span>
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-red-500 inline-block" /> High (71-100)</span>
      </div>
    </div>
  );
}
