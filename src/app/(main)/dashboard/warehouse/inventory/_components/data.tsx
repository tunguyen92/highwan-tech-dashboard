export type InventoryStatus = "In stock" | "Low stock" | "Reserved" | "Count mismatch";

export type InventoryRow = {
  sku: string;
  itemName: string;
  warehouse: string;
  bin: string;
  onHand: number;
  reserved: number;
  available: number;
  status: InventoryStatus;
  lastCount: string;
  updatedAt: string;
};

export const inventory: InventoryRow[] = [
  {
    sku: "RM-ALU-001",
    itemName: "Aluminum Alloy Sheet",
    warehouse: "Main Warehouse",
    bin: "A-01-03",
    onHand: 482,
    reserved: 82,
    available: 400,
    status: "In stock",
    lastCount: "2026-09-08",
    updatedAt: "2026-09-08T08:45:00.000Z",
  },
  {
    sku: "FG-BAT-204",
    itemName: "Battery Pack 48V",
    warehouse: "East Hub",
    bin: "B-02-04",
    onHand: 126,
    reserved: 24,
    available: 102,
    status: "In stock",
    lastCount: "2026-09-07",
    updatedAt: "2026-09-07T14:15:00.000Z",
  },
  {
    sku: "PKG-BOX-110",
    itemName: "Corrugated Box 30x20x15",
    warehouse: "Receiving Dock",
    bin: "C-03-02",
    onHand: 68,
    reserved: 16,
    available: 52,
    status: "Low stock",
    lastCount: "2026-09-06",
    updatedAt: "2026-09-06T11:30:00.000Z",
  },
  {
    sku: "SP-VAL-019",
    itemName: "Pressure Valve 15mm",
    warehouse: "Maintenance Store",
    bin: "D-01-01",
    onHand: 34,
    reserved: 6,
    available: 28,
    status: "Reserved",
    lastCount: "2026-09-05",
    updatedAt: "2026-09-05T09:10:00.000Z",
  },
  {
    sku: "CS-ADH-025",
    itemName: "Industrial Adhesive 5L",
    warehouse: "Main Warehouse",
    bin: "E-02-03",
    onHand: 91,
    reserved: 10,
    available: 81,
    status: "In stock",
    lastCount: "2026-09-04",
    updatedAt: "2026-09-04T16:40:00.000Z",
  },
  {
    sku: "FG-MTR-118",
    itemName: "Servo Motor 2.2kW",
    warehouse: "Production Floor",
    bin: "B-03-01",
    onHand: 14,
    reserved: 5,
    available: 9,
    status: "Low stock",
    lastCount: "2026-09-03",
    updatedAt: "2026-09-03T13:15:00.000Z",
  },
  {
    sku: "RM-COP-011",
    itemName: "Copper Wire 2.5mm",
    warehouse: "Main Warehouse",
    bin: "A-02-05",
    onHand: 560,
    reserved: 120,
    available: 440,
    status: "In stock",
    lastCount: "2026-09-02",
    updatedAt: "2026-09-02T10:20:00.000Z",
  },
  {
    sku: "FG-LAMP-042",
    itemName: "LED Panel 40W",
    warehouse: "East Hub",
    bin: "B-01-04",
    onHand: 220,
    reserved: 40,
    available: 180,
    status: "Count mismatch",
    lastCount: "2026-08-31",
    updatedAt: "2026-08-31T15:10:00.000Z",
  },
];

export const inventoryFilters = {
  warehouse: ["All", "Main Warehouse", "East Hub", "Receiving Dock", "Maintenance Store", "Production Floor"],
  status: ["All", "In stock", "Low stock", "Reserved", "Count mismatch"],
};

export const inventoryStatusMeta: Record<InventoryStatus, { badgeClass: string; dotClass: string }> = {
  "In stock": {
    badgeClass: "border-emerald-500/20 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
    dotClass: "bg-emerald-500",
  },
  "Low stock": {
    badgeClass: "border-amber-500/20 bg-amber-500/10 text-amber-600 dark:text-amber-400",
    dotClass: "bg-amber-500",
  },
  Reserved: {
    badgeClass: "border-violet-500/20 bg-violet-500/10 text-violet-600 dark:text-violet-400",
    dotClass: "bg-violet-500",
  },
  "Count mismatch": {
    badgeClass: "border-rose-500/20 bg-rose-500/10 text-rose-600 dark:text-rose-400",
    dotClass: "bg-rose-500",
  },
};

export const statusMeta = inventoryStatusMeta;
export const filters = inventoryFilters;
