import { type Model, model, models, Schema, type Types } from "mongoose";

import type { VoucherType } from "./voucher";

export interface IStockTransaction {
  _id: Types.ObjectId;
  kind: "POST" | "REVERSAL";
  voucherId: Types.ObjectId;
  voucherNo: string;
  voucherType: VoucherType;
  lineNo: number;
  itemId: Types.ObjectId;
  itemCode: string;
  direction: "IN" | "OUT";
  quantity: Types.Decimal128;
  signedQuantity: Types.Decimal128;
  balanceAfter: Types.Decimal128;
  businessDate: Date;
  period: string; // (Vietnam time) YYYY-MM
  reversalOf?: Types.ObjectId;
  createdBy: Types.ObjectId;
  createdAt: Date;
}

const StockTransactionSchema = new Schema<IStockTransaction>(
  {
    kind: { type: String, enum: ["POST", "REVERSAL"], required: true },
    voucherId: { type: Schema.Types.ObjectId, ref: "Voucher", required: true },
    voucherNo: { type: String, required: true },
    voucherType: { type: String, required: true },
    lineNo: { type: Number, required: true },
    itemId: { type: Schema.Types.ObjectId, ref: "Item", required: true },
    itemCode: { type: String, required: true },
    direction: { type: String, enum: ["IN", "OUT"], required: true },
    quantity: { type: Schema.Types.Decimal128, required: true },
    signedQuantity: { type: Schema.Types.Decimal128, required: true },
    balanceAfter: { type: Schema.Types.Decimal128, required: true },
    businessDate: { type: Date, required: true },
    period: { type: String, required: true },
    reversalOf: { type: Schema.Types.ObjectId, ref: "StockTransaction" },
    createdBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);

// Prevents duplicate ledger writes: each voucher line has one POST and at most one REVERSAL
StockTransactionSchema.index({ voucherId: 1, lineNo: 1, kind: 1 }, { unique: true });
// A transaction can only be reversed once
StockTransactionSchema.index(
  { reversalOf: 1 },
  { unique: true, partialFilterExpression: { reversalOf: { $exists: true } } },
);

StockTransactionSchema.index({ itemId: 1, businessDate: 1, _id: 1 }); // stock card
StockTransactionSchema.index({ period: 1, voucherType: 1, itemId: 1 }); // monthly reports

// Immutable: insert only
const BLOCKED = [
  "updateOne",
  "updateMany",
  "findOneAndUpdate",
  "replaceOne",
  "deleteOne",
  "deleteMany",
  "findOneAndDelete",
  "findOneAndReplace",
] as const;
for (const op of BLOCKED) {
  StockTransactionSchema.pre(op as any, () => {
    throw new Error("STOCK_TRANSACTION_IS_IMMUTABLE");
  });
}
StockTransactionSchema.pre("save", function () {
  if (!this.isNew) throw new Error("STOCK_TRANSACTION_IS_IMMUTABLE");
});

export const StockTransaction: Model<IStockTransaction> =
  models.StockTransaction || model<IStockTransaction>("StockTransaction", StockTransactionSchema);
