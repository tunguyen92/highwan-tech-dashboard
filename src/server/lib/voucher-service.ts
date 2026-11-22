import Decimal from "decimal.js";
import mongoose, { type ClientSession, Types } from "mongoose";

import { ITEM_TYPE, maxQuantityDecimalPlacesForUnit } from "@/lib/wms/constants";
import { Counter } from "@/server/models/counter";
import { Inventory } from "@/server/models/inventory";
import { Item } from "@/server/models/item";
import { type IStockTransaction, StockTransaction } from "@/server/models/stock-transaction";
import { VOUCHER_RULES, VOUCHER_STATUS, Voucher } from "@/server/models/voucher";

import { explodeBom } from "./bom-explode";
import { D, decimalsOf, isPositive, negate, vnPeriod, vnYear } from "./decimal";

/**
 * Updates stock and returns the balance after the movement.
 * - IN: adds (upserts the inventory row if missing)
 * - OUT: only subtracts when onHand >= qty (the condition is part of the update itself, so stock cannot go negative even when two vouchers run concurrently)
 */
async function applyMovement(
  session: ClientSession,
  itemId: Types.ObjectId,
  direction: "IN" | "OUT",
  qty: Types.Decimal128,
  errorCode: string,
  itemCode: string,
): Promise<Types.Decimal128> {
  if (direction === "IN") {
    const inv = await Inventory.findOneAndUpdate(
      { itemId },
      { $inc: { onHand: qty } },
      { upsert: true, returnDocument: "after", session },
    );
    return inv?.onHand;
  }
  const inv = await Inventory.findOneAndUpdate(
    { itemId, onHand: { $gte: qty } },
    { $inc: { onHand: negate(qty) } },
    { returnDocument: "after", session },
  );
  if (!inv) throw new Error(`${errorCode}:${itemCode}`);
  return inv.onHand;
}

async function nextVoucherNo(session: ClientSession, prefix: string, date: Date) {
  const year = vnYear(date);
  const c = await Counter.findOneAndUpdate(
    { _id: `${prefix}-${year}` },
    { $inc: { seq: 1 } },
    { upsert: true, returnDocument: "after", session },
  );
  return `${prefix}-${year}-${String(c?.seq).padStart(5, "0")}`;
}

/** Confirms a voucher: posts to the stock ledger in a single transaction */
export async function confirmVoucher(voucherId: string, userId: string) {
  const session = await mongoose.startSession();
  try {
    let result: any;
    await session.withTransaction(async () => {
      // Atomically "claim" the voucher: confirming twice still succeeds only once
      const v = await Voucher.findOneAndUpdate(
        { _id: voucherId, status: VOUCHER_STATUS.DRAFT },
        { $set: { status: VOUCHER_STATUS.CONFIRMED, confirmedBy: userId, confirmedAt: new Date() } },
        { returnDocument: "after", session },
      );
      if (!v) throw new Error("VOUCHER_NOT_DRAFT");
      if (v.lines.length === 0) throw new Error("VOUCHER_EMPTY");

      const rule = VOUCHER_RULES[v.type];

      // Validate items against their current records
      const items = await Item.find({ _id: { $in: v.lines.map((l) => l.itemId) } }).session(session);
      const byId = new Map(items.map((i) => [String(i._id), i]));
      for (const l of v.lines) {
        const it = byId.get(String(l.itemId));
        if (!it) throw new Error(`ITEM_NOT_FOUND:${l.itemCode}`);
        if (!it.isActive) throw new Error(`ITEM_INACTIVE:${it.code}`);
        if (!it.isStocked) throw new Error(`ITEM_NOT_STOCKED:${it.code}`);
        if (rule.direction === "IN" && !rule.allowed.includes(it.type)) {
          throw new Error(`ITEM_TYPE_NOT_ALLOWED:${it.code}`);
        }
        if (!isPositive(l.quantity)) throw new Error(`QTY_MUST_BE_POSITIVE:${it.code}`);
        if (decimalsOf(l.quantity) > maxQuantityDecimalPlacesForUnit(it.unit)) {
          throw new Error(`QTY_TOO_MANY_DECIMALS:${it.code}`);
        }
        if (l.remarkQuantity) {
          if (!l.remarkUnit) throw new Error(`REMARK_UNIT_REQUIRED:${it.code}`);
          if (decimalsOf(l.remarkQuantity) > maxQuantityDecimalPlacesForUnit(l.remarkUnit)) {
            throw new Error(`QTY_TOO_MANY_DECIMALS:${it.code}`);
          }
        }
      }

      const bomConsumption = new Map<string, Decimal>();
      if (rule.direction === "OUT") {
        for (const line of v.lines) {
          const item = byId.get(String(line.itemId));
          if (item?.type !== ITEM_TYPE.PRODUCT) continue;

          const needs = await explodeBom(item._id, line.quantity.toString(), { session });
          for (const [itemId, need] of needs) {
            bomConsumption.set(itemId, (bomConsumption.get(itemId) ?? new Decimal(0)).plus(need.norm));
          }
        }
      }

      const componentItems = await Item.find({ _id: { $in: [...bomConsumption.keys()] } }).session(session);
      const componentById = new Map(componentItems.map((item) => [String(item._id), item]));
      const bomLines = [...bomConsumption.entries()]
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([itemId, quantity], index) => {
          const item = componentById.get(itemId);
          if (!item) throw new Error(`ITEM_NOT_FOUND:${itemId}`);
          if (!item.isActive) throw new Error(`ITEM_INACTIVE:${item.code}`);
          if (!item.isStocked) throw new Error(`ITEM_NOT_STOCKED:${item.code}`);
          if (item.type !== ITEM_TYPE.MATERIAL) throw new Error(`ITEM_TYPE_NOT_ALLOWED:${item.code}`);

          const roundedQuantity = D(
            quantity.toDecimalPlaces(maxQuantityDecimalPlacesForUnit(item.unit), Decimal.ROUND_UP).toString(),
          );
          if (!isPositive(roundedQuantity)) throw new Error(`QTY_MUST_BE_POSITIVE:${item.code}`);
          if (decimalsOf(roundedQuantity) > maxQuantityDecimalPlacesForUnit(item.unit)) {
            throw new Error(`QTY_TOO_MANY_DECIMALS:${item.code}`);
          }
          return {
            lineNo: v.lines.length + index + 1,
            itemId: item._id,
            itemCode: item.code,
            quantity: roundedQuantity,
          };
        });

      v.voucherNo = await nextVoucherNo(session, rule.prefix, v.voucherDate);
      await v.save({ session });

      // Process in itemId order so concurrent vouchers touch items in the same order (fewer write conflicts)
      const movements = [
        ...v.lines.map((line) => ({
          lineNo: line.lineNo,
          itemId: line.itemId,
          itemCode: line.itemCode,
          quantity: line.quantity,
        })),
        ...bomLines,
      ].sort((a, b) => String(a.itemId).localeCompare(String(b.itemId)) || a.lineNo - b.lineNo);
      const txs: Partial<IStockTransaction>[] = [];
      for (const l of movements) {
        const balance = await applyMovement(
          session,
          l.itemId,
          rule.direction,
          l.quantity,
          "INSUFFICIENT_STOCK",
          l.itemCode,
        );
        txs.push({
          kind: "POST",
          voucherId: v._id,
          voucherNo: v.voucherNo!,
          voucherType: v.type,
          lineNo: l.lineNo,
          itemId: l.itemId,
          itemCode: l.itemCode,
          direction: rule.direction,
          quantity: l.quantity,
          signedQuantity: rule.direction === "IN" ? l.quantity : negate(l.quantity),
          balanceAfter: balance,
          businessDate: v.voucherDate,
          period: v.period,
          createdBy: new Types.ObjectId(userId),
        });
      }
      await StockTransaction.insertMany(txs, { session, ordered: true });
      result = v.toObject();
    });
    return result;
  } finally {
    await session.endSession();
  }
}

/**
 * Cancels a confirmed voucher: writes REVERSAL transactions, history is never deleted.
 * - Cancelling an import subtracts the stock again => fails with INSUFFICIENT_STOCK_FOR_CANCEL if the goods were already issued.
 * - Cancelling an export adds the stock back.
 * - Reversals are dated on the CANCELLATION date (already-reported past periods are not altered).
 */
export async function cancelVoucher(voucherId: string, userId: string, reason: string) {
  if (!reason?.trim()) throw new Error("CANCEL_REASON_REQUIRED");
  const session = await mongoose.startSession();
  try {
    await session.withTransaction(async () => {
      const now = new Date();
      const v = await Voucher.findOneAndUpdate(
        { _id: voucherId, status: VOUCHER_STATUS.CONFIRMED },
        {
          $set: {
            status: VOUCHER_STATUS.CANCELLED,
            cancelledBy: userId,
            cancelledAt: now,
            cancelReason: reason.trim(),
          },
        },
        { returnDocument: "after", session },
      );
      if (!v) throw new Error("VOUCHER_NOT_CONFIRMED");

      const originals = await StockTransaction.find({ voucherId: v._id, kind: "POST" }).session(session);
      if (originals.length === 0) throw new Error("NO_TRANSACTIONS_TO_REVERSE");
      originals.sort((a, b) => String(a.itemId).localeCompare(String(b.itemId)));

      const txs: Partial<IStockTransaction>[] = [];
      for (const o of originals) {
        const dir = o.direction === "IN" ? "OUT" : "IN";
        const balance = await applyMovement(
          session,
          o.itemId,
          dir,
          o.quantity,
          "INSUFFICIENT_STOCK_FOR_CANCEL",
          o.itemCode,
        );
        txs.push({
          kind: "REVERSAL",
          voucherId: v._id,
          voucherNo: o.voucherNo,
          voucherType: o.voucherType,
          lineNo: o.lineNo,
          itemId: o.itemId,
          itemCode: o.itemCode,
          direction: dir,
          quantity: o.quantity,
          signedQuantity: dir === "IN" ? o.quantity : negate(o.quantity),
          balanceAfter: balance,
          businessDate: now,
          period: vnPeriod(now),
          reversalOf: o._id,
          createdBy: new Types.ObjectId(userId),
        });
      }
      await StockTransaction.insertMany(txs, { session, ordered: true });
    });
  } finally {
    await session.endSession();
  }
}
