import Decimal from "decimal.js";
import type { ClientSession, Types } from "mongoose";

import { maxQuantityDecimalPlacesForUnit } from "@/lib/wms/constants";
import { BOM_STATUS, Bom } from "@/server/models/bom";
import { type IItem, ITEM_TYPE, Item } from "@/server/models/item";

export type Need = { norm: Decimal; allowed: Decimal };
export type ExplodeOptions = {
  /** Tolerance % applied to material lines whose scrapPercent is 0 (e.g. 2) */
  defaultTolerancePercent?: number;
  session?: ClientSession;
};

const MAX_DEPTH = 20;

/**
 * Explodes the ACTIVE multi-level BOM down to raw materials.
 * Returns Map<itemId, { norm, allowed }>:
 *  - norm: required quantity per the BOM (scrap not included)
 *  - allowed: maximum acceptable quantity (norm plus tolerance, compounded across levels)
 * Materials that appear in several branches are merged.
 */
export async function explodeBom(
  productId: string | Types.ObjectId,
  quantity: Decimal.Value,
  opts: ExplodeOptions = {},
): Promise<Map<string, Need>> {
  const { defaultTolerancePercent = 0, session } = opts;
  const result = new Map<string, Need>();
  const bomCache = new Map<string, any>();
  const itemCache = new Map<string, IItem>();

  const getBom = async (id: string) => {
    if (!bomCache.has(id)) {
      bomCache.set(
        id,
        await Bom.findOne({ outputItemId: id, status: BOM_STATUS.ACTIVE })
          .session(session ?? null)
          .lean(),
      );
    }
    return bomCache.get(id);
  };

  const loadItems = async (ids: string[]) => {
    const missing = ids.filter((i) => !itemCache.has(i));
    if (missing.length) {
      const docs = await Item.find({ _id: { $in: missing } })
        .session(session ?? null)
        .lean();
      for (const d of docs) itemCache.set(String(d._id), d as IItem);
    }
  };
  const walk = async (itemId: string, mult: Decimal, allowedMult: Decimal, path: string[]) => {
    if (path.includes(itemId)) throw new Error("BOM_CIRCULAR_REFERENCE");
    if (path.length >= MAX_DEPTH) throw new Error("BOM_TOO_DEEP");

    const bom = await getBom(itemId);
    if (!bom) throw new Error(`BOM_NOT_FOUND:${itemId}`);
    await loadItems(bom.lines.map((l: any) => String(l.itemId)));

    for (const line of bom.lines) {
      const id = String(line.itemId);
      const item = itemCache.get(id);
      if (!item) throw new Error(`ITEM_NOT_FOUND:${line.itemCode}`);

      const q = mult.mul(line.quantity.toString());
      // Explicit scrap compounds through the levels; the default tolerance applies once, on the material line only
      const isSemi = item.type === ITEM_TYPE.SEMI;
      const tol = line.scrapPercent > 0 ? line.scrapPercent : isSemi ? 0 : defaultTolerancePercent;
      const am = allowedMult.mul(1 + tol / 100);

      if (isSemi) {
        await walk(id, q, am, [...path, itemId]);
      } else {
        const cur = result.get(id) ?? { norm: new Decimal(0), allowed: new Decimal(0) };
        cur.norm = cur.norm.plus(q);
        cur.allowed = cur.allowed.plus(q.mul(am));
        result.set(id, cur);
      }
    }
  };

  await walk(String(productId), new Decimal(quantity), new Decimal(1), []);
  return result;
}

/** Returns the fully exploded raw-material requirement for a finished-product quantity. */
export async function calculateBomRequirements(productId: string, quantity: string | number) {
  const product = await Item.findById(productId).lean();
  if (!product || product.type === ITEM_TYPE.MATERIAL) throw new Error("PRODUCT_NOT_FOUND");
  const requestedQuantity = new Decimal(quantity);
  if (requestedQuantity.decimalPlaces() > maxQuantityDecimalPlacesForUnit(product.unit)) {
    throw new Error("QTY_TOO_MANY_DECIMALS");
  }

  const needs = await explodeBom(productId, requestedQuantity);
  const items = await Item.find({ _id: { $in: [...needs.keys()] } }).lean();
  const byId = new Map(items.map((i) => [String(i._id), i]));

  const lines = [...needs.entries()].map(([id, n]) => {
    const it = byId.get(id)!;
    return {
      itemId: id,
      itemCode: it.code,
      itemName: it.name,
      unit: it.unit,
      // Round up to the unit's supported precision; the storekeeper then adjusts to the actual issued quantity
      quantity: n.norm.toDecimalPlaces(maxQuantityDecimalPlacesForUnit(it.unit), Decimal.ROUND_UP).toString(),
      normQuantity: n.norm.toString(),
    };
  });
  lines.sort((a, b) => a.itemCode.localeCompare(b.itemCode));

  return { lines };
}

export type BomTreeNode = {
  itemId: string;
  code: string;
  name: string;
  unit: string;
  type: string;
  quantity: string; // per ONE unit of the parent
  scrapPercent: number;
  /** SEMI item that has no ACTIVE BOM yet: the tree cannot go deeper */
  missingBom: boolean;
  children: BomTreeNode[];
};

/** Multi-level tree of one BOM (any status). SEMI lines are expanded with their ACTIVE BOM. */
export async function getBomTree(bomId: string) {
  const root = await Bom.findById(bomId).lean();
  if (!root) throw new Error("BOM_NOT_FOUND");

  const itemCache = new Map<string, IItem>();
  const loadItems = async (ids: string[]) => {
    const missing = ids.filter((i) => !itemCache.has(i));
    if (missing.length) {
      for (const d of await Item.find({ _id: { $in: missing } }).lean()) itemCache.set(String(d._id), d as IItem);
    }
  };
  const expand = async (lines: any[], path: string[]): Promise<BomTreeNode[]> => {
    if (path.length > MAX_DEPTH) throw new Error("BOM_TOO_DEEP");
    await loadItems(lines.map((l) => String(l.itemId)));
    const nodes: BomTreeNode[] = [];
    for (const l of lines) {
      const id = String(l.itemId);
      const it = itemCache.get(id);
      const node: BomTreeNode = {
        itemId: id,
        code: it?.code ?? l.itemCode,
        name: it?.name ?? l.itemName,
        unit: it?.unit ?? l.unit,
        type: it?.type ?? ITEM_TYPE.MATERIAL,
        quantity: l.quantity.toString(),
        scrapPercent: l.scrapPercent,
        missingBom: false,
        children: [],
      };
      if (it?.type === ITEM_TYPE.SEMI) {
        if (path.includes(id)) throw new Error("BOM_CIRCULAR_REFERENCE");
        const child = await Bom.findOne({ outputItemId: id, status: BOM_STATUS.ACTIVE }).lean();
        if (child) node.children = await expand(child.lines, [...path, id]);
        else node.missingBom = true;
      }
      nodes.push(node);
    }
    return nodes;
  };

  return {
    bomId: String(root._id),
    outputItemCode: root.outputItemCode,
    version: root.version,
    status: root.status,
    tree: await expand(root.lines, [String(root.outputItemId)]),
  };
}
