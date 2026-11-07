import { type Model, model, models, Schema, type Types } from "mongoose";

import { BOM_STATUS, type BomStatus } from "@/lib/wms/constants";

export type { BomStatus };
export { BOM_STATUS };

export interface IBomLine {
  itemId: Types.ObjectId; // MATERIAL or SEMI
  itemCode: string; // snapshot
  itemName: string; // snapshot
  unit: string; // snapshot, always the item's base unit
  quantity: Types.Decimal128; // Quantity per 1 unit of output
  scrapPercent: number; // Allowed scrap %, used as the reconciliation threshold
  note?: string;
}

export interface IBom {
  _id: Types.ObjectId;
  outputItemId: Types.ObjectId; // PRODUCT or SEMI
  outputItemCode: string; // snapshot
  version: number; // starts from 1, incremments per outputItem
  status: BomStatus;
  effectiveFrom: Date; // Date the BOM takes effect
  lines: IBomLine[];
  note?: string;
  createdBy: Types.ObjectId;
  activatedBy?: Types.ObjectId;
  activatedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const BomLineSchema = new Schema<IBomLine>(
  {
    itemId: { type: Schema.Types.ObjectId, ref: "Item", required: true },
    itemCode: { type: String, required: true },
    itemName: { type: String, required: true },
    unit: { type: String, required: true },
    quantity: { type: Schema.Types.Decimal128, required: true },
    scrapPercent: { type: Number, default: 0, min: 0, max: 100 },
    note: { type: String, trim: true },
  },
  { _id: false },
);

const BomSchema = new Schema<IBom>(
  {
    outputItemId: { type: Schema.Types.ObjectId, ref: "Item", required: true },
    outputItemCode: { type: String, required: true },
    version: { type: Number, required: true, min: 1 },
    status: { type: String, enum: Object.values(BOM_STATUS), default: BOM_STATUS.DRAFT },
    effectiveFrom: Date,
    lines: { type: [BomLineSchema], default: [] },
    note: { type: String, trim: true },
    createdBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
    activatedBy: { type: Schema.Types.ObjectId, ref: "User" },
    activatedAt: Date,
  },
  { timestamps: true },
);

// Basic validation (no DB access needed)
BomSchema.pre("validate", function () {
  const ids = this.lines.map((l) => String(l.itemId));
  if (new Set(ids).size !== ids.length) throw new Error("BOM_DUPLICATE_LINE");
  if (ids.includes(String(this.outputItemId))) throw new Error("BOM_SELF_REFERENCE");
  if (this.status !== BOM_STATUS.DRAFT && this.lines.length === 0) throw new Error("BOM_EMPTY");
  for (const l of this.lines) {
    if (parseFloat(l.quantity.toString()) <= 0) throw new Error("BOM_QTY_MUST_BE_POSITIVE");
  }
});

BomSchema.index({ outputItemId: 1, version: 1 }, { unique: true });

// At most ONE ACTIVE BOM per item (enforced by the DB, not just by code)
BomSchema.index(
  { outputItemId: 1 },
  { unique: true, partialFilterExpression: { status: BOM_STATUS.ACTIVE }, name: "one_active_bom_per_item" },
);

// At most one DRAFT per item, so editors never fight over parallel drafts
BomSchema.index(
  { outputItemId: 1 },
  { unique: true, partialFilterExpression: { status: BOM_STATUS.DRAFT }, name: "one_draft_bom_per_item" },
);

// Where-used lookup: which BOMs contain this item
BomSchema.index({ "lines.itemId": 1, status: 1 });

export const Bom: Model<IBom> = models.Bom || model<IBom>("Bom", BomSchema);
