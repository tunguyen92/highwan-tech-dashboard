import mongoose, { type ClientSession, Types } from "mongoose";

import { BOM_STATUS, Bom } from "@/server/models/bom";
import { ITEM_TYPE, Item } from "@/server/models/item";

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
