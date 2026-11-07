import { faker } from "@faker-js/faker";

import { BOM_STATUS, ITEM_TYPE, ROLE, VOUCHER_TYPE } from "@/lib/wms/constants";

import { writeFileSync } from "node:fs";
import path from "node:path";

const DAY_MS = 24 * 60 * 60 * 1000;
const SEED = 20261107;
const DAYS = 60;
const OUT = path.join(process.cwd(), "src", "server", "lib", "warehouse-demo-data.json");

type DemoItem = {
  _id: string;
  code: string;
  name: string;
  type: string;
  unit: string;
  decimalPlaces: number;
  group: string;
  minStock: string;
  isStocked: boolean;
  excludeFromReconciliation: boolean;
  isActive: boolean;
};

type VoucherType = (typeof VOUCHER_TYPE)[keyof typeof VOUCHER_TYPE];

type LineInput = {
  item: DemoItem;
  quantity: string;
  normQuantity?: string;
};

faker.seed(SEED);

const id = (n: number) => n.toString(16).padStart(24, "0");
const roundUp = (n: number, decimals: number) => {
  const scale = 10 ** decimals;
  return (Math.ceil(n * scale - Number.EPSILON) / scale).toFixed(decimals);
};
const periodOf = (date: Date) => {
  const vn = new Date(date.getTime() + 7 * 60 * 60 * 1000);
  return `${vn.getUTCFullYear()}-${String(vn.getUTCMonth() + 1).padStart(2, "0")}`;
};
const ymd = (date: Date) => new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Ho_Chi_Minh" }).format(date);
const now = new Date();
const today = new Date(`${ymd(now)}T09:00:00+07:00`);
const start = new Date(today.getTime() - (DAYS - 1) * DAY_MS);

const userRows = [
  { username: "demo-admin", role: ROLE.ADMIN },
  { username: "demo-manager", role: ROLE.MANAGER },
  { username: "demo-storekeeper", role: ROLE.STOREKEEPER },
  { username: "demo-viewer", role: ROLE.VIEWER },
].map((user, index) => ({
  _id: id(index + 1),
  ...user,
  name: faker.person.fullName(),
  isActive: true,
  lastLoginAt: new Date(now.getTime() - faker.number.int({ min: 1, max: 72 }) * 60 * 60 * 1000).toISOString(),
}));

const groups = [
  { name: "Fasteners", unit: "pcs" },
  { name: "Electrical", unit: "pcs" },
  { name: "Packaging", unit: "pcs" },
  { name: "Metals", unit: "kg" },
  { name: "Wiring", unit: "m" },
  { name: "Adhesives", unit: "kg" },
];

let itemSeq = 10;
const makeItem = (
  code: string,
  type: string,
  unit: string,
  decimalPlaces: number,
  group: string,
  minStock: number,
  excludeFromReconciliation = false,
): DemoItem => ({
  _id: id(itemSeq++),
  code,
  name: `${faker.commerce.productAdjective()} ${faker.commerce.productName()}`,
  type,
  unit,
  decimalPlaces,
  group,
  minStock: String(minStock),
  isStocked: type !== ITEM_TYPE.SEMI,
  excludeFromReconciliation,
  isActive: true,
});

const materials = Array.from({ length: 36 }, (_, index) => {
  const group = groups[index % groups.length];
  return makeItem(
    `RM-${String(index + 1).padStart(4, "0")}`,
    ITEM_TYPE.MATERIAL,
    group.unit,
    group.unit === "pcs" ? 0 : 2,
    group.name,
    faker.number.int({ min: 30, max: 120 }),
    index % 13 === 0,
  );
});
const semiFinished = Array.from({ length: 6 }, (_, index) =>
  makeItem(`SF-${String(index + 1).padStart(4, "0")}`, ITEM_TYPE.SEMI, "pcs", 0, "Subassemblies", 0),
);
const products = Array.from({ length: 12 }, (_, index) =>
  makeItem(
    `FG-${String(index + 1).padStart(4, "0")}`,
    ITEM_TYPE.PRODUCT,
    "pcs",
    0,
    faker.helpers.arrayElement(["Electronics", "Equipment", "Accessories"]),
    faker.number.int({ min: 10, max: 40 }),
  ),
);
const items = [...materials, ...semiFinished, ...products];
const itemById = new Map(items.map((item) => [item._id, item]));
const activeBoms = new Map<string, DemoBom>();
const boms: DemoBom[] = [];

type DemoBom = {
  _id: string;
  outputItemId: string;
  outputItemCode: string;
  version: number;
  status: string;
  effectiveFrom: string;
  lines: {
    itemId: string;
    itemCode: string;
    itemName: string;
    unit: string;
    quantity: string;
    scrapPercent: number;
  }[];
  note?: string;
  createdBy: string;
  activatedBy?: string;
  activatedAt?: string;
  createdAt: string;
  updatedAt: string;
};

let bomSeq = 1;
function makeBom(item: DemoItem, version: number, status: string): DemoBom {
  const components =
    item.type === ITEM_TYPE.SEMI
      ? faker.helpers.arrayElements(materials, faker.number.int({ min: 3, max: 6 }))
      : [
          ...faker.helpers.arrayElements(semiFinished, faker.number.int({ min: 1, max: 2 })),
          ...faker.helpers.arrayElements(materials, faker.number.int({ min: 2, max: 4 })),
        ];
  const createdAt = new Date(start.getTime() + bomSeq * 60_000).toISOString();
  const bom: DemoBom = {
    _id: id(1000 + bomSeq++),
    outputItemId: item._id,
    outputItemCode: item.code,
    version,
    status,
    effectiveFrom: start.toISOString(),
    lines: components.map((component) => ({
      itemId: component._id,
      itemCode: component.code,
      itemName: component.name,
      unit: component.unit,
      quantity: faker.number.float({ min: 1, max: 12, fractionDigits: 2 }).toFixed(2),
      scrapPercent: faker.helpers.arrayElement([0, 0, 2, 5]),
    })),
    createdBy: userRows[0]._id,
    ...(status === BOM_STATUS.ACTIVE ? { activatedBy: userRows[0]._id, activatedAt: createdAt } : {}),
    createdAt,
    updatedAt: createdAt,
  };
  boms.push(bom);
  if (status === BOM_STATUS.ACTIVE) activeBoms.set(item._id, bom);
  return bom;
}

for (const item of [...semiFinished, ...products]) makeBom(item, 1, BOM_STATUS.ACTIVE);
makeBom(products[0], 2, BOM_STATUS.DRAFT);
makeBom(products[1], 2, BOM_STATUS.ARCHIVED);

function getMaterialNeeds(itemId: string, quantity: number) {
  const needs = new Map<string, number>();
  const expand = (outputItemId: string, multiplier: number, path: string[]) => {
    if (path.includes(outputItemId)) throw new Error("BOM_CIRCULAR_REFERENCE");
    const bom = activeBoms.get(outputItemId);
    if (!bom) throw new Error(`BOM_NOT_FOUND:${outputItemId}`);
    for (const line of bom.lines) {
      const item = itemById.get(line.itemId);
      if (!item) throw new Error(`ITEM_NOT_FOUND:${line.itemCode}`);
      const required = multiplier * Number(line.quantity);
      if (item.type === ITEM_TYPE.SEMI) {
        expand(item._id, required, [...path, outputItemId]);
      } else {
        needs.set(item._id, (needs.get(item._id) ?? 0) + required);
      }
    }
  };
  expand(itemId, quantity, []);
  return needs;
}

type DemoVoucher = {
  _id: string;
  voucherNo?: string;
  type: VoucherType;
  direction: "IN" | "OUT";
  status: "DRAFT" | "CONFIRMED" | "CANCELLED";
  voucherDate: string;
  period: string;
  batchNote?: string;
  productionRef?: { productId: string; productCode: string; productName: string; quantity: string };
  lines: {
    lineNo: number;
    itemId: string;
    itemCode: string;
    itemName: string;
    unit: string;
    quantity: string;
    normQuantity?: string;
  }[];
  createdBy: string;
  confirmedBy?: string;
  confirmedAt?: string;
  cancelledBy?: string;
  cancelledAt?: string;
  cancelReason?: string;
  createdAt: string;
  updatedAt: string;
};

type DemoTransaction = {
  _id: string;
  kind: "POST" | "REVERSAL";
  voucherId: string;
  voucherNo: string;
  voucherType: VoucherType;
  lineNo: number;
  itemId: string;
  itemCode: string;
  direction: "IN" | "OUT";
  quantity: string;
  signedQuantity: string;
  balanceAfter: string;
  businessDate: string;
  period: string;
  reversalOf?: string;
  createdBy: string;
  createdAt: string;
};

const vouchers: DemoVoucher[] = [];
const transactions: DemoTransaction[] = [];
const onHand = new Map(items.filter((item) => item.isStocked).map((item) => [item._id, 0]));
const voucherSequence: Record<string, number> = {};
let voucherSeq = 1;
let txSeq = 1;

function directionOf(type: VoucherType): "IN" | "OUT" {
  return type.startsWith("IMPORT") ? "IN" : "OUT";
}

function postVoucher(
  type: VoucherType,
  date: Date,
  lines: LineInput[],
  options: {
    batchNote?: string;
    productionRef?: DemoVoucher["productionRef"];
    status?: DemoVoucher["status"];
  } = {},
) {
  const direction = directionOf(type);
  const status = options.status ?? "CONFIRMED";
  const period = periodOf(date);
  const prefix = direction === "IN" ? "PN" : "PX";
  const year = period.slice(0, 4);
  const counterKey = `${prefix}-${year}`;
  voucherSequence[counterKey] = (voucherSequence[counterKey] ?? 0) + 1;
  const voucherNo =
    status === "DRAFT" ? undefined : `${counterKey}-${String(voucherSequence[counterKey]).padStart(5, "0")}`;
  const timestamp = new Date(now.getTime() - (vouchers.length + 1) * 1000).toISOString();
  const voucher: DemoVoucher = {
    _id: id(2000 + voucherSeq++),
    voucherNo,
    type,
    direction,
    status,
    voucherDate: date.toISOString(),
    period,
    batchNote: options.batchNote,
    productionRef: options.productionRef,
    lines: lines.map(({ item, quantity, normQuantity }, index) => ({
      lineNo: index + 1,
      itemId: item._id,
      itemCode: item.code,
      itemName: item.name,
      unit: item.unit,
      quantity,
      normQuantity,
    })),
    createdBy: userRows[0]._id,
    ...(status !== "DRAFT" ? { confirmedBy: userRows[0]._id, confirmedAt: timestamp } : {}),
    createdAt: timestamp,
    updatedAt: timestamp,
  };
  vouchers.push(voucher);
  if (status !== "DRAFT") {
    for (const line of voucher.lines) {
      const current = onHand.get(line.itemId) ?? 0;
      const quantity = Number(line.quantity);
      const signedQuantity = direction === "IN" ? quantity : -quantity;
      const item = itemById.get(line.itemId)!;
      const balanceAfter = Number((current + signedQuantity).toFixed(item.decimalPlaces));
      onHand.set(line.itemId, balanceAfter);
      transactions.push({
        _id: id(5000 + txSeq++),
        kind: "POST",
        voucherId: voucher._id,
        voucherNo: voucherNo!,
        voucherType: type,
        lineNo: line.lineNo,
        itemId: line.itemId,
        itemCode: line.itemCode,
        direction,
        quantity: line.quantity,
        signedQuantity: String(signedQuantity),
        balanceAfter: String(balanceAfter),
        businessDate: date.toISOString(),
        period,
        createdBy: userRows[0]._id,
        createdAt: timestamp,
      });
    }
  }
  return voucher;
}

const chunks = <T>(values: T[], size: number) =>
  Array.from({ length: Math.ceil(values.length / size) }, (_, index) => values.slice(index * size, (index + 1) * size));

for (const group of chunks(materials, 12)) {
  postVoucher(
    VOUCHER_TYPE.IMPORT_MATERIAL,
    start,
    group.map((item) => ({ item, quantity: String(faker.number.int({ min: 4000, max: 5000 })) })),
    { batchNote: faker.string.alphanumeric({ length: 8 }).toUpperCase() },
  );
}

const productBalances = new Map(products.map((item) => [item._id, faker.number.int({ min: 120, max: 180 })]));
postVoucher(
  VOUCHER_TYPE.IMPORT_PRODUCT,
  start,
  products.map((item) => ({ item, quantity: String(productBalances.get(item._id)) })),
  { batchNote: faker.string.alphanumeric({ length: 8 }).toUpperCase() },
);

for (let offset = 1; offset < DAYS; offset += 1) {
  const date = new Date(start.getTime() + offset * DAY_MS);
  if (offset % 2 === 0 || faker.helpers.maybe(() => true, { probability: 0.15 })) {
    const received = faker.helpers.arrayElements(materials, faker.number.int({ min: 5, max: 9 }));
    postVoucher(
      VOUCHER_TYPE.IMPORT_MATERIAL,
      date,
      received.map((item) => ({ item, quantity: String(faker.number.int({ min: 80, max: 240 })) })),
      { batchNote: faker.string.alphanumeric({ length: 8 }).toUpperCase() },
    );
  }

  if (offset % 2 === 0 || faker.helpers.maybe(() => true, { probability: 0.1 })) {
    const product = faker.helpers.arrayElement(products);
    const productionQuantity = faker.number.int({ min: 2, max: 5 });
    const issueLines = [...getMaterialNeeds(product._id, productionQuantity)].map(([itemId, need]) => {
      const item = itemById.get(itemId)!;
      const norm = need;
      const actual = faker.helpers.maybe(() => norm * faker.number.float({ min: 1.05, max: 1.15 }), {
        probability: 0.2,
      });
      return {
        item,
        quantity: roundUp(actual ?? norm, item.decimalPlaces),
        normQuantity: String(norm),
      };
    });
    postVoucher(VOUCHER_TYPE.EXPORT_PRODUCTION, date, issueLines, {
      batchNote: `Production ${faker.string.alphanumeric({ length: 6 }).toUpperCase()}`,
      productionRef: {
        productId: product._id,
        productCode: product.code,
        productName: product.name,
        quantity: String(productionQuantity),
      },
    });
    postVoucher(VOUCHER_TYPE.IMPORT_PRODUCT, date, [{ item: product, quantity: String(productionQuantity) }], {
      batchNote: `Production ${product.code}`,
    });
    productBalances.set(product._id, (productBalances.get(product._id) ?? 0) + productionQuantity);
  }

  if (offset % 3 === 0) {
    const product = faker.helpers.arrayElement(products);
    const available = productBalances.get(product._id) ?? 0;
    if (available > 0) {
      const shipped = faker.number.int({ min: 1, max: Math.min(12, available) });
      postVoucher(VOUCHER_TYPE.EXPORT_PRODUCT, date, [{ item: product, quantity: String(shipped) }], {
        batchNote: faker.company.name(),
      });
      productBalances.set(product._id, available - shipped);
    }
  }
}

const cancellationProduct = products.find((item) => (productBalances.get(item._id) ?? 0) > 0) ?? products[0];
const cancellation = postVoucher(VOUCHER_TYPE.EXPORT_PRODUCT, now, [{ item: cancellationProduct, quantity: "1" }], {
  batchNote: "Demo cancellation",
});
cancellation.status = "CANCELLED";
cancellation.cancelledBy = userRows[0]._id;
cancellation.cancelledAt = now.toISOString();
cancellation.cancelReason = "Seeded example cancellation";
cancellation.updatedAt = now.toISOString();
for (const line of cancellation.lines) {
  const current = onHand.get(line.itemId) ?? 0;
  const balanceAfter = current + Number(line.quantity);
  onHand.set(line.itemId, balanceAfter);
  transactions.push({
    _id: id(5000 + txSeq++),
    kind: "REVERSAL",
    voucherId: cancellation._id,
    voucherNo: cancellation.voucherNo!,
    voucherType: cancellation.type,
    lineNo: line.lineNo,
    itemId: line.itemId,
    itemCode: line.itemCode,
    direction: "IN",
    quantity: line.quantity,
    signedQuantity: line.quantity,
    balanceAfter: String(balanceAfter),
    businessDate: now.toISOString(),
    period: periodOf(now),
    reversalOf: transactions.find((transaction) => transaction.voucherId === cancellation._id)?._id,
    createdBy: userRows[0]._id,
    createdAt: now.toISOString(),
  });
}

const lowStockCandidates = [...materials.slice(0, 8), ...products.slice(0, 3)];
const lowStockLines: LineInput[] = [];
for (const [index, item] of lowStockCandidates.entries()) {
  const current = onHand.get(item._id) ?? 0;
  const minimum = Number(item.minStock);
  const target = index % 3 === 0 ? 0 : Math.floor(minimum / 2);
  if (current > target) {
    lowStockLines.push({ item, quantity: roundUp(current - target, item.decimalPlaces) });
  }
}
if (lowStockLines.length > 0) {
  postVoucher(VOUCHER_TYPE.EXPORT_OTHER, now, lowStockLines, { batchNote: "Demo low-stock adjustment" });
}

postVoucher(VOUCHER_TYPE.IMPORT_MATERIAL, now, [{ item: materials[materials.length - 1], quantity: "100" }], {
  batchNote: "Awaiting receipt",
  status: "DRAFT",
});
postVoucher(VOUCHER_TYPE.EXPORT_PRODUCT, now, [{ item: products[0], quantity: "2" }], {
  batchNote: "Awaiting shipment",
  status: "DRAFT",
});

const data = { generatedAt: now.toISOString(), users: userRows, items, boms, vouchers, transactions };
writeFileSync(OUT, `${JSON.stringify(data, null, 2)}\n`);
console.log(`[demo] generated ${items.length} items, ${boms.length} BOMs, ${vouchers.length} vouchers`);
