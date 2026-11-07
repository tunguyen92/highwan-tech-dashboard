"use client";

import { useState } from "react";

import { Download } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Field, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useT } from "@/lib/i18n/provider";
import { unwrapAs } from "@/lib/wms/action-client";
import { VOUCHER_TYPE_LABEL } from "@/lib/wms/constants";
import { downloadCsv } from "@/lib/wms/csv";
import { firstDayOfMonthYmd, formatDate, formatQty, todayYmd } from "@/lib/wms/format";
import type { StockCardDTO, StockRow } from "@/lib/wms/types";
import { useLoad } from "@/lib/wms/use-load";
import { stockCardAction } from "@/server/actions/reports";

import { tableClass } from "../../_components/wms/page-card";
import { EmptyRow, LoadingRows } from "../../_components/wms/table-states";

/** Stock card (Thẻ kho): opening balance plus every movement of one item, with a running balance */
export function StockCardSheet({ item, onClose }: { item: StockRow | null; onClose: () => void }) {
  const t = useT();
  const [from, setFrom] = useState(firstDayOfMonthYmd());
  const [to, setTo] = useState(todayYmd());

  const { data, loading } = useLoad(
    () => (item ? unwrapAs<StockCardDTO>(stockCardAction({ itemId: item.itemId, from, to })) : Promise.resolve(null)),
    [item?.itemId, from, to],
  );

  function exportCsv() {
    if (!data || !item) return;
    downloadCsv(
      `the-kho-${item.code}.csv`,
      [t("Date"), t("Voucher no."), t("Type"), t("In"), t("Out"), t("Balance")],
      [
        ["", t("Opening balance"), "", "", "", data.opening],
        ...data.rows.map((r) => [
          formatDate(r.date),
          r.voucherNo,
          t(VOUCHER_TYPE_LABEL[r.voucherType]),
          r.in,
          r.out,
          r.balance,
        ]),
      ],
    );
  }

  return (
    <Sheet open={item !== null} onOpenChange={(open) => !open && onClose()}>
      <SheetContent className="w-full gap-0 data-[state=right]:sm:max-w-3xl!">
        <SheetHeader className="border-b">
          <SheetTitle>
            {t("Stock card:")} {item?.code} {item ? ` - ${item.name}` : ""}
          </SheetTitle>
          <SheetDescription>
            {t("Unit of measure:")} {item?.unit}
            {t(". The balance is calculated in date order.")}
          </SheetDescription>
        </SheetHeader>

        <div className="flex flex-wrap items-end gap-3 p-4">
          <Field className="w-40">
            <FieldLabel htmlFor="card-from">{t("From")}</FieldLabel>
            <Input id="card-from" type="date" value={from} max={to} onChange={(e) => setFrom(e.target.value)} />
          </Field>
          <Field className="w-40">
            <FieldLabel htmlFor="card-to">{t("To")}</FieldLabel>
            <Input id="card-to" type="date" value={to} min={from} onChange={(e) => setTo(e.target.value)} />
          </Field>
          <Button variant="outline" size="sm" className="ml-auto" onClick={exportCsv} disabled={!data}>
            <Download /> {t("Export CSV")}
          </Button>
        </div>

        <div className="min-h-0 flex-1 overflow-auto">
          <Table className={tableClass}>
            <TableHeader className="[&_tr]:border-t">
              <TableRow>
                <TableHead>{t("Date")}</TableHead>
                <TableHead>{t("Voucher no.")}</TableHead>
                <TableHead>{t("Type")}</TableHead>
                <TableHead className="text-right">{t("In")}</TableHead>
                <TableHead className="text-right">{t("Out")}</TableHead>
                <TableHead className="text-right">{t("Balance")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? <LoadingRows columns={6} /> : null}
              {!loading && data ? (
                <>
                  <TableRow className="bg-muted/40">
                    <TableCell colSpan={5} className="font-medium">
                      {t("Opening balance")}
                    </TableCell>
                    <TableCell className="text-right font-medium tabular-nums">{formatQty(data.opening)}</TableCell>
                  </TableRow>

                  {data.rows.length === 0 ? <EmptyRow columns={6} text={t("No activity in this period.")} /> : null}
                  {data.rows.map((row) => (
                    <TableRow key={`${row.voucherNo}-${row.kind}-${row.date}-${row.balance}-${row.in}-${row.out}`}>
                      <TableCell>{formatDate(row.date)}</TableCell>
                      <TableCell>
                        {row.voucherNo}{" "}
                        {row.kind === "REVERSAL" ? <Badge variant="destructive">{t("Reversal")}</Badge> : null}
                      </TableCell>
                      <TableCell className="text-muted-foreground">{t(VOUCHER_TYPE_LABEL[row.voucherType])}</TableCell>
                      <TableCell className="text-right tabular-nums">
                        {row.in === "0" ? "" : formatQty(row.in)}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {row.out === "0" ? "" : formatQty(row.out)}
                      </TableCell>
                      <TableCell className="text-right font-medium tabular-nums">{formatQty(row.balance)}</TableCell>
                    </TableRow>
                  ))}
                </>
              ) : null}
            </TableBody>
          </Table>
        </div>
      </SheetContent>
    </Sheet>
  );
}
