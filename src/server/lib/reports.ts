import Decimal from "decimal.js";
import { Types } from "mongoose";

import { Item } from "@/server/models/item";
import { StockTransaction } from "@/server/models/stock-transaction";

import { explodeBom } from "./bom-explode";

const dec = (v: any) => new Decimal(v ? v.toString() : 0);

/** Converts a "YYYY-MM-DD" date in Vietnam time to a UTC instant (00:00 Vietnam time) */
export const vnDayStart = (ymd: string) => new Date(`${ymd}T00:00:00+07:00`);

/**
 * Stock Summary (opening / in / out / closing) for [from, to)
 * Reversals (voucher cancellations) count in the period of cancellation: cancelling an export voucher shows up in the In column of that period.
 */
export async function getStockSummary(from: Date, to: Date, type?: "MATERIAL" | "PRODUCT") {
  const zero = { $toDecimal: 0 };
  const rows = await StockTransaction.aggregate([
    { $match: { businessDate: { $lt: to } } },
    {
      $group: {
        _id: "$itemId",
        opening: { $sum: { $cond: [{ $lt: ["$businessDate", from] }, "$signedQuantity", zero] } },
        inQty: {
          $sum: {
            $cond: [
              { $and: [{ $gte: ["$businessDate", from] }, { $gt: ["$signedQuantity", zero] }] },
              "$signedQuantity",
              zero,
            ],
          },
        },
        outQty: {
          $sum: {
            $cond: [
              { $and: [{ $gte: ["$businessDate", from] }, { $lt: ["$signedQuantity", zero] }] },
              { $multiply: ["$signedQuantity", -1] },
              zero,
            ],
          },
        },
      },
    },
    { $lookup: { from: "items", localField: "_id", foreignField: "_id", as: "item" } },
    { $unwind: "$item" },
    ...(type ? [{ $match: { "item.type": type } }] : []),
    { $sort: { "item.code": 1 } },
  ]);

  return rows.map((r) => {
    const opening = dec(r.opening),
      inQty = dec(r.inQty),
      outQty = dec(r.outQty);
    return {
      itemId: String(r._id),
      code: r.item.code,
      name: r.item.name,
      unit: r.item.unit,
      type: r.item.type,
      opening: opening.toString(),
      in: inQty.toString(),
      out: outQty.toString(),
      closing: opening.plus(inQty).minus(outQty).toString(),
    };
  });
}

export type ReconStatus = "OVER" | "NO_NORM" | "UNDER" | "OK";

/**
 * Monthly norm reconciliation ("YYYY-MM", Vietnam time):
 * - Finished products received in the month (IMPORT_PRODUCT, net of cancellations) x current ACTIVE BOM => theoretical requirement
 * - Compared with materials actually issued (EXPORT_PRODUCTION, net of cancellations)
 * * Items with excludeFromReconciliation are skipped.
 */
export async function getMonthlyReconciliation(period: string, defaultTolerancePercent = 2, onlyAbnormal = false) {
  const [produced, issued] = await Promise.all([
    StockTransaction.aggregate([
      { $match: { period, voucherType: "IMPORT_PRODUCT" } },
      { $group: { _id: "$itemId", qty: { $sum: "$signedQuantity" } } },
    ]),
    StockTransaction.aggregate([
      { $match: { period, voucherType: "EXPORT_PRODUCTION" } },
      { $group: { _id: "$itemId", qty: { $sum: { $multiply: ["$signedQuantity", -1] } } } },
    ]),
  ]);

  // Theoretical requirement, merged across all finished products.
  // A product without an ACTIVE BOM (or with a semi-finished level lacking one) cannot be expanded: it is skipped
  // and reported, so one missing BOM does not break the whole report.
  const need = new Map<string, { norm: Decimal; allowed: Decimal }>();
  const skippedProducts: { id: string; quantity: string }[] = [];
  for (const p of produced) {
    const q = dec(p.qty);
    if (q.lte(0)) continue;
    let part: Awaited<ReturnType<typeof explodeBom>>;
    try {
      part = await explodeBom(p._id, q, { defaultTolerancePercent });
    } catch (e) {
      if (String((e as Error).message).startsWith("BOM_NOT_FOUND")) {
        skippedProducts.push({ id: p._id, quantity: q.toString() });
        continue;
      }
      throw e;
    }
    for (const [id, n] of part) {
      const cur = need.get(id) ?? { norm: new Decimal(0), allowed: new Decimal(0) };
      cur.norm = cur.norm.plus(n.norm);
      cur.allowed = cur.allowed.plus(n.allowed);
      need.set(id, cur);
    }
  }

  const actual = new Map<string, Decimal>(issued.map((i) => [String(i._id), dec(i.qty)]));

  const ids = [...new Set([...need.keys(), ...actual.keys()])];
  const items = await Item.find({ _id: { $in: ids.map((i) => new Types.ObjectId(i)) } }).lean();

  const rank: Record<ReconStatus, number> = { OVER: 0, NO_NORM: 1, UNDER: 2, OK: 3 };
  let rows = items
    .filter((it) => !it.excludeFromReconciliation)
    .map((it) => {
      const id = String(it._id);
      const norm = need.get(id)?.norm ?? new Decimal(0);
      const allowed = need.get(id)?.allowed ?? new Decimal(0);
      const act = actual.get(id) ?? new Decimal(0);
      const diff = act.minus(norm);
      let status: ReconStatus = "OK";
      if (norm.isZero() && act.gt(0)) status = "NO_NORM";
      else if (act.gt(allowed)) status = "OVER";
      else if (act.lt(norm)) status = "UNDER";
      return {
        itemId: id,
        code: it.code,
        name: it.name,
        unit: it.unit,
        norm: norm.toString(),
        allowed: allowed.toString(),
        actual: act.toString(),
        diff: diff.toString(),
        diffPercent: norm.isZero() ? null : diff.div(norm).mul(100).toDecimalPlaces(2).toNumber(),
        status,
      };
    });

  if (onlyAbnormal) rows = rows.filter((r) => r.status !== "OK");
  rows.sort((a, b) => rank[a.status] - rank[b.status] || Math.abs(Number(b.diff)) - Math.abs(Number(a.diff)));
  const skippedItems = await Item.find({ _id: { $in: skippedProducts.map((x) => new Types.ObjectId(x.id)) } }).lean();
  const skipped = skippedProducts.map((x) => {
    const item = skippedItems.find((i) => String(i._id) === x.id);
    return { itemId: x.id, code: item?.code ?? x.id, name: item?.name ?? "", quantity: x.quantity };
  });

  return { rows, skipped };
}

/** Current stock per item (the "Stock" screen). Items without a movement yet show 0. */
export async function getCurrentStock(f: { type?: "MATERIAL" | "PRODUCT"; lowOnly: boolean; q?: string }) {
  const match: any = { isActive: true, isStocked: true };
  if (f.type) match.type = f.type;
  if (f.q) {
    const re = new RegExp(f.q.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, "\\$&"), "i");
    match.$or = [{ code: re }, { name: re }];
  }

  const zero = { $toDecimal: 0 };
  const rows = await Item.aggregate([
    { $match: match },
    { $lookup: { from: "inventories", localField: "_id", foreignField: "itemId", as: "inv" } },
    {
      $addFields: {
        onHand: { $ifNull: [{ $arrayElemAt: ["$inv.onHand", 0] }, zero] },
      },
    },
    { $addFields: { isLow: { $lt: ["$onHand", { $ifNull: ["$minStock", zero] }] } } },
    ...(f.lowOnly ? [{ $match: { isLow: true } }] : []),
    { $sort: { code: 1 } },
    { $project: { inv: 0 } },
  ]);
  return rows.map((r) => ({
    itemId: String(r._id),
    code: r.code,
    name: r.name,
    unit: r.unit,
    type: r.type,
    group: r.group,
    onHand: dec(r.onHand).toString(),
    minStock: dec(r.minStock).toString(),
    isLow: r.isLow as boolean,
  }));
}

/** Stock card for one item over [from, to): opening balance plus every movement with its running balance */
export async function getStockCard(itemId: string, from: Date, to: Date) {
  const id = new Types.ObjectId(itemId);
  const [openingAgg, moves, item] = await Promise.all([
    StockTransaction.aggregate([
      { $match: { itemId: id, businessDate: { $lt: from } } },
      { $group: { _id: null, qty: { $sum: "$signedQuantity" } } },
    ]),
    StockTransaction.find({ itemId: id, businessDate: { $gte: from, $lt: to } })
      .sort({ businessDate: 1, _id: 1 })
      .lean(),
    Item.findById(id).lean(),
  ]);

  let running = dec(openingAgg[0]?.qty);
  return {
    item: item ? { code: item.code, name: item.name, unit: item.unit } : null,
    opening: dec(openingAgg[0]?.qty).toString(),
    // Running balance is recomputed in date order (opening + cumulative movements) so it is always monotonic
    // even when a voucher is back-dated. `postedBalance` is the balance at the moment the entry was posted.
    rows: moves.map((m) => {
      running = running.plus(dec(m.signedQuantity));
      return {
        date: m.businessDate,
        voucherNo: m.voucherNo,
        voucherType: m.voucherType,
        kind: m.kind,
        in: m.direction === "IN" ? m.quantity.toString() : "0",
        out: m.direction === "OUT" ? m.quantity.toString() : "0",
        balance: running.toString(),
        postedBalance: m.balanceAfter.toString(),
      };
    }),
  };
}
