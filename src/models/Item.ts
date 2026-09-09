import { model, models, Schema } from "mongoose";

const ItemSchema = new Schema({
  sku: { type: String, required: true, unique: true },
  name: String,
  category: String,
  unit: String,
  stock: { type: Schema.Types.Decimal128, default: 0 },
  reserved: { type: Schema.Types.Decimal128, default: 0 },
  reorderLevel: { type: Schema.Types.Decimal128, default: 0 },
  status: String,
  location: String,
  supplier: String,
  updatedAt: Date,
});

export const Item = models.Item || model("Item", ItemSchema, "items");
