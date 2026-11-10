export const ITEM_TYPE = {
  MATERIAL: "MATERIAL",
  SEMI: "SEMI",
  PRODUCT: "PRODUCT",
} as const;
export type ItemType = (typeof ITEM_TYPE)[keyof typeof ITEM_TYPE];

export const ITEM_TYPE_LABEL: Record<ItemType, string> = {
  MATERIAL: "Raw material",
  SEMI: "Semi-finished",
  PRODUCT: "Finished product",
};

export const QTY_MAX_DECIMAL_PLACES = 10;

export const VOUCHER_REMARK_UNIT = {
  BOX: "BOX",
  BAG: "BAG",
} as const;
export type VoucherRemarkUnit = (typeof VOUCHER_REMARK_UNIT)[keyof typeof VOUCHER_REMARK_UNIT];

export const BOM_STATUS = {
  DRAFT: "DRAFT",
  ACTIVE: "ACTIVE",
  ARCHIVED: "ARCHIVED",
} as const;
export type BomStatus = (typeof BOM_STATUS)[keyof typeof BOM_STATUS];

export const BOM_STATUS_LABEL: Record<BomStatus, string> = {
  DRAFT: "Draft version",
  ACTIVE: "In use",
  ARCHIVED: "Superseded",
};

export const VOUCHER_TYPE = {
  IMPORT_MATERIAL: "IMPORT_MATERIAL",
  IMPORT_PRODUCT: "IMPORT_PRODUCT",
  IMPORT_OTHER: "IMPORT_OTHER",
  EXPORT_PRODUCTION: "EXPORT_PRODUCTION",
  EXPORT_PRODUCT: "EXPORT_PRODUCT",
  EXPORT_PROCESSING: "EXPORT_PROCESSING",
  EXPORT_OTHER: "EXPORT_OTHER",
} as const;
export type VoucherType = (typeof VOUCHER_TYPE)[keyof typeof VOUCHER_TYPE];

export const VOUCHER_TYPE_LABEL: Record<VoucherType, string> = {
  IMPORT_MATERIAL: "Receive raw materials",
  IMPORT_PRODUCT: "Receive finished products",
  IMPORT_OTHER: "Other receipt",
  EXPORT_PRODUCTION: "Issue to production",
  EXPORT_PRODUCT: "Ship to partner",
  EXPORT_PROCESSING: "Deliver for outsourcing",
  EXPORT_OTHER: "Other issue",
} as const;

export const VOUCHER_STATUS = {
  DRAFT: "DRAFT",
  CONFIRMED: "CONFIRMED",
  CANCELLED: "CANCELLED",
} as const;
export type VoucherStatus = (typeof VOUCHER_STATUS)[keyof typeof VOUCHER_STATUS];

export const VOUCHER_STATUS_LABEL: Record<VoucherStatus, string> = {
  DRAFT: "Draft",
  CONFIRMED: "Confirmed",
  CANCELLED: "Cancelled",
};

export const VOUCHER_RULES: Record<VoucherType, { direction: "IN" | "OUT"; allowed: ItemType[]; prefix: "PN" | "PX" }> =
  {
    IMPORT_MATERIAL: { direction: "IN", allowed: ["MATERIAL"], prefix: "PN" },
    IMPORT_PRODUCT: { direction: "IN", allowed: ["PRODUCT"], prefix: "PN" },
    IMPORT_OTHER: { direction: "IN", allowed: ["MATERIAL", "PRODUCT"], prefix: "PN" },
    EXPORT_PRODUCTION: { direction: "OUT", allowed: ["MATERIAL"], prefix: "PX" },
    EXPORT_PRODUCT: { direction: "OUT", allowed: ["PRODUCT"], prefix: "PX" },
    EXPORT_PROCESSING: { direction: "OUT", allowed: ["MATERIAL", "PRODUCT"], prefix: "PX" },
    EXPORT_OTHER: { direction: "OUT", allowed: ["MATERIAL", "PRODUCT"], prefix: "PX" },
  };

export const ROLE = {
  ADMIN: "ADMIN", // Everything, including user management
  MANAGER: "MANAGER", // Master data, BOM, vouchers (incl. cancel), reports
  STOREKEEPER: "STOREKEEPER", // Create / confirm vouchers, read the rest
  VIEWER: "VIEWER", // Read only
} as const;
export type Role = (typeof ROLE)[keyof typeof ROLE];

export const ROLE_LABEL: Record<Role, string> = {
  ADMIN: "Administrator",
  MANAGER: "Manager",
  STOREKEEPER: "Storekeeper",
  VIEWER: "Viewer",
};
