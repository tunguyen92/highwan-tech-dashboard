import { type Model, model, models, Schema, Types } from "mongoose";

import { ITEM_TYPE, type ItemType } from "@/lib/wms/constants";

export type { ItemType };
export { ITEM_TYPE };

export interface IItem {
  _id: Types.ObjectId;
  code: string;
  name: string;
  type: ItemType;
  unit: string; // The Only base unit, used by BOM, vouchers and inventory
  decimalPlaces: number; // 0 = counted pieces; 2-3 = meters, kg
  group?: string; // Free-form group for filtering: resistors, ICs, wires...
  minStock: Types.Decimal128; // Minimum stock level (low-stock alert)
  isStocked: boolean; // Derived from type, never set manually
  excludeFromReconciliation: boolean; // Glue, solder, etc.: excluded from norm reconciliation
  packSize?: string; // Reference only (e.g. "100 m reel"), not used in calculations
  note?: string;
  isActive: boolean; // Deactivate instead of deleting
  createdAt: Date;
  updatedAt: Date;
}

const ItemSchema = new Schema<IItem>(
  {
    code: { type: String, required: true, trim: true, uppercase: true },
    name: { type: String, required: true, trim: true },
    type: { type: String, enum: Object.values(ITEM_TYPE), required: true },
    unit: { type: String, required: true, trim: true },
    decimalPlaces: { type: Number, default: 0, min: 0, max: 6 },
    group: { type: String, trim: true },
    minStock: { type: Schema.Types.Decimal128, default: () => Types.Decimal128.fromString("0") },
    isStocked: { type: Boolean, default: true },
    excludeFromReconciliation: { type: Boolean, default: false },
    packSize: { type: String, trim: true },
    note: { type: String, trim: true },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true },
);

// isStocked is always derived from type: SEMI is never stocked
ItemSchema.pre("validate", function () {
  this.isStocked = this.type !== ITEM_TYPE.SEMI;
});

// Once stock transactions exist, unit / decimalPlaces / type must not change (enforce in the service layer)
ItemSchema.index({ code: 1 }, { unique: true });
ItemSchema.index({ type: 1, isActive: 1 });
ItemSchema.index({ name: "text", code: "text" });

export const Item: Model<IItem> = models.Item || model<IItem>("Item", ItemSchema);
