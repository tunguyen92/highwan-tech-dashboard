import type { Types } from "mongoose";

import { Bom } from "@/server/models/bom";
import { Inventory } from "@/server/models/inventory";
import { Item } from "@/server/models/item";
import { StockTransaction } from "@/server/models/stock-transaction";
import { Voucher } from "@/server/models/voucher";

import { D } from "./decimal";

// Changing any of these after the item has been used would corrupt history or snapshots
const LOCKED_WHEN_REFERENCED = ["code", "type", "unit", "decimalPlaces"] as const;

const escapeRegex = (s: string) => s.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, "\\$&");

/** True when the item appears in any voucher, ledger entry or BOM */
export async function isItemReferenced(itemId: string | Types.ObjectId) {
  const [tx, voucher, bom] = await Promise.all([
    StockTransaction.exists({ itemId }),
    Voucher.exists({ "lines.itemId": itemId }),
    Bom.exists({ $or: [{ outputItemId: itemId }, { "lines.itemId": itemId }] }),
  ]);
  return Boolean(tx || voucher || bom);
}

type ItemListFilter = { type?: string; q?: string; includeInactive: boolean };

function buildItemFilter(f: ItemListFilter) {
  const filter: any = {};
  if (f.type) filter.type = f.type;
  if (!f.includeInactive) filter.isActive = true;
  if (f.q) {
    const re = new RegExp(escapeRegex(f.q), "i");
    filter.$or = [{ code: re }, { name: re }, { spec: re }];
  }
  return filter;
}

export async function listItems(f: ItemListFilter) {
  const filter = buildItemFilter(f);
  return Item.find(filter).sort({ code: 1 }).limit(1000).lean();
}

export async function listItemsPage(f: ItemListFilter & { page: number; pageSize: number }) {
  const filter = buildItemFilter(f);
  const [rows, total] = await Promise.all([
    Item.find(filter)
      .sort({ code: 1, _id: 1 })
      .skip((f.page - 1) * f.pageSize)
      .limit(f.pageSize)
      .lean(),
    Item.countDocuments(filter),
  ]);
  return { rows, total, page: f.page, pageSize: f.pageSize };
}

export async function createItem(input: any) {
  return Item.create({
    ...input,
    minStock: D(input.minStock ?? "0"),
    price: input.price === undefined ? undefined : D(input.price),
  });
}

export async function updateItem(itemId: string, patch: Record<string, any>) {
  const item = await Item.findById(itemId);
  if (!item) throw new Error("ITEM_NOT_FOUND");

  const changesLocked = LOCKED_WHEN_REFERENCED.some(
    (k) => patch[k] !== undefined && String(patch[k]).toUpperCase() !== String(item.get(k)).toUpperCase(),
  );
  if (changesLocked && (await isItemReferenced(item._id))) throw new Error("ITEM_FIELD_LOCKED");

  if (patch.minStock !== undefined) patch.minStock = D(patch.minStock);
  if (patch.price !== undefined) patch.price = D(patch.price);
  item.set(patch);
  await item.save();
  return item.toObject();
}

export async function setItemActive(itemId: string, isActive: boolean) {
  if (!isActive) {
    const inv = await Inventory.findOne({ itemId }).lean();
    if (inv && parseFloat(inv.onHand.toString()) > 0) throw new Error("ITEM_HAS_STOCK");
  }
  const res = await Item.updateOne({ _id: itemId }, { $set: { isActive } });
  if (res.matchedCount === 0) throw new Error("ITEM_NOT_FOUND");
}
