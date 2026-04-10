export interface Transaction {
  id: string;
  timestamp: string;
  customerId: string;
  cardLast4: string;
  amount: number;
  neighborhood: string;
  status: "approved" | "declined" | "under_review";
  riskScore: number;
  deliveryAddress: string;
  deviceId: string;
  paymentMethod: string;
  merchantCategory: string;
}

export interface FilterState {
  dateRange: [string, string] | null;
  riskRange: [number, number];
  statuses: Transaction["status"][];
  amountRange: [number, number];
  neighborhoods: string[];
  cardLast4: string;
  highlightedIds: Set<string> | null;
}

export type AlertType = "velocity" | "geographic_cluster" | "card_testing";

export interface Alert {
  type: AlertType;
  description: string;
  transactionIds: string[];
}
