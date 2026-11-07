import { type Model, model, models, Schema, type Types } from "mongoose";

import { VOUCHER_RULES, VOUCHER_STATUS, VOUCHER_TYPE, type VoucherStatus, type VoucherType } from "@/lib/wms/constants";
import { vnPeriod } from "@/server/lib/decimal";

export type { VoucherStatus, VoucherType };
export { VOUCHER_RULES, VOUCHER_STATUS, VOUCHER_TYPE };

export interface IVoucherLine {
  lineNo: number;
  itemId: Types.ObjectId;
  itemCode: string; // snapshot
  itemName: string; // snapshot
  unit: string; // snapshot
  quantity: Types.Decimal128; // Actual quantity in/out (> 0)
  normQuantity?: Types.Decimal128; // Norm at the time "Fill by norm" was used (snapshot)
  note?: string;
}

export interface IVoucher {
  _id: Types.ObjectId;
  voucherNo?: string; // Assigned on confirm: PN-2026-00012
  type: VoucherType;
  direction: "IN" | "OUT"; // Derived from type
  status: VoucherStatus;
  voucherDate: Date; // Business date
  period: string; // "2026-10" (Vietnam time), used for monthly reports
  batchNote?: string; // Free-text batch reference, so it can be upgraded to production orders later
  productionRef?: { productId: Types.ObjectId; productCode: string; productName: string; quantity: Types.Decimal128 };
  lines: IVoucherLine[];
  note?: string;
  createdBy: Types.ObjectId;
  confirmedBy?: Types.ObjectId;
  confirmedAt?: Date;
  cancelledBy?: Types.ObjectId;
  cancelledAt?: Date;
  cancelReason?: string;
  createdAt: Date;
  updatedAt: Date;
}

const LineSchema = new Schema<IVoucherLine>(
  {
    lineNo: { type: Number, required: true },
    itemId: { type: Schema.Types.ObjectId, ref: "Item", required: true },
    itemCode: { type: String, required: true },
    itemName: { type: String, required: true },
    unit: { type: String, required: true },
    quantity: { type: Schema.Types.Decimal128, required: true },
    normQuantity: { type: Schema.Types.Decimal128 },
    note: { type: String, trim: true },
  },
  { _id: false },
);

const VoucherSchema = new Schema<IVoucher>(
  {
    voucherNo: { type: String },
    type: { type: String, enum: Object.values(VOUCHER_TYPE), required: true },
    direction: { type: String, enum: ["IN", "OUT"], required: true },
    status: { type: String, enum: Object.values(VOUCHER_STATUS), default: VOUCHER_STATUS.DRAFT },
    voucherDate: { type: Date, required: true },
    period: { type: String, required: true },
    batchNote: { type: String, trim: true },
    productionRef: {
      type: new Schema(
        {
          productId: { type: Schema.Types.ObjectId, ref: "Item", required: true },
          productCode: String,
          productName: String,
          quantity: Schema.Types.Decimal128,
        },
        { _id: false },
      ),
    },
    lines: { type: [LineSchema], default: [] },
    note: { type: String, trim: true },
    createdBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
    confirmedBy: { type: Schema.Types.ObjectId, ref: "User" },
    confirmedAt: Date,
    cancelledBy: { type: Schema.Types.ObjectId, ref: "User" },
    cancelledAt: Date,
    cancelReason: { type: String, trim: true },
  },
  { timestamps: true },
);

VoucherSchema.pre("validate", function () {
  this.direction = VOUCHER_RULES[this.type].direction;
  this.period = vnPeriod(this.voucherDate);
  for (const [i, line] of this.lines.entries()) line.lineNo = i + 1;
  const ids = this.lines.map((l) => String(l.itemId));
  if (new Set(ids).size !== ids.length) throw new Error("VOUCHER_DUPLICATE_ITEM");
  if (this.type !== VOUCHER_TYPE.EXPORT_PRODUCTION) this.productionRef = undefined;
  if (this.status === VOUCHER_STATUS.CANCELLED && !this.cancelReason) throw new Error("CANCEL_REASON_REQUIRED");
});

VoucherSchema.index({ voucherNo: 1 }, { unique: true, partialFilterExpression: { voucherNo: { $type: "string" } } });
VoucherSchema.index({ type: 1, voucherDate: -1, status: 1 });
VoucherSchema.index({ period: 1, type: 1, status: 1 });

export const Voucher: Model<IVoucher> = models.Voucher || model<IVoucher>("Voucher", VoucherSchema);
