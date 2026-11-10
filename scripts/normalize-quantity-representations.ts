import Decimal from "decimal.js";
import mongoose from "mongoose";

import { Bom } from "@/server/models/bom";
import { Inventory } from "@/server/models/inventory";
import { Item } from "@/server/models/item";
import { StockTransaction } from "@/server/models/stock-transaction";
import { Voucher } from "@/server/models/voucher";

type Plan = {
  label: string;
  collection: mongoose.Collection;
  fields?: string[];
  arrays?: { path: string; fields: string[] }[];
};

const plans: Plan[] = [
  { label: "items", collection: Item.collection, fields: ["minStock"] },
  { label: "inventories", collection: Inventory.collection, fields: ["onHand"] },
  { label: "boms", collection: Bom.collection, arrays: [{ path: "lines", fields: ["quantity"] }] },
  {
    label: "vouchers",
    collection: Voucher.collection,
    fields: ["productionRef.quantity"],
    arrays: [{ path: "lines", fields: ["quantity", "normQuantity", "remarkQuantity"] }],
  },
  {
    label: "stock transactions",
    collection: StockTransaction.collection,
    fields: ["quantity", "signedQuantity", "balanceAfter"],
  },
];

function getPath(source: Record<string, unknown>, path: string): unknown {
  return path.split(".").reduce<unknown>((current, key) => {
    if (typeof current !== "object" || current === null) return undefined;
    return (current as Record<string, unknown>)[key];
  }, source);
}

function getNormalizedDecimal(value: unknown): mongoose.Types.Decimal128 | undefined {
  if (!(value instanceof mongoose.Types.Decimal128)) return undefined;
  const normalized = new Decimal(value.toString()).toFixed();
  return normalized === value.toString() ? undefined : mongoose.Types.Decimal128.fromString(normalized);
}

async function main() {
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error("MONGODB_URI is not set");

  const host = new URL(uri).hostname.replace(/^\[|\]$/g, "").toLowerCase();
  const isLocal = ["localhost", "127.0.0.1", "::1"].includes(host);
  if (!isLocal && !process.argv.includes("--confirm-current-dev-db")) {
    throw new Error("Refusing a non-local MongoDB target without explicit dev database confirmation.");
  }
  const apply = process.argv.includes("--apply");
  console.log(`MongoDB target: ${isLocal ? "local" : "non-local (explicitly confirmed dev/test)"}`);
  console.log(`Mode: ${apply ? "apply" : "dry run"}`);

  await mongoose.connect(uri, { bufferCommands: false });
  try {
    for (const plan of plans) {
      const projection: Record<string, 1> = { _id: 1 };
      for (const field of plan.fields ?? []) projection[field] = 1;
      for (const array of plan.arrays ?? []) projection[array.path] = 1;

      let scanned = 0;
      let documentsNeedingUpdate = 0;
      let valuesNormalized = 0;
      let modifiedDocuments = 0;
      let operations: Array<Parameters<typeof plan.collection.bulkWrite>[0][number]> = [];

      const flush = async () => {
        if (operations.length === 0) return;
        const result = await plan.collection.bulkWrite(operations, { ordered: false });
        modifiedDocuments += result.modifiedCount;
        operations = [];
      };

      for await (const document of plan.collection.find({}, { projection })) {
        scanned += 1;
        const set: Record<string, mongoose.Types.Decimal128> = {};

        const normalize = (path: string, value: unknown) => {
          const normalized = getNormalizedDecimal(value);
          if (!normalized) return;
          set[path] = normalized;
          valuesNormalized += 1;
        };

        for (const field of plan.fields ?? []) {
          normalize(field, getPath(document, field));
        }
        for (const array of plan.arrays ?? []) {
          const rows = getPath(document, array.path);
          if (!Array.isArray(rows)) continue;
          rows.forEach((row, index) => {
            if (typeof row !== "object" || row === null) return;
            for (const field of array.fields) {
              normalize(`${array.path}.${index}.${field}`, (row as Record<string, unknown>)[field]);
            }
          });
        }

        if (Object.keys(set).length === 0) continue;
        documentsNeedingUpdate += 1;
        if (!apply) continue;

        operations.push({ updateOne: { filter: { _id: document._id }, update: { $set: set } } });
        if (operations.length >= 500) await flush();
      }

      if (apply) await flush();
      console.log(
        `${plan.label}: scanned=${scanned}, documents=${documentsNeedingUpdate}, values=${valuesNormalized}${
          apply ? `, updated=${modifiedDocuments}` : ""
        }`,
      );
    }
  } finally {
    await mongoose.disconnect();
  }
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : "Quantity normalization failed.");
  process.exitCode = 1;
});
