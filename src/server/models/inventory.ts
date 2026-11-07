import { type Model, model, models, Schema, Types } from "mongoose";

export interface IInventory {
  _id: Types.ObjectId;
  itemId: Types.ObjectId;
  onHand: Types.Decimal128; // Current stock. Never negative (guaranteed by the $gte condition when subtracting)
  updatedAt: Date;
}

const InventorySchema = new Schema<IInventory>(
  {
    itemId: { type: Schema.Types.ObjectId, ref: "Item", required: true },
    onHand: { type: Schema.Types.Decimal128, required: true, default: () => Types.Decimal128.fromString("0") },
  },
  { timestamps: { createdAt: false, updatedAt: true } },
);

export const Inventory: Model<IInventory> = models.Inventory || model<IInventory>("Inventory", InventorySchema);
