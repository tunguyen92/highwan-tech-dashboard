import { type NextRequest, NextResponse } from "next/server";

import { connectDB } from "@/lib/mongodb";
import { listItemsPage } from "@/server/lib/item-service";
import { itemPageFilterSchema } from "@/server/lib/schemas";

export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const includeInactiveParam = params.get("includeInactive");
  if (includeInactiveParam !== null && !["true", "false"].includes(includeInactiveParam)) {
    return NextResponse.json({ error: "includeInactive must be true or false" }, { status: 400 });
  }

  const parsed = itemPageFilterSchema.safeParse({
    type: params.get("type") ?? undefined,
    q: params.get("q") ?? undefined,
    includeInactive: includeInactiveParam === null || includeInactiveParam === "true",
    page: params.get("page") ?? undefined,
    pageSize: params.get("pageSize") ?? undefined,
  });
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid query parameters", details: parsed.error.flatten() }, { status: 400 });
  }

  await connectDB();
  const result = await listItemsPage(parsed.data);

  const rows = result.rows.map((item) => ({
    ...item,
    _id: String(item._id),
    minStock: item.minStock.toString(),
    price: item.price?.toString(),
  }));

  return NextResponse.json({ ...result, rows });
}
