import { useState } from "react";
import type { Transaction } from "../types/transaction";

interface Props {
  transactions: Transaction[];
  highlightedIds: Set<string> | null;
  onSelect: (txn: Transaction) => void;
}

type SortKey = "timestamp" | "amount" | "riskScore" | "neighborhood" | "status" | "cardLast4";

export function TransactionTable({ transactions, highlightedIds, onSelect }: Props) {
  const [sortKey, setSortKey] = useState<SortKey>("timestamp");
  const [sortAsc, setSortAsc] = useState(false);

  const sorted = [...transactions].sort((a, b) => {
    const aVal = a[sortKey];
    const bVal = b[sortKey];
    const cmp = typeof aVal === "number" ? aVal - (bVal as number) : String(aVal).localeCompare(String(bVal));
    return sortAsc ? cmp : -cmp;
  });

  // Show max 200 rows for performance
  const display = sorted.slice(0, 200);

  function handleSort(key: SortKey) {
    if (key === sortKey) {
      setSortAsc(!sortAsc);
    } else {
      setSortKey(key);
      setSortAsc(true);
    }
  }

  const headers: { key: SortKey; label: string }[] = [
    { key: "timestamp", label: "Time" },
    { key: "amount", label: "Amount (COP)" },
    { key: "riskScore", label: "Risk" },
    { key: "neighborhood", label: "Neighborhood" },
    { key: "status", label: "Status" },
    { key: "cardLast4", label: "Card" },
  ];

  return (
    <div className="bg-gray-900 rounded-lg p-4 mt-4">
      <h3 className="text-sm font-semibold text-gray-400 mb-3">
        Transactions ({transactions.length}{transactions.length > 200 ? ", showing first 200" : ""})
      </h3>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-700">
              {headers.map((h) => (
                <th
                  key={h.key}
                  onClick={() => handleSort(h.key)}
                  className="text-left py-2 px-3 text-gray-400 font-medium cursor-pointer hover:text-gray-200 select-none"
                >
                  {h.label} {sortKey === h.key ? (sortAsc ? "\u2191" : "\u2193") : ""}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {display.map((t) => {
              const highlighted = highlightedIds?.has(t.id);
              return (
                <tr
                  key={t.id}
                  onClick={() => onSelect(t)}
                  className={`border-b border-gray-800 cursor-pointer hover:bg-gray-800 ${highlighted ? "bg-yellow-900/30" : ""}`}
                >
                  <td className="py-1.5 px-3 text-gray-300">{new Date(t.timestamp).toLocaleString()}</td>
                  <td className="py-1.5 px-3">{t.amount.toLocaleString()}</td>
                  <td className="py-1.5 px-3">
                    <span className={t.riskScore > 70 ? "text-red-400" : t.riskScore > 40 ? "text-yellow-400" : "text-green-400"}>
                      {t.riskScore}
                    </span>
                  </td>
                  <td className="py-1.5 px-3 text-gray-300">{t.neighborhood}</td>
                  <td className="py-1.5 px-3">
                    <span className={`text-xs px-1.5 py-0.5 rounded ${
                      t.status === "approved" ? "bg-green-900/50 text-green-400" :
                      t.status === "declined" ? "bg-red-900/50 text-red-400" :
                      "bg-yellow-900/50 text-yellow-400"
                    }`}>
                      {t.status}
                    </span>
                  </td>
                  <td className="py-1.5 px-3 text-gray-400">*{t.cardLast4}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
