import { Types } from "mongoose";

import { QTY_MAX_DECIMAL_PLACES } from "@/lib/wms/constants";
import { BOM_STATUS, Bom } from "@/server/models/bom";
import { ITEM_TYPE, Item } from "@/server/models/item";

import { D, decimalsOf, isPositive } from "./decimal";

type LineInput = { itemId: string; quantity: string | number; scrapPercent?: number; note?: string };

/** Snapshots item info into BOM lines and validates them early (cycle check happens on activation) */
async function buildLines(outputItemId: string, lines: LineInput[]) {
  const out = await Item.findById(outputItemId).lean();
  if (!out) throw new Error("ITEM_NOT_FOUND");
  if (out.type === ITEM_TYPE.MATERIAL) throw new Error("BOM_OUTPUT_MUST_BE_PRODUCT_OR_SEMI");

  const ids = lines.map((l) => l.itemId);
  if (new Set(ids).size !== ids.length) throw new Error("BOM_DUPLICATE_LINE");
  if (ids.includes(String(outputItemId))) throw new Error("BOM_SELF_REFERENCE");

  const items = await Item.find({ _id: { $in: ids } }).lean();
  const byId = new Map(items.map((i) => [String(i._id), i]));

  const built = lines.map((l) => {
    const it = byId.get(String(l.itemId));
    if (!it) throw new Error("BOM_LINE_ITEM_NOT_FOUND");
    if (!it.isActive) throw new Error(`BOM_ITEM_INACTIVE:${it.code}`);
    if (it.type === ITEM_TYPE.PRODUCT) throw new Error(`BOM_LINE_CANNOT_BE_PRODUCT:${it.code}`);
    const q = D(l.quantity);
    if (!isPositive(q)) throw new Error("BOM_QTY_MUST_BE_POSITIVE");
    // BOM quantities are per ONE unit of output, so they may need more decimals than the stock unit allows
    if (decimalsOf(q) > QTY_MAX_DECIMAL_PLACES) throw new Error(`QTY_TOO_MANY_DECIMALS:${it.code}`);
    return {
      itemId: it._id,
      itemCode: it.code,
      itemName: it.name,
      unit: it.unit,
      quantity: q,
      scrapPercent: l.scrapPercent ?? 0,
      note: l.note,
    };
  });
  return { out, built };
}

export async function createBomDraft(
  outputItemId: string,
  lines: LineInput[],
  note: string | undefined,
  userId: string,
) {
  const { out, built } = await buildLines(outputItemId, lines);
  if (await Bom.exists({ outputItemId, status: BOM_STATUS.DRAFT })) throw new Error("BOM_DRAFT_EXISTS");

  const last = await Bom.findOne({ outputItemId }).sort({ version: -1 }).select("version").lean();
  return Bom.create({
    outputItemId: out._id,
    outputItemCode: out.code,
    version: (last?.version ?? 0) + 1, // unique index (outputItemId, version) guards against races
    status: BOM_STATUS.DRAFT,
    lines: built,
    note,
    createdBy: userId,
  });
}

/** Only DRAFT BOMs can change; the status condition is part of the update itself */
export async function updateBomDraft(bomId: string, lines: LineInput[], note?: string) {
  const bom = await Bom.findById(bomId).select("outputItemId").lean();
  if (!bom) throw new Error("BOM_NOT_FOUND");
  const { built } = await buildLines(String(bom.outputItemId), lines);

  const res = await Bom.updateOne({ _id: bomId, status: BOM_STATUS.DRAFT }, { $set: { lines: built, note } });
  if (res.matchedCount === 0) throw new Error("BOM_NOT_EDITABLE");
}

export async function deleteBomDraft(bomId: string) {
  const res = await Bom.deleteOne({ _id: bomId, status: BOM_STATUS.DRAFT });
  if (res.deletedCount === 0) throw new Error("BOM_NOT_EDITABLE");
}

/** Starts a new version from an existing one (typically the ACTIVE BOM) */
export async function cloneBomAsDraft(bomId: string, userId: string) {
  const src = await Bom.findById(bomId).lean();
  if (!src) throw new Error("BOM_NOT_FOUND");
  return createBomDraft(
    String(src.outputItemId),
    src.lines.map((l) => ({
      itemId: String(l.itemId),
      quantity: l.quantity.toString(),
      scrapPercent: l.scrapPercent,
      note: l.note,
    })),
    src.note,
    userId,
  );
}

/** Which ACTIVE BOMs use this item */
export async function getWhereUsed(itemId: string) {
  return Bom.find(
    { "lines.itemId": new Types.ObjectId(itemId), status: BOM_STATUS.ACTIVE },
    { outputItemId: 1, outputItemCode: 1, version: 1, lines: { $elemMatch: { itemId: new Types.ObjectId(itemId) } } },
  ).lean();
}
