"use client";

import { useState } from "react";

import { CalendarDatePicker } from "@/components/calendar-date-picker";
import { Button } from "@/components/ui/button";
import { Field, FieldLabel } from "@/components/ui/field";
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useT } from "@/lib/i18n/provider";
import { unwrap } from "@/lib/wms/action-client";
import { firstDayOfMonthYmd, formatDate, formatPrice, formatQty, todayYmd } from "@/lib/wms/format";
import { useLoad } from "@/lib/wms/use-load";
import { saleAmountAction } from "@/server/actions/reports";

import { PageCard, tableClass } from "../../../_components/wms/page-card";
import { EmptyRow, LoadingRows } from "../../../_components/wms/table-states";

export function SaleAmountReport() {
  const t = useT();
  const [from, setFrom] = useState(firstDayOfMonthYmd());
  const [to, setTo] = useState(todayYmd());
  const [productionLine, setProductionLine] = useState("");

  const { data, loading, reload } = useLoad(
    () => unwrap(saleAmountAction({ from, to, productionLine: productionLine || undefined })),
    [from, to, productionLine],
  );
  const deliveries = data?.deliveries ?? [];
  const columns = 5 + deliveries.length;
  const headerRowSpan = deliveries.length > 0 ? 3 : 1;

  return (
    <PageCard
      title={t("Sale Amount")}
      description={t("Finished products on confirmed issue vouchers, grouped by delivery.")}
    >
      <div className="flex flex-wrap items-end gap-3 px-4">
        <Field className="w-40">
          <FieldLabel htmlFor="sale-from">{t("From")}</FieldLabel>
          <CalendarDatePicker id="sale-from" value={from} max={to} onChange={setFrom} />
        </Field>
        <Field className="w-40">
          <FieldLabel htmlFor="sale-to">{t("To")}</FieldLabel>
          <CalendarDatePicker id="sale-to" value={to} min={from} onChange={setTo} />
        </Field>
        <Field className="w-52">
          <FieldLabel htmlFor="sale-production-line">{t("Production line")}</FieldLabel>
          <Select
            value={productionLine ? `line:${productionLine}` : "all"}
            onValueChange={(value) => setProductionLine(value === "all" ? "" : value.slice(5))}
          >
            <SelectTrigger id="sale-production-line" className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                <SelectItem value="all">{t("All production lines")}</SelectItem>
                {data?.productionLines.map((line) => (
                  <SelectItem key={line} value={`line:${line}`}>
                    {line}
                  </SelectItem>
                ))}
              </SelectGroup>
            </SelectContent>
          </Select>
        </Field>
      </div>

      <Table className={tableClass}>
        <TableHeader className="[&_tr]:border-t">
          <TableRow>
            <TableHead rowSpan={headerRowSpan}>{t("Code")}</TableHead>
            <TableHead rowSpan={headerRowSpan}>{t("Part name")}</TableHead>
            {deliveries.length > 0 ? (
              <TableHead colSpan={deliveries.length} className="text-center">
                {t("Delivery")}
              </TableHead>
            ) : null}
            <TableHead rowSpan={headerRowSpan} className="text-right">
              {t("Total quantity")}
            </TableHead>
            <TableHead rowSpan={headerRowSpan} className="text-right">
              {t("Price (VND)")}
            </TableHead>
            <TableHead rowSpan={headerRowSpan} className="text-right">
              {t("Amount (VND)")}
            </TableHead>
          </TableRow>
          {deliveries.length > 0 ? (
            <TableRow>
              {deliveries.map((delivery) => (
                <TableHead key={delivery.id} className="text-right">
                  {delivery.number}
                </TableHead>
              ))}
            </TableRow>
          ) : null}
          {deliveries.length > 0 ? (
            <TableRow>
              {deliveries.map((delivery) => (
                <TableHead key={delivery.id} className="text-right text-muted-foreground">
                  {formatDate(delivery.date)}
                </TableHead>
              ))}
            </TableRow>
          ) : null}
        </TableHeader>
        <TableBody>
          {loading ? <LoadingRows columns={columns} /> : null}
          {!loading && !data ? (
            <TableRow>
              <TableCell colSpan={columns} className="text-center">
                <span>{t("Could not load the report.")} </span>
                <Button variant="link" onClick={reload}>
                  {t("Try again")}
                </Button>
              </TableCell>
            </TableRow>
          ) : null}
          {!loading && data && data.rows.length === 0 ? (
            <EmptyRow columns={columns} text={t("No finished products were issued in this period.")} />
          ) : null}
          {!loading &&
            data?.rows.map((row) => (
              <TableRow key={row.itemId}>
                <TableCell className="font-medium">{row.code}</TableCell>
                <TableCell>{row.name}</TableCell>
                {deliveries.map((delivery) => (
                  <TableCell key={delivery.id} className="text-right tabular-nums">
                    {row.quantities[delivery.id] ? formatQty(row.quantities[delivery.id]) : "-"}
                  </TableCell>
                ))}
                <TableCell className="text-right font-medium tabular-nums">{formatQty(row.totalQuantity)}</TableCell>
                <TableCell className="text-right tabular-nums">
                  {row.price === null ? "-" : formatPrice(row.price)}
                </TableCell>
                <TableCell className="text-right font-medium tabular-nums">
                  {row.amount === null ? "-" : formatPrice(row.amount)}
                </TableCell>
              </TableRow>
            ))}
        </TableBody>
      </Table>
      <p className="text-muted-foreground px-4 text-xs">
        {t(
          "Only confirmed issue vouchers are included. Prices and production lines use the current item catalog; missing prices are shown as a dash.",
        )}
      </p>
    </PageCard>
  );
}
