import Decimal from "decimal.js";

import { ITEM_TYPE, VOUCHER_STATUS } from "@/lib/wms/constants";
import type { SaleAmountReport } from "@/lib/wms/types";
import { Item } from "@/server/models/item";
import { Voucher } from "@/server/models/voucher";

const ReportDecimal = Decimal.clone({ precision: 150 });

export async function getSaleAmount(from: Date, to: Date, productionLine?: string): Promise<SaleAmountReport> {
  const items = await Item.find({ type: ITEM_TYPE.PRODUCT }, "code name productionLine price").lean();
  const productionLines = [
    ...new Set(items.flatMap((item) => (item.productionLine ? [item.productionLine] : []))),
  ].sort((a, b) => a.localeCompare(b));
  const selectedItems = items.filter((item) => !productionLine || item.productionLine === productionLine);
  const byId = new Map(selectedItems.map((item) => [String(item._id), item]));

  if (selectedItems.length === 0) return { productionLines, deliveries: [], rows: [] };

  const vouchers = await Voucher.find({
    direction: "OUT",
    status: VOUCHER_STATUS.CONFIRMED,
    voucherDate: { $gte: from, $lt: to },
    "lines.itemId": { $in: selectedItems.map((item) => item._id) },
  })
    .sort({ voucherDate: 1, voucherNo: 1, _id: 1 })
    .lean();

  const deliveries: SaleAmountReport["deliveries"] = [];
  const rows = new Map<string, SaleAmountReport["rows"][number]>();

  for (const voucher of vouchers) {
    const voucherId = String(voucher._id);
    deliveries.push({
      id: voucherId,
      number: voucher.documentNumber || voucher.voucherNo || voucherId,
      date: voucher.voucherDate.toISOString(),
    });

    for (const line of voucher.lines) {
      const itemId = String(line.itemId);
      const item = byId.get(itemId);
      if (!item) continue;

      let row = rows.get(itemId);
      if (!row) {
        row = {
          itemId,
          code: item.code,
          name: item.name,
          quantities: {},
          totalQuantity: "0",
          price: item.price == null ? null : new ReportDecimal(item.price.toString()).toFixed(),
          amount: null,
        };
        rows.set(itemId, row);
      }

      const quantity = new ReportDecimal(line.quantity.toString());
      row.quantities[voucherId] = new ReportDecimal(row.quantities[voucherId] ?? "0").plus(quantity).toString();
      row.totalQuantity = new ReportDecimal(row.totalQuantity).plus(quantity).toString();
    }
  }

  const resultRows = [...rows.values()].sort((a, b) => a.code.localeCompare(b.code) || a.name.localeCompare(b.name));
  for (const row of resultRows) {
    if (row.price !== null) row.amount = new ReportDecimal(row.totalQuantity).times(row.price).toFixed();
  }

  return { productionLines, deliveries, rows: resultRows };
}
