import mongoose from "mongoose";

import { hashPassword } from "@/server/lib/auth";
import { connectDB } from "@/server/lib/db";
import { Bom } from "@/server/models/bom";
import { Counter } from "@/server/models/counter";
import { Inventory } from "@/server/models/inventory";
import { Item } from "@/server/models/item";
import { StockTransaction } from "@/server/models/stock-transaction";
import { ROLE, User } from "@/server/models/user";
import { Voucher } from "@/server/models/voucher";

async function main() {
  await connectDB();

  for (const m of [Item, Bom, Voucher, Inventory, StockTransaction, Counter, User]) {
    await m.syncIndexes();
    console.log("indexes synced:", m.modelName);
  }

  if ((await User.countDocuments({ role: ROLE.ADMIN })) === 0) {
    const username = process.env.ADMIN_USERNAME;
    const pw = process.env.ADMIN_PASSWORD;
    if (!username || !pw || pw.length < 8) throw new Error("Set ADMIN_USERNAME and ADMIN_PASSWORD (min 8 chars)");
    await User.create({ username, name: "Administrator", role: ROLE.ADMIN, passwordHash: await hashPassword(pw) });
    console.log("admin created:", username);
  }

  await mongoose.disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
