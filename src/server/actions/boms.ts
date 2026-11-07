"use server";

import { Types } from "mongoose";
import { z } from "zod";

import { run } from "@/server/lib/action";
import { cloneBomAsDraft, createBomDraft, deleteBomDraft, getWhereUsed, updateBomDraft } from "@/server/lib/bom-draft";
import { fillByBom, getBomTree } from "@/server/lib/bom-explode";
import { activateBom } from "@/server/lib/bom-service";
import { bomFilterSchema, bomLinesSchema, objectId, qty } from "@/server/lib/schemas";
import {
  getDemoBom,
  getDemoBoms,
  getDemoBomTree,
  getDemoFillByBom,
  getDemoWhereUsed,
} from "@/server/lib/warehouse-demo";
import { Bom } from "@/server/models/bom";

export async function listBomsAction(input: unknown = {}) {
  return run(
    "bom:read",
    async () => {
      const f = bomFilterSchema.parse(input);
      const match: Record<string, unknown> = {};
      if (f.outputItemId) match.outputItemId = new Types.ObjectId(f.outputItemId);
      if (f.status) match.status = f.status;
      return Bom.aggregate([
        { $match: match },
        { $sort: { outputItemId: 1, version: -1 } },
        { $limit: 500 },
        { $addFields: { lineCount: { $size: "$lines" } } },
        { $project: { lines: 0 } },
      ]);
    },
    () => getDemoBoms(bomFilterSchema.parse(input)),
  );
}

export async function getBomAction(bomId: unknown) {
  return run(
    "bom:read",
    async () => Bom.findById(objectId.parse(bomId)).lean(),
    () => getDemoBom(objectId.parse(bomId)),
  );
}

export async function createBomDraftAction(outputItemId: unknown, lines: unknown, note?: unknown) {
  return run("bom:write", async (user) => {
    const bom = await createBomDraft(
      objectId.parse(outputItemId),
      bomLinesSchema.parse(lines),
      z.string().max(500).optional().parse(note),
      user.id,
    );
    return { id: String(bom._id) };
  });
}

export async function updateBomDraftAction(bomId: unknown, lines: unknown, note?: unknown) {
  return run("bom:write", async () => {
    await updateBomDraft(
      objectId.parse(bomId),
      bomLinesSchema.parse(lines),
      z.string().max(500).optional().parse(note),
    );
    return null;
  });
}

export async function deleteBomDraftAction(bomId: unknown) {
  return run("bom:write", async () => {
    await deleteBomDraft(objectId.parse(bomId));
    return null;
  });
}

/** Starts a new version from an existing BOM; ACTIVE BOMs are never edited in place */
export async function cloneBomAction(bomId: unknown) {
  return run("bom:write", async (user) => {
    const bom = await cloneBomAsDraft(objectId.parse(bomId), user.id);
    return { id: String(bom._id) };
  });
}

export async function activateBomAction(bomId: unknown) {
  return run("bom:activate", async (user) => {
    await activateBom(objectId.parse(bomId), user.id);
    return null;
  });
}

export async function whereUsedAction(itemId: unknown) {
  return run(
    "bom:read",
    async () => getWhereUsed(objectId.parse(itemId)),
    () => getDemoWhereUsed(objectId.parse(itemId)),
  );
}

/** Preview of the fully exploded requirement (down to raw materials) for N finished products */
export async function explodePreviewAction(productId: unknown, quantity: unknown) {
  return run(
    "bom:read",
    async () => fillByBom(objectId.parse(productId), qty.parse(quantity)),
    () => getDemoFillByBom(objectId.parse(productId), qty.parse(quantity)),
  );
}

/** Multi-level tree of a BOM for the detail screen */
export async function bomTreeAction(bomId: unknown) {
  return run(
    "bom:read",
    async () => getBomTree(objectId.parse(bomId)),
    () => getDemoBomTree(objectId.parse(bomId)),
  );
}
