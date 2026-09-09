export type VoucherStatus = "Approved" | "Pending" | "In transit" | "Rejected";
export type VoucherType = "Receipt" | "Transfer" | "Adjustment" | "Issue";

export type VoucherRow = {
  id: string;
  type: VoucherType;
  reference: string;
  warehouse: string;
  counterparty: string;
  qty: number;
  amount: number;
  status: VoucherStatus;
  createdAt: string;
};

export const vouchers: VoucherRow[] = [
  {
    id: "VCH-1001",
    type: "Receipt",
    reference: "PO-4118",
    warehouse: "Main Warehouse",
    counterparty: "NorthPeak Metals",
    qty: 240,
    amount: 9600,
    status: "Approved",
    createdAt: "2026-09-08T08:45:00.000Z",
  },
  {
    id: "VCH-1002",
    type: "Transfer",
    reference: "TR-2204",
    warehouse: "Main Warehouse",
    counterparty: "East Hub",
    qty: 72,
    amount: 0,
    status: "In transit",
    createdAt: "2026-09-07T14:15:00.000Z",
  },
  {
    id: "VCH-1003",
    type: "Adjustment",
    reference: "AD-5069",
    warehouse: "Receiving Dock",
    counterparty: "Cycle Count",
    qty: 18,
    amount: 0,
    status: "Pending",
    createdAt: "2026-09-06T11:30:00.000Z",
  },
  {
    id: "VCH-1004",
    type: "Issue",
    reference: "SO-8810",
    warehouse: "Production Floor",
    counterparty: "Assembly Line 3",
    qty: 46,
    amount: 0,
    status: "Approved",
    createdAt: "2026-09-05T09:10:00.000Z",
  },
  {
    id: "VCH-1005",
    type: "Receipt",
    reference: "PO-4180",
    warehouse: "East Hub",
    counterparty: "VoltWorks Co.",
    qty: 120,
    amount: 10800,
    status: "Rejected",
    createdAt: "2026-09-04T16:40:00.000Z",
  },
];

export const voucherFilters = {
  type: ["All", "Receipt", "Transfer", "Adjustment", "Issue"],
  status: ["All", "Approved", "Pending", "In transit", "Rejected"],
  warehouse: ["All", "Main Warehouse", "East Hub", "Receiving Dock", "Production Floor"],
};

export const voucherStatusMeta: Record<VoucherStatus, { badgeClass: string; dotClass: string }> = {
  Approved: {
    badgeClass: "border-emerald-500/20 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
    dotClass: "bg-emerald-500",
  },
  Pending: {
    badgeClass: "border-amber-500/20 bg-amber-500/10 text-amber-600 dark:text-amber-400",
    dotClass: "bg-amber-500",
  },
  "In transit": {
    badgeClass: "border-violet-500/20 bg-violet-500/10 text-violet-600 dark:text-violet-400",
    dotClass: "bg-violet-500",
  },
  Rejected: {
    badgeClass: "border-rose-500/20 bg-rose-500/10 text-rose-600 dark:text-rose-400",
    dotClass: "bg-rose-500",
  },
};

export const statusMeta = voucherStatusMeta;
export const filters = voucherFilters;
