"use client";

import { useState } from "react";

import { Download } from "lucide-react";

import { CalendarDatePicker } from "@/components/calendar-date-picker";
import { Button } from "@/components/ui/button";
import { Field, FieldLabel } from "@/components/ui/field";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useT } from "@/lib/i18n/provider";
import { unwrapAs } from "@/lib/wms/action-client";
import { downloadCsv } from "@/lib/wms/csv";
import { firstDayOfMonthYmd, formatQty, todayYmd } from "@/lib/wms/format";
import type { SummaryRow } from "@/lib/wms/types";
import { useLoad } from "@/lib/wms/use-load";
import { stockSummaryAction } from "@/server/actions/reports";

import { PageCard, tableClass } from "../../../_components/wms/page-card";
import { EmptyRow, LoadingRows } from "../../../_components/wms/table-states";

type TypeFilter = "ALL" | "MATERIAL" | "PRODUCT";

export function MovementReport() {
  const t = useT();
  const [from, setFrom] = useState(firstDayOfMonthYmd());
  const [to, setTo] = useState(todayYmd());
  const [type, setType] = useState<TypeFilter>("ALL");

  const { data, loading } = useLoad(
    () => unwrapAs<SummaryRow[]>(stockSummaryAction({ from, to, type: type === "ALL" ? undefined : type })),
    [from, to, type],
  );
  const rows = data ?? [];

  return (
    <PageCard
      title={t("Stock in / out / balance report")}
      description={t("Opening balance, total in, total out and closing balance per item.")}
      actions={
        <Button
          variant="outline"
          size="sm"
          disabled={rows.length === 0}
          onClick={() =>
            downloadCsv(
              `nhap-xuat-ton_${from}_${to}.csv`,
              [t("Code"), t("Name"), t("UoM"), t("Opening"), t("In"), t("Out"), t("Closing")],
              rows.map((r) => [r.code, r.name, r.unit, r.opening, r.in, r.out, r.closing]),
            )
          }
        >
          <Download /> {t("Export CSV")}
        </Button>
      }
    >
      <div className="flex flex-wrap items-end gap-3 px-4">
        <Field className="w-40">
          <FieldLabel htmlFor="nxt-from">{t("From")}</FieldLabel>
          <CalendarDatePicker id="nxt-from" value={from} max={to} onChange={setFrom} />
        </Field>
        <Field className="w-40">
          <FieldLabel htmlFor="nxt-to">{t("To")}</FieldLabel>
          <CalendarDatePicker id="nxt-to" value={to} min={from} onChange={setTo} />
        </Field>
        <Tabs value={type} onValueChange={(value) => setType(value as TypeFilter)}>
          <TabsList>
            <TabsTrigger value="ALL">{t("All")}</TabsTrigger>
            <TabsTrigger value="MATERIAL">{t("Raw material")}</TabsTrigger>
            <TabsTrigger value="PRODUCT">{t("Finished product")}</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      <Table className={tableClass}>
        <TableHeader className="[&_tr]:border-t">
          <TableRow>
            <TableHead>{t("Code")}</TableHead>
            <TableHead>{t("Name")}</TableHead>
            <TableHead>{t("UoM")}</TableHead>
            <TableHead className="text-right">{t("Opening")}</TableHead>
            <TableHead className="text-right">{t("In")}</TableHead>
            <TableHead className="text-right">{t("Out")}</TableHead>
            <TableHead className="text-right">{t("Closing")}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {loading ? <LoadingRows columns={7} /> : null}
          {!loading && rows.length === 0 ? <EmptyRow columns={7} text={t("No activity in this period.")} /> : null}
          {!loading &&
            rows.map((row) => (
              <TableRow key={row.itemId}>
                <TableCell className="font-medium">{row.code}</TableCell>
                <TableCell>{row.name}</TableCell>
                <TableCell>{row.unit}</TableCell>
                <TableCell className="text-right tabular-nums">{formatQty(row.opening)}</TableCell>
                <TableCell className="text-right tabular-nums">{formatQty(row.in)}</TableCell>
                <TableCell className="text-right tabular-nums">{formatQty(row.out)}</TableCell>
                <TableCell className="text-right font-medium tabular-nums">{formatQty(row.closing)}</TableCell>
              </TableRow>
            ))}
        </TableBody>
      </Table>
      <p className="text-muted-foreground px-4 text-xs">
        {t(
          "Cancelled vouchers are recorded with a reversal dated on the day of cancellation: cancelling an issue shows in the In column of that period, cancelling a receipt shows in the Out column. Closed periods therefore never change.",
        )}
      </p>
    </PageCard>
  );
}
