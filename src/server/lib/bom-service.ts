import mongoose, { type ClientSession, Types } from "mongoose";

import { BOM_STATUS, type BomStatus } from "@/lib/wms/constants";
import { Bom } from "@/server/models/bom";
import { ITEM_TYPE, Item } from "@/server/models/item";

type BomPageFilter = {
  outputItemId?: string;
  status?: BomStatus;
  q?: string;
  page: number;
  pageSize: number;
};

const escapeRegex = (value: string) => value.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, "\\$&");

export async function listBomsPage(f: BomPageFilter) {
  const match: Record<string, unknown> = {};
  if (f.outputItemId) match.outputItemId = new Types.ObjectId(f.outputItemId);
  if (f.status) match.status = f.status;
  if (f.q) match.outputItemCode = { $regex: escapeRegex(f.q), $options: "i" };

  const [rows, total] = await Promise.all([
    Bom.aggregate([
      { $match: match },
      { $sort: { outputItemCode: 1, version: -1, _id: 1 } },
      { $skip: (f.page - 1) * f.pageSize },
      { $limit: f.pageSize },
      {
        $lookup: {
          from: Item.collection.name,
          localField: "outputItemId",
          foreignField: "_id",
          as: "outputItem",
        },
      },
      { $unwind: { path: "$outputItem", preserveNullAndEmptyArrays: true } },
      {
        $addFields: {
          lineCount: { $size: "$lines" },
          outputItemName: { $ifNull: ["$outputItem.name", ""] },
        },
      },
      { $project: { lines: 0, outputItem: 0 } },
    ]),
    Bom.countDocuments(match),
  ]);

  return { rows, total, page: f.page, pageSize: f.pageSize };
}

/**
 * Prevents circular references: walks down the ACTIVE BOMs of semi-finished items.
 * Reaching outputItemId again means there is a cycle.
 */
export async function assertNoCycle(
  outputItemId: Types.ObjectId | string,
  lineItemIds: (Types.ObjectId | string)[],
  session?: ClientSession,
) {
  const target = String(outputItemId);
  const visited = new Set<string>();
  const stack = lineItemIds.map(String);

  while (stack.length) {
    const id = stack.pop()!;
    if (id === target) throw new Error("BOM_CIRCULAR_REFERENCE");
    if (visited.has(id)) continue;
    visited.add(id);

    const child = (await Bom.findOne({ outputItemId: id, status: BOM_STATUS.ACTIVE }, { "lines.itemId": 1 })
      .session(session ?? null)
      .lean()) as { lines: { itemId: Types.ObjectId }[] } | null;
    if (child) stack.push(...child.lines.map((l) => String(l.itemId)));
  }
}

/** Validates item types used in a BOM */
async function assertItemTypes(bom: InstanceType<typeof Bom>, session: ClientSession) {
  const out = await Item.findById(bom.outputItemId).session(session);
  if (!out || out.type === ITEM_TYPE.MATERIAL) throw new Error("BOM_OUTPUT_MUST_BE_PRODUCT_OR_SEMI");

  const items = await Item.find({ _id: { $in: bom.lines.map((l) => l.itemId) } }).session(session);
  if (items.length !== bom.lines.length) throw new Error("BOM_LINE_ITEM_NOT_FOUND");
  for (const it of items) {
    if (!it.isActive) throw new Error(`BOM_ITEM_INACTIVE:${it.code}`);
    if (it.type === ITEM_TYPE.PRODUCT) throw new Error(`BOM_LINE_CANNOT_BE_PRODUCT:${it.code}`);
  }
}

/** Activates a BOM: archives the current ACTIVE version and activates the new one in a single transaction */
export async function activateBom(bomId: string, userId: string) {
  const session = await mongoose.startSession();
  try {
    await session.withTransaction(async () => {
      const bom = await Bom.findById(bomId).session(session);
      if (!bom) throw new Error("BOM_NOT_FOUND");
      if (bom.status !== BOM_STATUS.DRAFT) throw new Error("BOM_ONLY_DRAFT_CAN_BE_ACTIVATED");

      await assertItemTypes(bom, session);
      await assertNoCycle(
        bom.outputItemId,
        bom.lines.map((l) => l.itemId),
        session,
      );

      await Bom.updateMany(
        { outputItemId: bom.outputItemId, status: BOM_STATUS.ACTIVE },
        { $set: { status: BOM_STATUS.ARCHIVED } },
        { session },
      );
      bom.status = BOM_STATUS.ACTIVE;
      bom.activatedBy = new Types.ObjectId(userId);
      bom.activatedAt = new Date();
      bom.effectiveFrom ??= new Date();
      await bom.save({ session });
    });
  } finally {
    await session.endSession();
  }
}
