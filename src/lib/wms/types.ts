import type { BomStatus, ItemType, Role, VoucherRemarkUnit, VoucherStatus, VoucherType } from "./constants";

export type ItemDTO = {
  _id: string;
  code: string;
  name: string;
  spec?: string;
  productionLine?: string;
  price?: string;
  type: ItemType;
  unit: string;
  minStock: string;
  isStocked: boolean;
  excludeFromReconciliation: boolean;
  packSize?: string;
  note?: string;
  isActive: boolean;
};

export type StockRow = {
  itemId: string;
  code: string;
  name: string;
  unit: string;
  type: ItemType;
  productionLine?: string;
  onHand: string;
  minStock: string;
  isLow: boolean;
};

export type StockCardRow = {
  date: string;
  voucherNo: string;
  voucherType: VoucherType;
  kind: "POST" | "REVERSAL";
  in: string;
  out: string;
  balance: string;
  postedBalance: string;
};

export type StockCardDTO = {
  item: { code: string; name: string; unit: string } | null;
  opening: string;
  rows: StockCardRow[];
};

export type BomLineDTO = {
  itemId: string;
  itemCode: string;
  itemName: string;
  unit: string;
  quantity: string;
  scrapPercent: number;
  note?: string;
};

export type BomListRow = {
  _id: string;
  outputItemId: string;
  outputItemCode: string;
  outputItemName: string;
  version: number;
  status: BomStatus;
  lineCount: number;
  effectiveFrom?: string;
  note?: string;
  updatedAt: string;
};

export type BomDTO = {
  _id: string;
  outputItemId: string;
  outputItemCode: string;
  version: number;
  status: BomStatus;
  effectiveFrom?: string;
  lines: BomLineDTO[];
  note?: string;
  updatedAt: string;
};
export type BomTreeNodeDTO = {
  itemId: string;
  code: string;
  name: string;
  unit: string;
  type: ItemType;
  quantity: string;
  scrapPercent: number;
  missingBom: boolean;
  children: BomTreeNodeDTO[];
};

export type BomTreeDTO = {
  bomId: string;
  outputItemCode: string;
  version: number;
  status: BomStatus;
  tree: BomTreeNodeDTO[];
};

export type BomRequirementsDTO = {
  lines: { itemId: string; itemCode: string; itemName: string; unit: string; quantity: string; normQuantity: string }[];
};

export type VoucherListRow = {
  _id: string;
  voucherNo: string;
  documentNumber?: string;
  type: VoucherType;
  direction: "IN" | "OUT";
  status: VoucherStatus;
  voucherDate: string;
  period: string;
  batchNote?: string;
  lineCount: number;
  createdAt: string;
};

export type VoucherLineDTO = {
  lineNo: number;
  itemId: string;
  itemCode: string;
  itemName: string;
  unit: string;
  quantity: string;
  normQuantity?: string;
  remarkQuantity?: string;
  remarkUnit?: VoucherRemarkUnit;
  note?: string;
};

export type VoucherDTO = {
  _id: string;
  voucherNo?: string;
  documentNumber?: string;
  type: VoucherType;
  direction: "IN" | "OUT";
  status: VoucherStatus;
  voucherDate: string;
  batchNote?: string;
  note?: string;
  productionRef?: { productId: string; productCode: string; productName: string; quantity: string };
  lines: VoucherLineDTO[];
  confirmedAt?: string;
  cancelledAt?: string;
  cancelReason?: string;
};

export type SummaryRow = {
  itemId: string;
  code: string;
  name: string;
  unit: string;
  type: ItemType;
  opening: string;
  in: string;
  out: string;
  closing: string;
};

export type ReconStatus = "OVER" | "NO_NORM" | "UNDER" | "OK";

export type ReconRow = {
  itemId: string;
  code: string;
  name: string;
  unit: string;
  norm: string;
  allowed: string;
  actual: string;
  diff: string;
  diffPercent: number | null;
  status: ReconStatus;
};

export type ReconResult = {
  rows: ReconRow[];
  /** Finished products received in the month that could not be expanded (no ACTIVE BOM) */
  skipped: { itemId: string; code: string; name: string; quantity: string }[];
};

export type WhereUsedRow = {
  _id: string;
  outputItemCode: string;
  version: number;
  lines: { quantity: string; scrapPercent: number }[];
};

export type UserDTO = {
  _id: string;
  username: string;
  name: string;
  role: Role;
  isActive: boolean;
  lastLoginAt?: string;
  lockedUntil?: string;
};

export type OverviewDTO = {
  period: string;
  kpis: {
    stockedItems: number;
    belowMinimum: number;
    outOfStock: number;
    draftReceipts: number;
    draftIssues: number;
    receipts: { current: number; previous: number };
    issues: { current: number; previous: number };
    cancelled: { current: number; previous: number };
    reconOver: number;
    reconNoNorm: number;
    reconSkipped: number;
  };
  /** Confirmed vouchers per day over the last 30 days (Vietnam time), oldest first */
  activity: { date: string; receipts: number; issues: number }[];
  lowStock: { itemId: string; code: string; name: string; unit: string; onHand: string; minStock: string }[];
  recentVouchers: {
    _id: string;
    voucherNo?: string;
    type: VoucherType;
    direction: "IN" | "OUT";
    status: VoucherStatus;
    voucherDate: string;
    lineCount: number;
    updatedAt: string;
  }[];
  reconIssues: ReconRow[];
};
