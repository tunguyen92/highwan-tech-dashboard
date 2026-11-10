import type { Role } from "./constants";

export type Permission =
  | "item:read"
  | "item:write"
  | "bom:read"
  | "bom:write"
  | "bom:activate"
  | "voucher:read"
  | "voucher:write"
  | "voucher:confirm"
  | "voucher:cancel"
  | "report:read"
  | "overview:read"
  | "user:manage";

const READ: Permission[] = ["item:read", "bom:read", "voucher:read", "report:read"];

export const ROLE_PERMISSIONS: Record<Role, Permission[]> = {
  ADMIN: [
    ...READ,
    "item:write",
    "bom:write",
    "bom:activate",
    "voucher:write",
    "voucher:confirm",
    "voucher:cancel",
    "overview:read",
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
  // Storekeeper can confirm vouchers, but cannot cancel them: cancelling needs a manager
  STOREKEEPER: [...READ, "voucher:write", "voucher:confirm"],
  VIEWER: READ,
};

export const can = (role: Role, permission: Permission) => ROLE_PERMISSIONS[role].includes(permission);
