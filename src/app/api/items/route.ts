import { NextResponse } from "next/server";

import { connectDB } from "@/lib/mongodb";
import { Item } from "@/models/Item";

export async function GET() {
  await connectDB();
  const items = await Item.find().lean();

  // Decimal128 not serialize to JSON -> convert to string/number
  const formatted = items.map((item: any) => ({
    ...item,
    _id: item._id.toString(),
    stock: item.stock?.toString(),
    reserved: item.reserved?.toString(),
    reorderLevel: item.reorderLevel?.toString(),
  }));

  return NextResponse.json(formatted);
}
