import { z } from "zod";

import {
  BOM_STATUS,
  ITEM_TYPE,
  isQuantityValidForUnit,
  QTY_MAX_DECIMAL_PLACES,
  ROLE,
  VOUCHER_REMARK_UNIT,
  VOUCHER_STATUS,
  VOUCHER_TYPE,
} from "@/lib/wms/constants";

// Note: files marked "use server" may only export async functions, so schemas live here.
const enumOf = <T extends Record<string, string>>(o: T) => z.enum(Object.values(o) as [T[keyof T], ...T[keyof T][]]);
const quantitySchema = (maxDecimalPlaces: number) =>
  z
    .union([z.string(), z.number()])
    .transform(String)
    .pipe(z.string().regex(new RegExp(`^\\d+(\\.\\d{1,${maxDecimalPlaces}})?$`), "Invalid quantity"));

export const objectId = z.string().regex(/^[a-f\d]{24}$/i, "Invalid id");
/** Quantities travel as strings to avoid float errors. Up to 10 decimals. */
export const qty = quantitySchema(QTY_MAX_DECIMAL_PLACES);
export const password = z.string().min(8, "At least 8 characters").max(72); // 72 = bcrypt input limit
const ymd = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Use YYYY-MM-DD");
export const periodStr = z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/, "Use YYYY-MM");

export const loginSchema = z.object({ username: z.string().min(1).max(50), password: z.string().min(1).max(72) });
export const changePasswordSchema = z.object({ current: z.string().min(1).max(72), next: password });

export const createUserSchema = z.object({
  username: z
    .string()
    .trim()
    .min(3)
    .max(50)
    .regex(/^[a-zA-Z0-9._-]+$/),
  name: z.string().trim().min(1).max(100),
  role: enumOf(ROLE),
  password,
});
export const updateUserSchema = z.object({ role: enumOf(ROLE).optional(), isActive: z.boolean().optional() });

const itemBaseSchema = z.object({
  code: z.string().trim().min(1).max(50),
  name: z.string().trim().min(1).max(200),
  spec: z.string().trim().max(100).optional(),
  productionLine: z.string().trim().max(100).optional(),
  price: z
    .string()
    .trim()
    .max(100)
    .regex(/^\d+(\.\d{1,2})?$/)
    .optional(),
  type: enumOf(ITEM_TYPE),
  unit: z.string().trim().min(1).max(20),
  minStock: qty.default("0"),
  excludeFromReconciliation: z.boolean().default(false),
  packSize: z.string().trim().max(100).optional(),
  note: z.string().trim().max(500).optional(),
});

export const itemCreateSchema = itemBaseSchema.superRefine(({ unit, minStock }, ctx) => {
  if (!isQuantityValidForUnit(minStock, unit)) {
    ctx.addIssue({ code: "custom", message: "Quantity has more decimal places than allowed", path: ["minStock"] });
  }
});
export const itemUpdateSchema = itemBaseSchema.partial().superRefine(({ unit, minStock }, ctx) => {
  if (unit !== undefined && minStock !== undefined && !isQuantityValidForUnit(minStock, unit)) {
    ctx.addIssue({ code: "custom", message: "Quantity has more decimal places than allowed", path: ["minStock"] });
  }
});
export const itemFilterSchema = z.object({
  type: enumOf(ITEM_TYPE).optional(),
  q: z.string().trim().max(100).optional(),
  includeInactive: z.boolean().default(false),
});
export const itemPageFilterSchema = itemFilterSchema.extend({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
});

export const bomLinesSchema = z
  .array(
    z.object({
      itemId: objectId,
      quantity: qty,
      scrapPercent: z.number().min(0).max(100).default(0),
      note: z.string().trim().max(300).optional(),
    }),
  )
  .max(500); // empty drafts are allowed; activation rejects empty BOMs (BOM_EMPTY)

export const voucherDraftSchema = z.object({
  type: enumOf(VOUCHER_TYPE),
  voucherDate: z.coerce.date(),
  documentNumber: z.string().trim().max(100).optional(),
  batchNote: z.string().trim().max(200).optional(),
  note: z.string().trim().max(1000).optional(),
  lines: z
    .array(
      z.object({
        itemId: objectId,
        quantity: qty,
        remarkQuantity: qty.optional(),
        remarkUnit: enumOf(VOUCHER_REMARK_UNIT).optional(),
        note: z.string().trim().max(300).optional(),
      }),
    )
    .min(1)
    .max(500),
});

export const voucherFilterSchema = z.object({
  direction: z.enum(["IN", "OUT"]).optional(),
  type: enumOf(VOUCHER_TYPE).optional(),
  status: enumOf(VOUCHER_STATUS).optional(),
  period: periodStr.optional(),
  search: z.string().trim().max(50).optional(),
  page: z.number().int().min(1).default(1),
  pageSize: z.number().int().min(1).max(100).default(20),
});

export const bomFilterSchema = z.object({ outputItemId: objectId.optional(), status: enumOf(BOM_STATUS).optional() });
export const bomPageFilterSchema = bomFilterSchema.extend({
  q: z.string().trim().max(100).optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
});

export const stockSummarySchema = z.object({ from: ymd, to: ymd, type: z.enum(["MATERIAL", "PRODUCT"]).optional() });
export const saleAmountSchema = z
  .object({
    from: z.iso.date(),
    to: z.iso.date(),
    productionLine: z.string().trim().min(1).max(100).optional(),
  })
  .refine((value) => value.from <= value.to, { path: ["to"], message: "End date must be on or after start date" });
export const reconciliationSchema = z.object({
  period: periodStr,
  tolerancePercent: z.number().min(0).max(100).default(2),
  onlyAbnormal: z.boolean().default(false),
});
export const currentStockSchema = z.object({
  type: z.enum(["MATERIAL", "PRODUCT"]).optional(),
  lowOnly: z.boolean().default(false),
  q: z.string().trim().max(100).optional(),
});
export const currentStockPageSchema = currentStockSchema.extend({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
});
export const stockCardSchema = z.object({ itemId: objectId, from: ymd, to: ymd });
