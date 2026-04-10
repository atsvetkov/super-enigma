import type { Transaction } from "../types/transaction";

interface Props {
  transaction: Transaction;
  onClose: () => void;
}

export function TransactionDetail({ transaction: t, onClose }: Props) {
  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50" onClick={onClose}>
      <div
        className="bg-gray-900 border border-gray-700 rounded-lg p-6 max-w-md w-full mx-4 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">{t.id}</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-200 text-xl cursor-pointer">&times;</button>
        </div>
        <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
          <Row label="Timestamp" value={new Date(t.timestamp).toLocaleString()} />
          <Row label="Amount" value={`${t.amount.toLocaleString()} COP`} />
          <Row label="Risk Score" value={String(t.riskScore)} />
          <Row label="Status" value={t.status} />
          <Row label="Customer" value={t.customerId} />
          <Row label="Card" value={`*${t.cardLast4}`} />
          <Row label="Neighborhood" value={t.neighborhood} />
          <Row label="Delivery Address" value={t.deliveryAddress} />
          <Row label="Device" value={t.deviceId} />
          <Row label="Payment Method" value={t.paymentMethod} />
          <Row label="Category" value={t.merchantCategory} />
        </dl>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <>
      <dt className="text-gray-400">{label}</dt>
      <dd className="text-gray-100">{value}</dd>
    </>
  );
}
