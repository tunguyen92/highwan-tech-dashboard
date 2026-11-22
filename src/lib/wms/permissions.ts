import type { Role } from "./constants";

export type Permission =
  | "item:read"
  | "item:write"
  | "item:price:read"
  | "bom:read"
  | "bom:write"
  | "bom:activate"
  | "voucher:read"
  | "voucher:write"
  | "voucher:confirm"
  | "voucher:cancel"
  | "report:read"
  | "sale-amount:read"
  | "overview:read"
  | "user:manage";

const READ: Permission[] = ["item:read", "bom:read", "voucher:read", "report:read"];

export const ROLE_PERMISSIONS: Record<Role, Permission[]> = {
  ADMIN: [
    ...READ,
    "item:write",
    "item:price:read",
    "bom:write",
    "bom:activate",
    "voucher:write",
    "voucher:confirm",
    "voucher:cancel",
    "overview:read",
    "sale-amount:read",
    "user:manage", // Adminstrator-only overview dashboard
  ],
  MANAGER: [
    ...READ,
    "item:write",
    "bom:write",
    "bom:activate",
    "voucher:write",
    "voucher:confirm",
    "voucher:cancel",
    "overview:read",
  ],
  // Storekeepers can manage items and confirm vouchers, but only managers can cancel vouchers.
  STOREKEEPER: [...READ, "item:write", "voucher:write", "voucher:confirm"],
  VIEWER: READ,
};

export const can = (role: Role, permission: Permission) => ROLE_PERMISSIONS[role].includes(permission);
