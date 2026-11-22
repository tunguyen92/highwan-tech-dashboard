import Decimal from "decimal.js";

import { Voucher } from "@/server/models/voucher";

import { vnPeriod } from "./decimal";
import { getCurrentStock, getMonthlyReconciliation, vnDayStart } from "./reports";

const DAY_MS = 24 * 3600_000;
const ACTIVITY_DAYS = 30;

const previousPeriod = (period: string) => {
  const [y, m] = period.split("-").map(Number);
  return m === 1 ? `${y - 1}-12` : `${y}-${String(m - 1).padStart(2, "0")}`;
};

/** Counts vouchers grouped by "direction:status" for one period */
async function countVouchers(period: string) {
  const rows = await Voucher.aggregate([
    { $match: { period } },
    { $group: { _id: { direction: "$direction", status: "$status" }, count: { $sum: 1 } } },
  ]);
  const get = (direction: "IN" | "OUT" | null, status: string) =>
    rows
      .filter((r) => r._id.status === status && (direction === null || r._id.direction === direction))
      .reduce((sum, r) => sum + r.count, 0);
  return {
    receipts: get("IN", "CONFIRMED"),
    issues: get("OUT", "CONFIRMED"),
    cancelled: get(null, "CANCELLED"),
  };
}

/** Everything the administrator overview screen shows, in one round trip */
export async function getOverview() {
  const now = new Date();
  const period = vnPeriod(now);
  const todayYmd = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Ho_Chi_Minh" }).format(now);
  const activityFrom = new Date(vnDayStart(todayYmd).getTime() - (ACTIVITY_DAYS - 1) * DAY_MS);

  const [stock, current, previous, drafts, daily, recent, recon] = await Promise.all([
    getCurrentStock({ lowOnly: false }),
    countVouchers(period),
    countVouchers(previousPeriod(period)),
    Voucher.aggregate([{ $match: { status: "DRAFT" } }, { $group: { _id: "$direction", count: { $sum: 1 } } }]),
    Voucher.aggregate([
      { $match: { status: "CONFIRMED", voucherDate: { $gte: activityFrom } } },
      {
        $group: {
          _id: {
            day: { $dateToString: { format: "%Y-%m-%d", date: "$voucherDate", timezone: "+07:00" } },
            direction: "$direction",
          },
          count: { $sum: 1 },
        },
      },
    ]),
    Voucher.find({}, "voucherNo type direction status voucherDate lines updatedAt")
      .sort({ updatedAt: -1 })
      .limit(8)
      .lean(),
    getMonthlyReconciliation(period, 2, true),
  ]);

  const low = stock.filter((r) => r.isLow);
  const draftOf = (direction: "IN" | "OUT") => drafts.find((d) => d._id === direction)?.count ?? 0;

  const perDay = new Map<string, { receipts: number; issues: number }>();
  for (const r of daily) {
    const cell = perDay.get(r._id.day) ?? { receipts: 0, issues: 0 };
    cell[r._id.direction === "IN" ? "receipts" : "issues"] += r.count;
    perDay.set(r._id.day, cell);
  }
  const activity = Array.from({ length: ACTIVITY_DAYS }, (_, i) => {
    const date = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Ho_Chi_Minh" }).format(
      new Date(activityFrom.getTime() + i * DAY_MS),
    );
    return { date, receipts: perDay.get(date)?.receipts ?? 0, issues: perDay.get(date)?.issues ?? 0 };
  });

  return {
    period,
    kpis: {
      stockedItems: stock.length,
      belowMinimum: low.length,
      outOfStock: stock.filter((r) => new Decimal(r.onHand).lte(0)).length,
      draftReceipts: draftOf("IN"),
      draftIssues: draftOf("OUT"),
      receipts: { current: current.receipts, previous: previous.receipts },
      issues: { current: current.issues, previous: previous.issues },
      cancelled: { current: current.cancelled, previous: previous.cancelled },
      reconOver: recon.rows.filter((r) => r.status === "OVER").length,
      reconNoNorm: recon.rows.filter((r) => r.status === "NO_NORM").length,
      reconSkipped: recon.skipped.length,
    },
    activity,
    // Worst shortfall first (on hand relative to the minimum level)
    lowStock: low
      .map((r) => ({
        r,
        ratio: new Decimal(r.minStock).isZero() ? 0 : new Decimal(r.onHand).div(r.minStock).toNumber(),
      }))
      .sort((a, b) => a.ratio - b.ratio)
      .slice(0, 8)
      .map(({ r }) => ({
        itemId: r.itemId,
        code: r.code,
        name: r.name,
        unit: r.unit,
        onHand: r.onHand,
        minStock: r.minStock,
      })),
    recentVouchers: recent.map((v) => ({
      _id: String(v._id),
      voucherNo: v.voucherNo,
      type: v.type,
      direction: v.direction,
      status: v.status,
      voucherDate: v.voucherDate,
      lineCount: v.lines.length,
      updatedAt: v.updatedAt,
    })),
    reconIssues: recon.rows.filter((r) => r.status === "OVER" || r.status === "NO_NORM").slice(0, 6),
  };
}
