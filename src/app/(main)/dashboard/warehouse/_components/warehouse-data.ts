export type ItemStatus = "Active" | "Low stock" | "Draft" | "On hold" | "Discontinued";

export const itemCategoryValues = [
  "Raw Material",
  "Finished Goods",
  "Packaging",
  "Spare Parts",
  "Consumables",
] as const;

export type ItemCategory = (typeof itemCategoryValues)[number];

export type ItemRow = {
  sku: string;
  name: string;
  category: ItemCategory;
  unit: string;
  stock: number;
  reserved: number;
  reorderLevel: number;
  status: ItemStatus;
  location: string;
  supplier: string;
  updatedAt: string;
};

export const sampleItems: ItemRow[] = [
  {
    sku: "RM-ALU-001",
    name: "Aluminum Alloy Sheet",
    category: "Raw Material",
    unit: "kg",
    stock: 482,
    reserved: 82,
    reorderLevel: 200,
    status: "Active",
    location: "A-01-03",
    supplier: "NorthPeak Metals",
    updatedAt: "2026-09-08T08:45:00.000Z",
  },
  {
    sku: "FG-BAT-204",
    name: "Battery Pack 48V",
    category: "Finished Goods",
    unit: "pcs",
    stock: 126,
    reserved: 24,
    reorderLevel: 80,
    status: "Active",
    location: "B-02-04",
    supplier: "VoltWorks Co.",
    updatedAt: "2026-09-07T14:15:00.000Z",
  },
  {
    sku: "PKG-BOX-110",
    name: "Corrugated Box 30x20x15",
    category: "Packaging",
    unit: "pcs",
    stock: 68,
    reserved: 16,
    reorderLevel: 50,
    status: "Low stock",
    location: "C-03-02",
    supplier: "PackPro Supply",
    updatedAt: "2026-09-06T11:30:00.000Z",
  },
  {
    sku: "SP-VAL-019",
    name: "Pressure Valve 15mm",
    category: "Spare Parts",
    unit: "pcs",
    stock: 34,
    reserved: 6,
    reorderLevel: 40,
    status: "On hold",
    location: "D-01-01",
    supplier: "Flowline Industrial",
    updatedAt: "2026-09-05T09:10:00.000Z",
  },
  {
    sku: "CS-ADH-025",
    name: "Industrial Adhesive 5L",
    category: "Consumables",
    unit: "btl",
    stock: 91,
    reserved: 10,
    reorderLevel: 60,
    status: "Active",
    location: "E-02-03",
    supplier: "PrimeBond Labs",
    updatedAt: "2026-09-04T16:40:00.000Z",
  },
  {
    sku: "FG-MTR-118",
    name: "Servo Motor 2.2kW",
    category: "Finished Goods",
    unit: "pcs",
    stock: 14,
    reserved: 5,
    reorderLevel: 30,
    status: "Low stock",
    location: "B-03-01",
    supplier: "DynoDrive Inc.",
    updatedAt: "2026-09-03T13:15:00.000Z",
  },
  {
    sku: "RM-COP-011",
    name: "Copper Wire 2.5mm",
    category: "Raw Material",
    unit: "m",
    stock: 560,
    reserved: 120,
    reorderLevel: 250,
    status: "Active",
    location: "A-02-05",
    supplier: "CopperEdge Ltd.",
    updatedAt: "2026-09-02T10:20:00.000Z",
  },
  {
    sku: "DL-ROD-008",
    name: "Steel Rod 12mm",
    category: "Raw Material",
    unit: "kg",
    stock: 0,
    reserved: 0,
    reorderLevel: 120,
    status: "Draft",
    location: "A-04-02",
    supplier: "Harbor Steel",
    updatedAt: "2026-09-01T07:55:00.000Z",
  },
  {
    sku: "FG-LAMP-042",
    name: "LED Panel 40W",
    category: "Finished Goods",
    unit: "pcs",
    stock: 220,
    reserved: 40,
    reorderLevel: 90,
    status: "Active",
    location: "B-01-04",
    supplier: "BrightWorks",
    updatedAt: "2026-08-31T15:10:00.000Z",
  },
  {
    sku: "PKG-TAPE-077",
    name: "Protective Tape Roll",
    category: "Packaging",
    unit: "roll",
    stock: 42,
    reserved: 8,
    reorderLevel: 45,
    status: "Discontinued",
    location: "C-05-01",
    supplier: "SealMate",
    updatedAt: "2026-08-30T12:00:00.000Z",
  },
];

export const itemFilters = {
  category: ["All", ...itemCategoryValues],
  status: ["All", "Active", "Low stock", "Draft", "On hold", "Discontinued"],
  location: ["All", "A-01-03", "A-02-05", "A-04-02", "B-01-04", "B-02-04", "B-03-01", "C-03-02", "D-01-01", "E-02-03"],
  supplier: [
    "All",
    "NorthPeak Metals",
    "VoltWorks Co.",
    "PackPro Supply",
    "Flowline Industrial",
    "PrimeBond Labs",
    "DynoDrive Inc.",
    "CopperEdge Ltd.",
    "Harbor Steel",
    "BrightWorks",
    "SealMate",
  ],
};

export const itemStatusMeta: Record<ItemStatus, { badgeClass: string; dotClass: string }> = {
  Active: {
    badgeClass: "border-emerald-500/20 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
    dotClass: "bg-emerald-500",
  },
  "Low stock": {
    badgeClass: "border-amber-500/20 bg-amber-500/10 text-amber-600 dark:text-amber-400",
    dotClass: "bg-amber-500",
  },
  Draft: {
    badgeClass: "border-sky-500/20 bg-sky-500/10 text-sky-600 dark:text-sky-400",
    dotClass: "bg-sky-500",
  },
  "On hold": {
    badgeClass: "border-violet-500/20 bg-violet-500/10 text-violet-600 dark:text-violet-400",
    dotClass: "bg-violet-500",
  },
  Discontinued: {
    badgeClass: "border-border bg-muted/50 text-muted-foreground",
    dotClass: "bg-muted-foreground",
  },
};

export type CategoryStatus = "Active" | "Draft" | "Archived";

export type CategoryType = "Raw Material" | "Finished Goods" | "Packaging" | "Spare Parts" | "Consumables";

export type CategoryRow = {
  code: string;
  name: string;
  type: CategoryType;
  parent: string;
  itemCount: number;
  status: CategoryStatus;
  updatedAt: string;
};

export const categories: CategoryRow[] = [
  {
    code: "RAW",
    name: "Raw Material",
    type: "Raw Material",
    parent: "Root",
    itemCount: 142,
    status: "Active",
    updatedAt: "2026-09-08T08:45:00.000Z",
  },
  {
    code: "FG",
    name: "Finished Goods",
    type: "Finished Goods",
    parent: "Root",
    itemCount: 96,
    status: "Active",
    updatedAt: "2026-09-07T14:15:00.000Z",
  },
  {
    code: "PKG",
    name: "Packaging",
    type: "Packaging",
    parent: "Root",
    itemCount: 34,
    status: "Active",
    updatedAt: "2026-09-06T11:30:00.000Z",
  },
  {
    code: "SP",
    name: "Spare Parts",
    type: "Spare Parts",
    parent: "Root",
    itemCount: 41,
    status: "Active",
    updatedAt: "2026-09-05T09:10:00.000Z",
  },
  {
    code: "CONS",
    name: "Consumables",
    type: "Consumables",
    parent: "Root",
    itemCount: 22,
    status: "Draft",
    updatedAt: "2026-09-04T16:40:00.000Z",
  },
  {
    code: "MET",
    name: "Metals",
    type: "Raw Material",
    parent: "Raw Material",
    itemCount: 18,
    status: "Active",
    updatedAt: "2026-09-03T13:15:00.000Z",
  },
  {
    code: "ELEC",
    name: "Electrical",
    type: "Finished Goods",
    parent: "Finished Goods",
    itemCount: 29,
    status: "Active",
    updatedAt: "2026-09-02T10:20:00.000Z",
  },
  {
    code: "MEC",
    name: "Mechanical",
    type: "Spare Parts",
    parent: "Spare Parts",
    itemCount: 20,
    status: "Archived",
    updatedAt: "2026-09-01T07:55:00.000Z",
  },
];

export const categoryFilters = {
  type: ["All", "Raw Material", "Finished Goods", "Packaging", "Spare Parts", "Consumables"],
  status: ["All", "Active", "Draft", "Archived"],
  parent: ["All", "Root", "Raw Material", "Finished Goods", "Packaging", "Spare Parts", "Consumables"],
};

export const categoryStatusMeta: Record<CategoryStatus, { badgeClass: string; dotClass: string }> = {
  Active: {
    badgeClass: "border-emerald-500/20 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
    dotClass: "bg-emerald-500",
  },
  Draft: {
    badgeClass: "border-sky-500/20 bg-sky-500/10 text-sky-600 dark:text-sky-400",
    dotClass: "bg-sky-500",
  },
  Archived: {
    badgeClass: "border-border bg-muted/50 text-muted-foreground",
    dotClass: "bg-muted-foreground",
  },
};

export type PartnerStatus = "Active" | "Pending" | "Inactive";

export type PartnerType = "Supplier" | "Customer" | "Logistics" | "Manufacturer";

export type PartnerRow = {
  code: string;
  name: string;
  type: PartnerType;
  contact: string;
  email: string;
  phone: string;
  status: PartnerStatus;
  country: string;
  updatedAt: string;
};

export const partners: PartnerRow[] = [
  {
    code: "NPM-01",
    name: "NorthPeak Metals",
    type: "Supplier",
    contact: "Ava Morgan",
    email: "ava@northrpeakmetals.com",
    phone: "+1 (415) 222-9090",
    status: "Active",
    country: "United States",
    updatedAt: "2026-09-08T08:45:00.000Z",
  },
  {
    code: "VWC-02",
    name: "VoltWorks Co.",
    type: "Manufacturer",
    contact: "Liam Chen",
    email: "liam@voltworks.co",
    phone: "+44 20 7946 0891",
    status: "Active",
    country: "United Kingdom",
    updatedAt: "2026-09-07T14:15:00.000Z",
  },
  {
    code: "PKP-03",
    name: "PackPro Supply",
    type: "Supplier",
    contact: "Sofia Patel",
    email: "sofia@packpro.com",
    phone: "+61 2 5550 1200",
    status: "Pending",
    country: "Australia",
    updatedAt: "2026-09-06T11:30:00.000Z",
  },
  {
    code: "FIL-04",
    name: "Flowline Industrial",
    type: "Supplier",
    contact: "Noah Singh",
    email: "noah@flowlineindustrial.io",
    phone: "+91 99887 33100",
    status: "Active",
    country: "India",
    updatedAt: "2026-09-05T09:10:00.000Z",
  },
  {
    code: "PBL-05",
    name: "PrimeBond Labs",
    type: "Supplier",
    contact: "Emma Clark",
    email: "emma@primebondlabs.com",
    phone: "+49 30 5555 0120",
    status: "Active",
    country: "Germany",
    updatedAt: "2026-09-04T16:40:00.000Z",
  },
  {
    code: "DYN-06",
    name: "DynoDrive Inc.",
    type: "Manufacturer",
    contact: "Daniel Park",
    email: "daniel@dynodrive.com",
    phone: "+82 2 3454 9180",
    status: "Inactive",
    country: "South Korea",
    updatedAt: "2026-09-03T13:15:00.000Z",
  },
  {
    code: "CEL-07",
    name: "CopperEdge Ltd.",
    type: "Supplier",
    contact: "Zoe Miller",
    email: "zoe@copperedge.ltd",
    phone: "+64 9 555 0112",
    status: "Active",
    country: "New Zealand",
    updatedAt: "2026-09-02T10:20:00.000Z",
  },
  {
    code: "HST-08",
    name: "Harbor Steel",
    type: "Supplier",
    contact: "Mason Lee",
    email: "mason@harborsteel.com",
    phone: "+1 (312) 345-7711",
    status: "Pending",
    country: "United States",
    updatedAt: "2026-09-01T07:55:00.000Z",
  },
];

export const partnerFilters = {
  type: ["All", "Supplier", "Customer", "Logistics", "Manufacturer"],
  status: ["All", "Active", "Pending", "Inactive"],
  country: ["All", "United States", "United Kingdom", "Australia", "India", "Germany", "South Korea", "New Zealand"],
};

export const partnerStatusMeta: Record<PartnerStatus, { badgeClass: string; dotClass: string }> = {
  Active: {
    badgeClass: "border-emerald-500/20 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
    dotClass: "bg-emerald-500",
  },
  Pending: {
    badgeClass: "border-amber-500/20 bg-amber-500/10 text-amber-600 dark:text-amber-400",
    dotClass: "bg-amber-500",
  },
  Inactive: {
    badgeClass: "border-border bg-muted/50 text-muted-foreground",
    dotClass: "bg-muted-foreground",
  },
};

export const warehouseStatusMeta = {
  items: itemStatusMeta,
  categories: categoryStatusMeta,
  partners: partnerStatusMeta,
};

export const warehouseFilters = {
  items: itemFilters,
  categories: categoryFilters,
  partners: partnerFilters,
};

export const warehouseCollections = { sampleItems, categories, partners };

export function formatUpdatedAt(value: string) {
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(value));
}

export function createWarehouseId(prefix: string) {
  return `${prefix}-${Math.random().toString(36).slice(2, 8)}-${Date.now().toString(36)}`;
}
