import { ZodError } from "zod";

import { getServerT } from "@/lib/i18n/server";
import type { Permission } from "@/lib/wms/permissions";

import { requirePermission, type SessionUser } from "./auth";
import { connectDB } from "./db";
import { isWarehouseDemoMode } from "./demo-mode";

export type ActionResult<T> = { ok: true; data: T } | { ok: false; code: string; message: string };

// User-facing messages (Vietnamese). Unknown errors are logged and never leaked to the client.
const MESSAGES: Record<string, string> = {
  UNAUTHENTICATED: "Please sign in.",
  FORBIDDEN: "You do not have permission to do this.",
  INVALID_CREDENTIALS: "Wrong username or password.",
  ACCOUNT_LOCKED: "The account is temporarily locked after too many failed attempts. Please try again later.",
  VALIDATION: "Invalid data.",
  DUPLICATE_KEY: "Duplicate data.",
  INSUFFICIENT_STOCK: "Not enough stock",
  INSUFFICIENT_STOCK_FOR_CANCEL:
    "Cannot cancel because there is not enough stock now (the goods were already issued). Cancel the related issue voucher first.",
  DEMO_READ_ONLY: "The production demo is read-only.",
  VOUCHER_NOT_DRAFT: "The voucher is no longer a draft.",
  VOUCHER_NOT_CONFIRMED: "Only confirmed vouchers can be cancelled.",
  VOUCHER_NOT_EDITABLE: "Only draft vouchers can be edited or deleted.",
  VOUCHER_EMPTY: "The voucher has no lines.",
  VOUCHER_DUPLICATE_ITEM: "The voucher contains a duplicate item.",
  VOUCHER_TYPE_INVALID: "Invalid voucher type.",
  CANCEL_REASON_REQUIRED: "A cancellation reason is required.",
  PRODUCT_NOT_FOUND: "Finished product not found.",
  ITEM_NOT_FOUND: "Item not found",
  ITEM_INACTIVE: "Item is deactivated",
  ITEM_NOT_STOCKED: "This item is not stocked",
  ITEM_TYPE_NOT_ALLOWED: "Item type does not fit the voucher type",
  QTY_MUST_BE_POSITIVE: "Quantity must be greater than 0",
  QTY_TOO_MANY_DECIMALS: "Quantity has more decimal places than allowed",
  ITEM_FIELD_LOCKED: "This item already has data, so its code, type, unit and decimal places cannot be changed.",
  ITEM_HAS_STOCK: "The item still has stock and cannot be deactivated.",
  BOM_NOT_FOUND: "No active BOM for",
  BOM_CIRCULAR_REFERENCE: "The BOM contains a circular reference.",
  BOM_TOO_DEEP: "The BOM has too many levels.",
  BOM_DUPLICATE_LINE: "The BOM has a duplicate line.",
  BOM_SELF_REFERENCE: "A BOM cannot contain itself.",
  BOM_EMPTY: "The BOM has no lines.",
  BOM_QTY_MUST_BE_POSITIVE: "BOM quantities must be greater than 0.",
  BOM_ONLY_DRAFT_CAN_BE_ACTIVATED: "Only draft BOMs can be activated.",
  BOM_OUTPUT_MUST_BE_PRODUCT_OR_SEMI: "A BOM can only be created for finished or semi-finished items.",
  BOM_LINE_CANNOT_BE_PRODUCT: "A finished product cannot be a BOM component",
  BOM_LINE_ITEM_NOT_FOUND: "An item in the BOM does not exist.",
  BOM_ITEM_INACTIVE: "A BOM item is deactivated",
  BOM_DRAFT_EXISTS: "A draft of this BOM already exists.",
  BOM_NOT_EDITABLE: "Only draft BOMs can be edited or deleted.",
  USER_NOT_FOUND: "User not found.",
  CANNOT_MODIFY_SELF: "You cannot change your own role or lock yourself.",
  LAST_ADMIN: "At least one active administrator must remain.",
  WRONG_PASSWORD: "The current password is incorrect.",
};

/** Converts documents to JSON-safe plain data: Decimal128 -> string, ObjectId -> string, Date -> ISO string */
export function toPlain<T>(value: T): T {
  return JSON.parse(
    JSON.stringify(value, (_k, v) => (v && typeof v === "object" && "$numberDecimal" in v ? v.$numberDecimal : v)),
  );
}

async function fail(e: any): Promise<ActionResult<never>> {
  const t = await getServerT();
  if (e instanceof ZodError) {
    const i = e.issues[0];
    return {
      ok: false,
      code: "VALIDATION",
      message: `${t(MESSAGES.VALIDATION)} (${i.path.join(".") || "input"}: ${i.message})`,
    };
  }
  if (e?.code === 11000) {
    return {
      ok: false,
      code: "DUPLICATE_KEY",
      message: `${t(MESSAGES.DUPLICATE_KEY)} (${Object.keys(e.keyValue ?? {}).join(", ")})`,
    };
  }
  const [code, ...rest] = String(e?.message ?? "").split(":");
  if (MESSAGES[code]) {
    const detail = rest.join(":");
    return { ok: false, code, message: detail ? `${t(MESSAGES[code])} (${detail})` : t(MESSAGES[code]) };
  }
  console.error("[action error]", e);
  return { ok: false, code: "INTERNAL", message: t("Something went wrong, please try again.") };
}

/** Runs an authorized action: connect, check permission, execute, serialize, map errors */
export async function run<T, Demo = T>(
  permission: Permission,
  fn: (user: SessionUser) => Promise<T>,
  demoFn?: (user: SessionUser) => Promise<Demo> | Demo,
): Promise<ActionResult<T | Demo>> {
  try {
    if (isWarehouseDemoMode()) {
      if (!demoFn) throw new Error("DEMO_READ_ONLY");
      const user = await requirePermission(permission);
      return { ok: true, data: toPlain(await demoFn(user)) };
    }
    await connectDB();
    const user = await requirePermission(permission);
    return { ok: true, data: toPlain(await fn(user)) };
  } catch (e) {
    return await fail(e);
  }
}

/** Same as run, for actions that need no session (login) */
export async function runPublic<T, Demo = T>(
  fn: () => Promise<T>,
  demoFn?: () => Promise<Demo> | Demo,
): Promise<ActionResult<T | Demo>> {
  try {
    if (isWarehouseDemoMode()) {
      if (!demoFn) throw new Error("DEMO_READ_ONLY");
      return { ok: true, data: toPlain(await demoFn()) };
    }
    await connectDB();
    return { ok: true, data: toPlain(await fn()) };
  } catch (e) {
    return await fail(e);
  }
}
