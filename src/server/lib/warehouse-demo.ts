import Decimal from "decimal.js";

import {
  BOM_STATUS,
  type BomStatus,
  ITEM_TYPE,
  type ItemType,
  type Role,
  VOUCHER_STATUS,
  VOUCHER_TYPE,
  type VoucherType,
} from "@/lib/wms/constants";
import type { BomTreeNodeDTO, ItemDTO, ReconRow, UserDTO } from "@/lib/wms/types";

import demoData from "./warehouse-demo-data.json";

type DemoItem = ItemDTO & { type: ItemType };
type DemoBom = {
  _id: string;
  outputItemId: string;
  outputItemCode: string;
  version: number;
  status: BomStatus;
  effectiveFrom: string;
  lines: {
    itemId: string;
    itemCode: string;
    itemName: string;
    unit: string;
    quantity: string;
    scrapPercent: number;
    note?: string;
  }[];
  note?: string;
  createdBy: string;
  activatedBy?: string;
  activatedAt?: string;
  createdAt: string;
  updatedAt: string;
};
type DemoVoucher = {
  _id: string;
  voucherNo?: string;
  type: VoucherType;
  direction: "IN" | "OUT";
  status: "DRAFT" | "CONFIRMED" | "CANCELLED";
  voucherDate: string;
  period: string;
  batchNote?: string;
  productionRef?: { productId: string; productCode: string; productName: string; quantity: string };
  lines: {
    lineNo: number;
    itemId: string;
    itemCode: string;
    itemName: string;
    unit: string;
    quantity: string;
    normQuantity?: string;
  }[];
  createdBy: string;
  confirmedBy?: string;
  confirmedAt?: string;
  cancelledBy?: string;
  cancelledAt?: string;
  cancelReason?: string;
  createdAt: string;
  updatedAt: string;
};
type DemoTransaction = {
  _id: string;
  kind: "POST" | "REVERSAL";
  voucherId: string;
  voucherNo: string;
  voucherType: VoucherType;
  lineNo: number;
  itemId: string;
  itemCode: string;
  direction: "IN" | "OUT";
  quantity: string;
  signedQuantity: string;
  balanceAfter: string;
  businessDate: string;
  period: string;
  reversalOf?: string;
  createdBy: string;
  createdAt: string;
};
type DemoUser = UserDTO & { role: Role };

const items = demoData.items as DemoItem[];
const DAY_MS = 24 * 60 * 60 * 1000;
const ymdInVietnam = (date: Date) => new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Ho_Chi_Minh" }).format(date);
const periodInVietnam = (date: Date) => ymdInVietnam(date).slice(0, 7);
const generatedDate = new Date(demoData.generatedAt);
const dayShift = Math.round(
  (Date.parse(`${ymdInVietnam(new Date())}T00:00:00Z`) - Date.parse(`${ymdInVietnam(generatedDate)}T00:00:00Z`)) /
    DAY_MS,
);
const shiftDate = (date: string) => new Date(new Date(date).getTime() + dayShift * DAY_MS).toISOString();
const boms = demoData.boms.map((bom) => ({
  ...bom,
  effectiveFrom: shiftDate(bom.effectiveFrom),
  createdAt: shiftDate(bom.createdAt),
  updatedAt: shiftDate(bom.updatedAt),
  activatedAt: bom.activatedAt ? shiftDate(bom.activatedAt) : undefined,
})) as DemoBom[];
const vouchers = demoData.vouchers.map((voucher) => {
  const voucherDate = shiftDate(voucher.voucherDate);
  return {
    ...voucher,
    voucherDate,
    period: periodInVietnam(new Date(voucherDate)),
    createdAt: shiftDate(voucher.createdAt),
    updatedAt: shiftDate(voucher.updatedAt),
    confirmedAt: voucher.confirmedAt ? shiftDate(voucher.confirmedAt) : undefined,
    cancelledAt: voucher.cancelledAt ? shiftDate(voucher.cancelledAt) : undefined,
  };
}) as DemoVoucher[];
const transactions = demoData.transactions.map((transaction) => {
  const businessDate = shiftDate(transaction.businessDate);
  return {
    ...transaction,
    businessDate,
    period: periodInVietnam(new Date(businessDate)),
    createdAt: shiftDate(transaction.createdAt),
  };
}) as DemoTransaction[];
const users = demoData.users.map((user) => ({
  ...user,
  lastLoginAt: shiftDate(user.lastLoginAt),
})) as DemoUser[];
const itemById = new Map(items.map((item) => [item._id, item]));
const bomByOutput = new Map(
  boms.filter((bom) => bom.status === BOM_STATUS.ACTIVE).map((bom) => [bom.outputItemId, bom]),
);
const dec = (value: string | number | undefined) => new Decimal(value ?? 0);

const priorPeriod = (period: string) => {
  const [year, month] = period.split("-").map(Number);
  return month === 1 ? `${year - 1}-12` : `${year}-${String(month - 1).padStart(2, "0")}`;
};
const itemQuantity = (itemId: string) =>
  transactions
    .filter((transaction) => transaction.itemId === itemId)
    .reduce((sum, transaction) => sum.plus(transaction.signedQuantity), new Decimal(0));
const itemStockRow = (item: DemoItem) => {
  const onHand = itemQuantity(item._id);
  const minStock = dec(item.minStock);
  return {
    itemId: item._id,
    code: item.code,
    name: item.name,
    unit: item.unit,
    type: item.type,
    group: item.group,
    onHand: onHand.toString(),
    minStock: minStock.toString(),
    isLow: onHand.lt(minStock),
  };
};
const isInRange = (value: string, from: Date, to: Date) => {
  const time = new Date(value).getTime();
  return time >= from.getTime() && time < to.getTime();
};

export function getDemoItems(filter: { type?: string; q?: string; includeInactive: boolean }) {
  const q = filter.q?.toLocaleLowerCase();
  return items
    .filter(
      (item) =>
        (!filter.type || item.type === filter.type) &&
        (filter.includeInactive || item.isActive) &&
        (!q || item.code.toLocaleLowerCase().includes(q) || item.name.toLocaleLowerCase().includes(q)),
    )
    .sort((a, b) => a.code.localeCompare(b.code));
}

export function getDemoItem(itemId: string) {
  return itemById.get(itemId) ?? null;
}

export function getDemoBoms(filter: { outputItemId?: string; status?: string }) {
  return boms
    .filter(
      (bom) =>
        (!filter.outputItemId || bom.outputItemId === filter.outputItemId) &&
        (!filter.status || bom.status === filter.status),
    )
    .sort((a, b) => a.outputItemId.localeCompare(b.outputItemId) || b.version - a.version)
    .slice(0, 500)
    .map(({ lines, ...bom }) => ({ ...bom, lineCount: lines.length }));
}

export function getDemoBom(bomId: string) {
  return boms.find((bom) => bom._id === bomId) ?? null;
}

export function getDemoWhereUsed(itemId: string) {
  return boms
    .filter((bom) => bom.status === BOM_STATUS.ACTIVE)
    .map((bom) => ({
      _id: bom._id,
      outputItemCode: bom.outputItemCode,
      version: bom.version,
      lines: bom.lines
        .filter((line) => line.itemId === itemId)
        .map((line) => ({ quantity: line.quantity, scrapPercent: line.scrapPercent })),
    }))
    .filter((bom) => bom.lines.length > 0);
}

export function getDemoBomTree(bomId: string) {
  const root = getDemoBom(bomId);
  if (!root) return null;
  const expand = (bom: DemoBom, path: string[]): BomTreeNodeDTO[] =>
    bom.lines.map((line) => {
      const item = itemById.get(line.itemId);
      if (!item) {
        return {
          itemId: line.itemId,
          code: line.itemCode,
          name: line.itemName,
          unit: line.unit,
          type: ITEM_TYPE.MATERIAL,
          quantity: line.quantity,
          scrapPercent: line.scrapPercent,
          missingBom: false,
          children: [],
        };
      }
      if (item.type !== ITEM_TYPE.SEMI) {
        return {
          itemId: item._id,
          code: item.code,
          name: item.name,
          unit: item.unit,
          type: item.type,
          quantity: line.quantity,
          scrapPercent: line.scrapPercent,
          missingBom: false,
          children: [],
        };
      }
      if (path.includes(item._id)) throw new Error("BOM_CIRCULAR_REFERENCE");
      const child = bomByOutput.get(item._id);
      return {
        itemId: item._id,
        code: item.code,
        name: item.name,
        unit: item.unit,
        type: item.type,
        quantity: line.quantity,
        scrapPercent: line.scrapPercent,
        missingBom: !child,
        children: child ? expand(child, [...path, item._id]) : [],
      };
    });

  return {
    bomId: root._id,
    outputItemCode: root.outputItemCode,
    version: root.version,
    status: root.status,
    tree: expand(root, [root.outputItemId]),
  };
}

function explodeBom(productId: string, quantity: string | number, tolerancePercent: number) {
  const result = new Map<string, { norm: Decimal; allowed: Decimal }>();
  const walk = (itemId: string, multiplier: Decimal, allowedMultiplier: Decimal, path: string[]) => {
    if (path.includes(itemId)) throw new Error("BOM_CIRCULAR_REFERENCE");
    const bom = bomByOutput.get(itemId);
    if (!bom) throw new Error(`BOM_NOT_FOUND:${itemId}`);

    for (const line of bom.lines) {
      const item = itemById.get(line.itemId);
      if (!item) throw new Error(`ITEM_NOT_FOUND:${line.itemCode}`);
      const norm = multiplier.mul(line.quantity);
      const tolerance = line.scrapPercent > 0 ? line.scrapPercent : item.type === ITEM_TYPE.SEMI ? 0 : tolerancePercent;
      const allowed = allowedMultiplier.mul(1 + tolerance / 100);
      if (item.type === ITEM_TYPE.SEMI) {
        walk(item._id, norm, allowed, [...path, itemId]);
      } else {
        const row = result.get(item._id) ?? { norm: new Decimal(0), allowed: new Decimal(0) };
        row.norm = row.norm.plus(norm);
        row.allowed = row.allowed.plus(norm.mul(allowed));
        result.set(item._id, row);
      }
    }
  };
  walk(productId, new Decimal(quantity), new Decimal(1), []);
  return result;
}

export function getDemoFillByBom(productId: string, quantity: string | number) {
  const product = itemById.get(productId);
  if (!product || product.type === ITEM_TYPE.MATERIAL) throw new Error("PRODUCT_NOT_FOUND");
  const needs = explodeBom(productId, quantity, 0);
  const lines = [...needs.entries()]
    .map(([itemId, need]) => {
      const item = itemById.get(itemId)!;
      return {
        itemId,
        itemCode: item.code,
        itemName: item.name,
        unit: item.unit,
        quantity: need.norm.toDecimalPlaces(item.decimalPlaces, Decimal.ROUND_UP).toString(),
        normQuantity: need.norm.toString(),
      };
    })
    .sort((a, b) => a.itemCode.localeCompare(b.itemCode));
  return {
    productionRef: { productId, productCode: product.code, productName: product.name, quantity: String(quantity) },
    lines,
  };
}

export function getDemoVouchers(filter: {
  direction?: string;
  type?: string;
  status?: string;
  period?: string;
  search?: string;
  page: number;
  pageSize: number;
}) {
  const search = filter.search?.toLocaleLowerCase();
  const filtered = vouchers
    .filter(
      (voucher) =>
        (!filter.direction || voucher.direction === filter.direction) &&
        (!filter.type || voucher.type === filter.type) &&
        (!filter.status || voucher.status === filter.status) &&
        (!filter.period || voucher.period === filter.period) &&
        (!search || voucher.voucherNo?.toLocaleLowerCase().startsWith(search)),
    )
    .sort(
      (a, b) => new Date(b.voucherDate).getTime() - new Date(a.voucherDate).getTime() || b._id.localeCompare(a._id),
    );
  const start = (filter.page - 1) * filter.pageSize;
  return {
    rows: filtered.slice(start, start + filter.pageSize).map(({ lines, ...voucher }) => ({
      ...voucher,
      lineCount: lines.length,
    })),
    total: filtered.length,
    page: filter.page,
    pageSize: filter.pageSize,
  };
}

export function getDemoVoucher(voucherId: string) {
  return vouchers.find((voucher) => voucher._id === voucherId) ?? null;
}

export function getDemoCurrentStock(filter: { type?: string; lowOnly: boolean; q?: string }) {
  const q = filter.q?.toLocaleLowerCase();
  return items
    .filter(
      (item) =>
        item.isActive &&
        item.isStocked &&
        (!filter.type || item.type === filter.type) &&
        (!q || item.code.toLocaleLowerCase().includes(q) || item.name.toLocaleLowerCase().includes(q)),
    )
    .map(itemStockRow)
    .filter((row) => !filter.lowOnly || row.isLow)
    .sort((a, b) => a.code.localeCompare(b.code));
}

export function getDemoStockSummary(from: Date, to: Date, type?: string) {
  const rows = items
    .filter((item) => item.isStocked && (!type || item.type === type))
    .map((item) => {
      const movements = transactions.filter(
        (transaction) => transaction.itemId === item._id && new Date(transaction.businessDate) < to,
      );
      if (movements.length === 0) return null;
      const opening = movements
        .filter((transaction) => new Date(transaction.businessDate) < from)
        .reduce((sum, transaction) => sum.plus(transaction.signedQuantity), new Decimal(0));
      const inQty = movements
        .filter((transaction) => isInRange(transaction.businessDate, from, to) && dec(transaction.signedQuantity).gt(0))
        .reduce((sum, transaction) => sum.plus(transaction.signedQuantity), new Decimal(0));
      const outQty = movements
        .filter((transaction) => isInRange(transaction.businessDate, from, to) && dec(transaction.signedQuantity).lt(0))
        .reduce((sum, transaction) => sum.plus(transaction.signedQuantity).abs(), new Decimal(0));
      return {
        itemId: item._id,
        code: item.code,
        name: item.name,
        unit: item.unit,
        type: item.type,
        opening: opening.toString(),
        in: inQty.toString(),
        out: outQty.toString(),
        closing: opening.plus(inQty).minus(outQty).toString(),
      };
    })
    .filter((row) => row !== null);
  return rows.sort((a, b) => a.code.localeCompare(b.code));
}

export function getDemoStockCard(itemId: string, from: Date, to: Date) {
  const item = itemById.get(itemId);
  const movements = transactions
    .filter((transaction) => transaction.itemId === itemId)
    .sort(
      (a, b) => new Date(a.businessDate).getTime() - new Date(b.businessDate).getTime() || a._id.localeCompare(b._id),
    );
  let running = movements
    .filter((transaction) => new Date(transaction.businessDate) < from)
    .reduce((sum, transaction) => sum.plus(transaction.signedQuantity), new Decimal(0));
  const opening = running.toString();
  const rows = movements
    .filter((transaction) => isInRange(transaction.businessDate, from, to))
    .map((movement) => {
      running = running.plus(movement.signedQuantity);
      const quantity = dec(movement.quantity);
      return {
        date: movement.businessDate,
        voucherNo: movement.voucherNo,
        voucherType: movement.voucherType,
        kind: movement.kind,
        in: movement.direction === "IN" ? quantity.toString() : "0",
        out: movement.direction === "OUT" ? quantity.toString() : "0",
        balance: running.toString(),
        postedBalance: movement.balanceAfter,
      };
    });
  return {
    item: item ? { code: item.code, name: item.name, unit: item.unit } : null,
    opening,
    rows,
  };
}

export function getDemoReconciliation(period: string, tolerancePercent = 2, onlyAbnormal = false) {
  const need = new Map<string, { norm: Decimal; allowed: Decimal }>();
  const skipped: { itemId: string; code: string; name: string; quantity: string }[] = [];
  const produced = new Map<string, Decimal>();
  const issued = new Map<string, Decimal>();

  for (const transaction of transactions.filter((row) => row.period === period)) {
    if (transaction.voucherType === VOUCHER_TYPE.IMPORT_PRODUCT) {
      const qty = produced.get(transaction.itemId) ?? new Decimal(0);
      produced.set(transaction.itemId, qty.plus(transaction.signedQuantity));
    }
    if (transaction.voucherType === VOUCHER_TYPE.EXPORT_PRODUCTION) {
      const qty = issued.get(transaction.itemId) ?? new Decimal(0);
      issued.set(transaction.itemId, qty.minus(transaction.signedQuantity));
    }
  }

  for (const [productId, quantity] of produced) {
    if (quantity.lte(0)) continue;
    let requirements: Map<string, { norm: Decimal; allowed: Decimal }>;
    try {
      requirements = explodeBom(productId, quantity.toString(), tolerancePercent);
    } catch (error) {
      if (!String((error as Error).message).startsWith("BOM_NOT_FOUND")) throw error;
      const product = itemById.get(productId);
      if (product)
        skipped.push({ itemId: productId, code: product.code, name: product.name, quantity: quantity.toString() });
      continue;
    }
    for (const [itemId, requirement] of requirements) {
      const row = need.get(itemId) ?? { norm: new Decimal(0), allowed: new Decimal(0) };
      row.norm = row.norm.plus(requirement.norm);
      row.allowed = row.allowed.plus(requirement.allowed);
      need.set(itemId, row);
    }
  }

  const ids = new Set([...need.keys(), ...issued.keys()]);
  const rank: Record<ReconRow["status"], number> = { OVER: 0, NO_NORM: 1, UNDER: 2, OK: 3 };
  const rows = [...ids]
    .map((itemId) => {
      const item = itemById.get(itemId)!;
      if (item.excludeFromReconciliation) return null;
      const norm = need.get(itemId)?.norm ?? new Decimal(0);
      const allowed = need.get(itemId)?.allowed ?? new Decimal(0);
      const actual = issued.get(itemId) ?? new Decimal(0);
      const diff = actual.minus(norm);
      const status: ReconRow["status"] =
        norm.isZero() && actual.gt(0) ? "NO_NORM" : actual.gt(allowed) ? "OVER" : actual.lt(norm) ? "UNDER" : "OK";
      return {
        itemId,
        code: item.code,
        name: item.name,
        unit: item.unit,
        norm: norm.toString(),
        allowed: allowed.toString(),
        actual: actual.toString(),
        diff: diff.toString(),
        diffPercent: norm.isZero() ? null : diff.div(norm).mul(100).toDecimalPlaces(2).toNumber(),
        status,
      };
    })
    .filter((row) => row !== null)
    .filter((row) => !onlyAbnormal || row.status !== "OK")
    .sort((a, b) => rank[a.status] - rank[b.status] || Math.abs(Number(b.diff)) - Math.abs(Number(a.diff)));
  return { rows, skipped };
}

export function getDemoOverview() {
  const now = new Date();
  const period = periodInVietnam(now);
  const previous = priorPeriod(period);
  const count = (
    p: string,
    status: DemoVoucher["status"] = VOUCHER_STATUS.CONFIRMED,
    direction?: DemoVoucher["direction"],
  ) =>
    vouchers.filter(
      (voucher) => voucher.period === p && voucher.status === status && (!direction || voucher.direction === direction),
    ).length;
  const stock = getDemoCurrentStock({ lowOnly: false });
  const low = stock
    .filter((row) => row.isLow)
    .sort((a, b) => {
      const ratioA = dec(a.minStock).isZero() ? 0 : dec(a.onHand).div(a.minStock).toNumber();
      const ratioB = dec(b.minStock).isZero() ? 0 : dec(b.onHand).div(b.minStock).toNumber();
      return ratioA - ratioB;
    });
  const from = new Date(now.getTime() - 29 * DAY_MS);
  const activity = Array.from({ length: 30 }, (_, index) => {
    const date = new Date(from.getTime() + index * DAY_MS);
    const key = ymdInVietnam(date);
    const daily = vouchers.filter(
      (voucher) => voucher.status === VOUCHER_STATUS.CONFIRMED && ymdInVietnam(new Date(voucher.voucherDate)) === key,
    );
    return {
      date: key,
      receipts: daily.filter((voucher) => voucher.direction === "IN").length,
      issues: daily.filter((voucher) => voucher.direction === "OUT").length,
    };
  });
  const recon = getDemoReconciliation(period, 2, true);

  return {
    period,
    kpis: {
      stockedItems: stock.length,
      belowMinimum: low.length,
      outOfStock: stock.filter((row) => dec(row.onHand).lte(0)).length,
      draftReceipts: count(period, VOUCHER_STATUS.DRAFT, "IN"),
      draftIssues: count(period, VOUCHER_STATUS.DRAFT, "OUT"),
      receipts: {
        current: count(period, VOUCHER_STATUS.CONFIRMED, "IN"),
        previous: count(previous, VOUCHER_STATUS.CONFIRMED, "IN"),
      },
      issues: {
        current: count(period, VOUCHER_STATUS.CONFIRMED, "OUT"),
        previous: count(previous, VOUCHER_STATUS.CONFIRMED, "OUT"),
      },
      cancelled: {
        current: count(period, VOUCHER_STATUS.CANCELLED),
        previous: count(previous, VOUCHER_STATUS.CANCELLED),
      },
      reconOver: recon.rows.filter((row) => row.status === "OVER").length,
      reconNoNorm: recon.rows.filter((row) => row.status === "NO_NORM").length,
      reconSkipped: recon.skipped.length,
    },
    activity,
    lowStock: low.slice(0, 8).map(({ itemId, code, name, unit, onHand, minStock }) => ({
      itemId,
      code,
      name,
      unit,
      onHand,
      minStock,
    })),
    recentVouchers: [...vouchers]
      .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
      .slice(0, 8)
      .map((voucher) => ({
        _id: voucher._id,
        voucherNo: voucher.voucherNo,
        type: voucher.type,
        direction: voucher.direction,
        status: voucher.status,
        voucherDate: voucher.voucherDate,
        lineCount: voucher.lines.length,
        updatedAt: voucher.updatedAt,
      })),
    reconIssues: recon.rows.filter((row) => row.status === "OVER" || row.status === "NO_NORM").slice(0, 6),
  };
}

export function getDemoUsers() {
  return users;
}
