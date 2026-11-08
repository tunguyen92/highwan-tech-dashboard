import { z } from "zod";

import { BOM_STATUS, ITEM_TYPE, QTY_MAX_DECIMAL_PLACES, ROLE, VOUCHER_STATUS, VOUCHER_TYPE } from "@/lib/wms/constants";

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

export const itemCreateSchema = z.object({
  code: z.string().trim().min(1).max(50),
  name: z.string().trim().min(1).max(200),
  spec: z.string().trim().max(100).optional(),
  productionLine: z.string().trim().max(100).optional(),
  type: enumOf(ITEM_TYPE),
  unit: z.string().trim().min(1).max(20),
  decimalPlaces: z.number().int().min(0).max(QTY_MAX_DECIMAL_PLACES).default(0),
  minStock: qty.default("0"),
  excludeFromReconciliation: z.boolean().default(false),
  packSize: z.string().trim().max(100).optional(),
  note: z.string().trim().max(500).optional(),
});
export const itemUpdateSchema = itemCreateSchema.partial();
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
  batchNote: z.string().trim().max(200).optional(),
  note: z.string().trim().max(1000).optional(),
  productionRef: z.object({ productId: objectId, quantity: qty }).optional(),
  lines: z
    .array(
      z.object({
        itemId: objectId,
        quantity: qty,
        normQuantity: qty.optional(),
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
