import { maxQuantityDecimalPlacesForUnit, type VoucherRemarkUnit } from "@/lib/wms/constants";
import { Item } from "@/server/models/item";
import { VOUCHER_RULES, VOUCHER_STATUS, Voucher, type VoucherType } from "@/server/models/voucher";

import { D, decimalsOf, isPositive, vnPeriod } from "./decimal";

export type DraftInput = {
  type: VoucherType;
  voucherDate: Date;
  documentNumber?: string;
  batchNote?: string;
  note?: string;
  lines: {
    itemId: string;
    quantity: string | number;
    remarkQuantity?: string | number;
    remarkUnit?: VoucherRemarkUnit;
    note?: string;
  }[];
};

/** Builds voucher data, snapshots item info into each line and validates early so users see errors when saving a draft */
async function build(input: DraftInput) {
  const rule = VOUCHER_RULES[input.type];
  if (!rule) throw new Error("VOUCHER_TYPE_INVALID");

  const ids = input.lines.map((l) => l.itemId);
  if (new Set(ids).size !== ids.length) throw new Error("VOUCHER_DUPLICATE_ITEM");

  const items = await Item.find({ _id: { $in: ids } }).lean();
  const byId = new Map(items.map((i) => [String(i._id), i]));

  const lines = input.lines.map((l, idx) => {
    const it = byId.get(String(l.itemId));
    if (!it) throw new Error(`ITEM_NOT_FOUND:${l.itemId}`);
    if (!it.isActive) throw new Error(`ITEM_INACTIVE:${it.code}`);
    if (!it.isStocked) throw new Error(`ITEM_NOT_STOCKED:${it.code}`);
    if (rule.direction === "IN" && !rule.allowed.includes(it.type)) {
      throw new Error(`ITEM_TYPE_NOT_ALLOWED:${it.code}`);
    }
    const qty = D(l.quantity);
    if (!isPositive(qty)) throw new Error(`QTY_MUST_BE_POSITIVE:${it.code}`);
    if (decimalsOf(qty) > maxQuantityDecimalPlacesForUnit(it.unit)) {
      throw new Error(`QTY_TOO_MANY_DECIMALS:${it.code}`);
    }
    const remarkQuantity = l.remarkQuantity !== undefined ? D(l.remarkQuantity) : undefined;
    if (remarkQuantity && !isPositive(remarkQuantity)) throw new Error(`REMARK_QTY_MUST_BE_POSITIVE:${it.code}`);
    if (remarkQuantity && !l.remarkUnit) throw new Error(`REMARK_UNIT_REQUIRED:${it.code}`);
    if (remarkQuantity && decimalsOf(remarkQuantity) > maxQuantityDecimalPlacesForUnit(l.remarkUnit ?? "")) {
      throw new Error(`QTY_TOO_MANY_DECIMALS:${it.code}`);
    }
    return {
      lineNo: idx + 1,
      itemId: it._id,
      itemCode: it.code,
      itemName: it.name,
      unit: it.unit,
      quantity: qty,
      remarkQuantity,
      remarkUnit: l.remarkUnit,
      note: l.note,
    };
  });

  return {
    type: input.type,
    direction: rule.direction,
    voucherDate: input.voucherDate,
    documentNumber: input.documentNumber,
    period: vnPeriod(input.voucherDate),
    batchNote: input.batchNote,
    note: input.note,
    lines,
  };
}

export async function createDraftVoucher(input: DraftInput, userId: string) {
  const data = await build(input);
  return Voucher.create({ ...data, status: VOUCHER_STATUS.DRAFT, createdBy: userId });
}

/** Only editable while DRAFT (the condition is part of the update itself, so a voucher that was just confirmed is never overwritten) */
export async function updateDraftVoucher(voucherId: string, input: DraftInput) {
  const data = await build(input);
  const unset: Record<string, string> = { productionRef: "" };
  if (!data.documentNumber) unset.documentNumber = "";
  const res = await Voucher.updateOne(
    { _id: voucherId, status: VOUCHER_STATUS.DRAFT },
    { $set: data, ...(Object.keys(unset).length ? { $unset: unset } : {}) },
  );
  if (res.matchedCount === 0) throw new Error("VOUCHER_NOT_EDITABLE");
}

export async function deleteDraftVoucher(voucherId: string) {
  const res = await Voucher.deleteOne({ _id: voucherId, status: VOUCHER_STATUS.DRAFT });
  if (res.deletedCount === 0) throw new Error("VOUCHER_NOT_EDITABLE");
}
