import { faker } from "@faker-js/faker";
import bcrypt from "bcryptjs";
import Decimal from "decimal.js";
import mongoose, { Types } from "mongoose";

import { D } from "@/server/lib/decimal";
import { createDraftVoucher } from "@/server/lib/voucher-draft";
import { cancelVoucher, confirmVoucher } from "@/server/lib/voucher-service";
import { BOM_STATUS, Bom } from "@/server/models/bom";
import { Counter } from "@/server/models/counter";
import { Inventory } from "@/server/models/inventory";
import { type IItem, ITEM_TYPE, Item } from "@/server/models/item";
import { StockTransaction } from "@/server/models/stock-transaction";
import { ROLE, User } from "@/server/models/user";
import { VOUCHER_TYPE, Voucher } from "@/server/models/voucher";

const DAY_MS = 24 * 60 * 60 * 1000;
const SEED = 20261107;
const DEMO_PASSWORD = "warehouse123";
const STOCKED_MATERIALS = 36;
const SEMI_FINISHED = 6;
const FINISHED_PRODUCTS = 12;

type VoucherLineInput = {
  item: IItem;
  quantity: string;
  normQuantity?: string;
};

const numberString = (value: Decimal.Value, decimalPlaces: number) =>
  new Decimal(value).toDecimalPlaces(decimalPlaces, Decimal.ROUND_CEIL).toFixed(decimalPlaces);

function daysToSeed() {
  const arg = process.argv.find((value) => value.startsWith("--days="));
  const days = Number(arg?.slice("--days=".length) ?? 60);
  if (!Number.isInteger(days) || days < 1 || days > 365) {
    throw new Error("--days must be an integer between 1 and 365");
  }
  return days;
}

function todayInVietnam() {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Ho_Chi_Minh" }).format(new Date());
}

async function seed() {
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error("MONGODB_URI is required");

  faker.seed(SEED);
  const days = daysToSeed();
  await mongoose.connect(uri, { bufferCommands: false });
  if (mongoose.connection.name !== "wms_mock") {
    throw new Error(`Refusing to seed database "${mongoose.connection.name}"; expected "wms_mock"`);
  }

  await mongoose.connection.dropDatabase();
  for (const model of [Item, Bom, Voucher, Inventory, StockTransaction, Counter, User]) {
    await model.syncIndexes();
  }

  const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 12);
  const [admin, manager, storekeeper, viewer] = await User.create([
    {
      _id: new Types.ObjectId("000000000000000000000001"),
      username: "demo-admin",
      name: faker.person.fullName(),
      role: ROLE.ADMIN,
      passwordHash,
    },
    {
      username: "demo-manager",
      name: faker.person.fullName(),
      role: ROLE.MANAGER,
      passwordHash,
    },
    {
      username: "demo-storekeeper",
      name: faker.person.fullName(),
      role: ROLE.STOREKEEPER,
      passwordHash,
    },
    {
      username: "demo-viewer",
      name: faker.person.fullName(),
      role: ROLE.VIEWER,
      passwordHash,
    },
  ]);
  const userId = String(admin._id);

  const groups = [
    { name: "Fasteners", unit: "pcs" },
    { name: "Electrical", unit: "pcs" },
    { name: "Packaging", unit: "pcs" },
    { name: "Metals", unit: "kg" },
    { name: "Wiring", unit: "m" },
    { name: "Adhesives", unit: "kg" },
  ];
  const materials = await Item.create(
    Array.from({ length: STOCKED_MATERIALS }, (_, index) => {
      const group = groups[index % groups.length];
      return {
        code: `RM-${String(index + 1).padStart(4, "0")}`,
        name: `${faker.commerce.productAdjective()} ${faker.commerce.productName()}`,
        type: ITEM_TYPE.MATERIAL,
        unit: group.unit,
        decimalPlaces: group.unit === "pcs" ? 0 : 2,
        group: group.name,
        minStock: D(faker.number.int({ min: 30, max: 120 })),
        excludeFromReconciliation: index % 13 === 0,
        note: faker.helpers.maybe(() => faker.commerce.productDescription(), { probability: 0.25 }),
      };
    }),
  );
  const semiFinished = await Item.create(
    Array.from({ length: SEMI_FINISHED }, (_, index) => ({
      code: `SF-${String(index + 1).padStart(4, "0")}`,
      name: `${faker.commerce.productAdjective()} ${faker.commerce.productName()}`,
      type: ITEM_TYPE.SEMI,
      unit: "pcs",
      decimalPlaces: 0,
      group: "Subassemblies",
      minStock: D(0),
    })),
  );
  const products = await Item.create(
    Array.from({ length: FINISHED_PRODUCTS }, (_, index) => ({
      code: `FG-${String(index + 1).padStart(4, "0")}`,
      name: `${faker.commerce.productAdjective()} ${faker.commerce.productName()}`,
      type: ITEM_TYPE.PRODUCT,
      unit: "pcs",
      decimalPlaces: 0,
      group: faker.helpers.arrayElement(["Electronics", "Equipment", "Accessories"]),
      minStock: D(faker.number.int({ min: 10, max: 40 })),
    })),
  );

  const today = new Date(`${todayInVietnam()}T09:00:00+07:00`);
  const start = new Date(today.getTime() - (days - 1) * DAY_MS);
  const bomFor = new Map<string, { item: IItem; quantity: Decimal }[]>();
  const createBom = async (item: IItem, version: number, status: (typeof BOM_STATUS)[keyof typeof BOM_STATUS]) => {
    const components =
      item.type === ITEM_TYPE.SEMI
        ? faker.helpers.arrayElements(materials, faker.number.int({ min: 3, max: 6 }))
        : [
            ...faker.helpers.arrayElements(semiFinished, faker.number.int({ min: 1, max: 2 })),
            ...faker.helpers.arrayElements(materials, faker.number.int({ min: 2, max: 4 })),
          ];
    const componentLines = components.map((component) => ({
      item: component,
      quantity: new Decimal(numberString(faker.number.float({ min: 1, max: 12, fractionDigits: 2 }), 2)),
    }));
    await Bom.create({
      outputItemId: item._id,
      outputItemCode: item.code,
      version,
      status,
      effectiveFrom: start,
      lines: componentLines.map(({ item: component, quantity }) => ({
        itemId: component._id,
        itemCode: component.code,
        itemName: component.name,
        unit: component.unit,
        quantity: D(quantity.toString()),
        scrapPercent: faker.helpers.arrayElement([0, 0, 2, 5]),
      })),
      createdBy: admin._id,
      ...(status === BOM_STATUS.ACTIVE ? { activatedBy: admin._id, activatedAt: start } : {}),
    });
    if (status === BOM_STATUS.ACTIVE) bomFor.set(String(item._id), componentLines);
  };

  for (const item of [...semiFinished, ...products]) {
    await createBom(item, 1, BOM_STATUS.ACTIVE);
  }
  await createBom(products[0], 2, BOM_STATUS.DRAFT);
  await createBom(products[1], 2, BOM_STATUS.ARCHIVED);

  const getMaterialNeeds = (itemId: string, quantity: Decimal) => {
    const needs = new Map<string, { item: IItem; quantity: Decimal }>();
    const expand = (outputItemId: string, multiplier: Decimal, path: string[]) => {
      if (path.includes(outputItemId)) throw new Error("BOM_CIRCULAR_REFERENCE");
      const components = bomFor.get(outputItemId);
      if (!components) throw new Error(`BOM_NOT_FOUND:${outputItemId}`);
      for (const { item, quantity: perOutput } of components) {
        const required = multiplier.mul(perOutput);
        if (item.type === ITEM_TYPE.SEMI) {
          expand(String(item._id), required, [...path, outputItemId]);
        } else {
          const current = needs.get(String(item._id)) ?? { item, quantity: new Decimal(0) };
          current.quantity = current.quantity.plus(required);
          needs.set(String(item._id), current);
        }
      }
    };
    expand(itemId, quantity, []);
    return [...needs.values()];
  };

  const postVoucher = async (
    type: (typeof VOUCHER_TYPE)[keyof typeof VOUCHER_TYPE],
    voucherDate: Date,
    lines: VoucherLineInput[],
    options: {
      batchNote?: string;
      productionRef?: { productId: string; quantity: string };
    } = {},
  ) => {
    const draft = await createDraftVoucher(
      {
        type,
        voucherDate,
        batchNote: options.batchNote,
        productionRef: options.productionRef,
        lines: lines.map(({ item, quantity, normQuantity }) => ({
          itemId: String(item._id),
          quantity,
          normQuantity,
        })),
      },
      userId,
    );
    return confirmVoucher(String(draft._id), userId);
  };

  const chunks = <T>(values: T[], size: number) =>
    Array.from({ length: Math.ceil(values.length / size) }, (_, index) =>
      values.slice(index * size, (index + 1) * size),
    );

  const baselineMinimum = Math.max(1800, days * 50);
  const baselineMaximum = Math.max(2800, days * 50 + 1000);
  for (const group of chunks(materials, 12)) {
    await postVoucher(
      VOUCHER_TYPE.IMPORT_MATERIAL,
      start,
      group.map((item) => ({
        item,
        quantity: numberString(faker.number.int({ min: baselineMinimum, max: baselineMaximum }), item.decimalPlaces),
      })),
      { batchNote: faker.string.alphanumeric({ length: 8 }).toUpperCase() },
    );
  }

  const productBalances = new Map(products.map((item) => [String(item._id), faker.number.int({ min: 100, max: 180 })]));
  for (const group of chunks(products, 12)) {
    await postVoucher(
      VOUCHER_TYPE.IMPORT_PRODUCT,
      start,
      group.map((item) => ({
        item,
        quantity: String(productBalances.get(String(item._id))),
      })),
      { batchNote: faker.string.alphanumeric({ length: 8 }).toUpperCase() },
    );
  }

  for (let offset = 1; offset < days; offset += 1) {
    const voucherDate = new Date(start.getTime() + offset * DAY_MS);
    if (offset % 2 === 0 || faker.helpers.maybe(() => true, { probability: 0.15 })) {
      const received = faker.helpers.arrayElements(materials, faker.number.int({ min: 5, max: 9 }));
      await postVoucher(
        VOUCHER_TYPE.IMPORT_MATERIAL,
        voucherDate,
        received.map((item) => ({
          item,
          quantity: numberString(faker.number.int({ min: 80, max: 240 }), item.decimalPlaces),
        })),
        { batchNote: faker.string.alphanumeric({ length: 8 }).toUpperCase() },
      );
    }

    if (offset % 2 === 0 || faker.helpers.maybe(() => true, { probability: 0.1 })) {
      const product = faker.helpers.arrayElement(products);
      const productionQuantity = faker.number.int({ min: 2, max: 5 });
      const exportLines = getMaterialNeeds(String(product._id), new Decimal(productionQuantity)).map(
        ({ item, quantity }) => {
          const norm = quantity;
          const issue = faker.helpers.maybe(() => norm.mul(faker.number.float({ min: 1.03, max: 1.16 })), {
            probability: 0.2,
          });
          return {
            item,
            quantity: numberString(issue ?? norm, item.decimalPlaces),
            normQuantity: norm.toString(),
          };
        },
      );
      await postVoucher(VOUCHER_TYPE.EXPORT_PRODUCTION, voucherDate, exportLines, {
        batchNote: `Production ${faker.string.alphanumeric({ length: 6 }).toUpperCase()}`,
        productionRef: { productId: String(product._id), quantity: String(productionQuantity) },
      });
      await postVoucher(
        VOUCHER_TYPE.IMPORT_PRODUCT,
        voucherDate,
        [{ item: product, quantity: String(productionQuantity) }],
        { batchNote: `Production ${product.code}` },
      );
      productBalances.set(String(product._id), (productBalances.get(String(product._id)) ?? 0) + productionQuantity);
    }

    if (offset % 3 === 0) {
      const product = faker.helpers.arrayElement(products);
      const available = productBalances.get(String(product._id)) ?? 0;
      if (available > 0) {
        const shipped = faker.number.int({ min: 1, max: Math.min(12, available) });
        await postVoucher(VOUCHER_TYPE.EXPORT_PRODUCT, voucherDate, [{ item: product, quantity: String(shipped) }], {
          batchNote: faker.company.name(),
        });
        productBalances.set(String(product._id), available - shipped);
      }
    }
  }

  const cancellationProduct = products.find((item) => (productBalances.get(String(item._id)) ?? 0) > 0) ?? products[0];
  const cancellation = await postVoucher(
    VOUCHER_TYPE.EXPORT_PRODUCT,
    new Date(),
    [{ item: cancellationProduct, quantity: "1" }],
    { batchNote: "Demo cancellation" },
  );
  await cancelVoucher(String(cancellation._id), userId, "Seeded example cancellation");

  const lowStockLines: VoucherLineInput[] = [];
  const lowStockCandidates = [...materials.slice(0, 8), ...products.slice(0, 3)];
  const inventory = await Inventory.find({ itemId: { $in: lowStockCandidates.map((item) => item._id) } }).lean();
  const inventoryByItem = new Map(inventory.map((row) => [String(row.itemId), row.onHand.toString()]));
  for (const [index, item] of lowStockCandidates.entries()) {
    const onHand = new Decimal(inventoryByItem.get(String(item._id)) ?? "0");
    const minimum = new Decimal(item.minStock.toString());
    const target = index % 3 === 0 ? new Decimal(0) : minimum.div(2).toDecimalPlaces(item.decimalPlaces);
    const toIssue = onHand.minus(target);
    if (toIssue.gt(0)) {
      lowStockLines.push({
        item,
        quantity: numberString(toIssue, item.decimalPlaces),
      });
    }
  }
  if (lowStockLines.length > 0) {
    await postVoucher(VOUCHER_TYPE.EXPORT_OTHER, new Date(), lowStockLines, { batchNote: "Demo low-stock adjustment" });
  }

  await createDraftVoucher(
    {
      type: VOUCHER_TYPE.IMPORT_MATERIAL,
      voucherDate: new Date(),
      batchNote: "Awaiting receipt",
      lines: [{ itemId: String(materials[materials.length - 1]._id), quantity: "100" }],
    },
    userId,
  );
  await createDraftVoucher(
    {
      type: VOUCHER_TYPE.EXPORT_PRODUCT,
      voucherDate: new Date(),
      batchNote: "Awaiting shipment",
      lines: [{ itemId: String(products[0]._id), quantity: "2" }],
    },
    userId,
  );

  console.log(
    `[seed] users=${await User.countDocuments()} items=${await Item.countDocuments()} boms=${await Bom.countDocuments()} ` +
      `vouchers=${await Voucher.countDocuments()} transactions=${await StockTransaction.countDocuments()} days=${days}`,
  );
  console.log(`[seed] Demo login: demo-admin / ${DEMO_PASSWORD}`);
  console.log(`[seed] Additional users: ${manager.username}, ${storekeeper.username}, ${viewer.username}`);
}

seed()
  .catch((error: unknown) => {
    console.error("[seed] failed:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await mongoose.disconnect();
  });
