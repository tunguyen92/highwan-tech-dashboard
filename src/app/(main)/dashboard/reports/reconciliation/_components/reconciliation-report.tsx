"use client";

import { useState } from "react";

import { Download } from "lucide-react";

import { CalendarDatePicker } from "@/components/calendar-date-picker";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Field, FieldLabel } from "@/components/ui/field";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useT } from "@/lib/i18n/provider";
import { unwrapAs } from "@/lib/wms/action-client";
import { downloadCsv } from "@/lib/wms/csv";
import { currentPeriod, formatQty } from "@/lib/wms/format";
import type { ReconResult } from "@/lib/wms/types";
import { useLoad } from "@/lib/wms/use-load";
import { reconciliationAction } from "@/server/actions/reports";

import { PageCard, tableClass } from "../../../_components/wms/page-card";
import { QtyInput } from "../../../_components/wms/qty-input";
import { ReconStatusBadge } from "../../../_components/wms/status-badges";
import { EmptyRow, LoadingRows } from "../../../_components/wms/table-states";

const STATUS_TEXT = {
  OVER: "Over norm",
  NO_NORM: "No BOM",
  UNDER: "Issued less than norm",
  OK: "Normal",
};

export function ReconciliationReport() {
  const t = useT();
  const [period, setPeriod] = useState(currentPeriod());
  const [tolerance, setTolerance] = useState("2");
  const [onlyAbnormal, setOnlyAbnormal] = useState(false);

  const { data, loading } = useLoad(
    () =>
      unwrapAs<ReconResult>(
        reconciliationAction({
          period,
          tolerancePercent: tolerance === "" ? 0 : Number(tolerance),
          onlyAbnormal,
        }),
      ),
    [period, tolerance, onlyAbnormal],
  );
  const rows = data?.rows ?? [];
  const skipped = data?.skipped ?? [];
  const over = rows.filter((r) => r.status === "OVER" || r.status === "NO_NORM").length;

  return (
    <PageCard
      title={t("Monthly BOM reconciliation")}
      description={t(
        "Compares the materials actually issued to production with the requirement calculated from finished products received in the month, using the active BOMs.",
      )}
      actions={
        <Button
          variant="outline"
          size="sm"
          disabled={rows.length === 0}
          onClick={() =>
            downloadCsv(
              `doi-chieu-dinh-muc_${period}.csv`,
              [
                t("Code"),
                t("Name"),
                t("UoM"),
                t("Per BOM"),
                t("Max allowed"),
                t("Actually issued"),
                t("Difference"),
                t("% difference"),
                t("Status"),
              ],
              rows.map((r) => [
                r.code,
                r.name,
                r.unit,
                r.norm,
                r.allowed,
                r.actual,
                r.diff,
                r.diffPercent,
                t(STATUS_TEXT[r.status]),
              ]),
            )
          }
        >
          <Download /> {t("Export CSV")}
        </Button>
      }
    >
      <div className="flex flex-wrap items-end gap-3 px-4">
        <Field className="w-44">
          <FieldLabel htmlFor="rc-period">{t("Month")}</FieldLabel>
          <CalendarDatePicker id="rc-period" type="month" value={period} onChange={setPeriod} />
        </Field>
        <Field className="w-44">
          <FieldLabel htmlFor="rc-tol">{t("General tolerance (%)")}</FieldLabel>
          <QtyInput id="rc-tol" value={tolerance} onChange={setTolerance} />
        </Field>
        <Field orientation="horizontal" className="w-auto pb-1.5">
          <Switch id="rc-abnormal" checked={onlyAbnormal} onCheckedChange={setOnlyAbnormal} />
          <FieldLabel htmlFor="rc-abnormal" className="font-normal">
            {t("Only abnormal lines")}
          </FieldLabel>
        </Field>
        {!loading && over > 0 ? (
          <Badge variant="destructive">
            {over} {t("item(s) over norm")}
          </Badge>
        ) : null}
      </div>

      {skipped.length > 0 ? (
        <div className="mx-4 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800 dark:border-amber-500/20 dark:bg-amber-500/15 dark:text-amber-300">
          {t("Could not calculate the requirement for")}{" "}
          {skipped.map((p) => `${p.code} (${formatQty(p.quantity)})`).join(", ")}{" "}
          {t("because they have no active BOM. Materials of these products appear as 'No BOM' if they were issued.")}
        </div>
      ) : null}

      <Table className={tableClass}>
        <TableHeader className="[&_tr]:border-t">
          <TableRow>
            <TableHead>{t("Code")}</TableHead>
            <TableHead>{t("Name")}</TableHead>
            <TableHead>{t("UoM")}</TableHead>
            <TableHead className="text-right">{t("Per BOM")}</TableHead>
            <TableHead className="text-right">{t("Max allowed")}</TableHead>
            <TableHead className="text-right">{t("Actually issued")}</TableHead>
            <TableHead className="text-right">{t("Difference")}</TableHead>
            <TableHead className="text-right">%</TableHead>
            <TableHead>{t("Status")}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {loading ? <LoadingRows columns={9} /> : null}
          {!loading && rows.length === 0 ? <EmptyRow columns={9} text={t("No data for this month.")} /> : null}
          {!loading &&
            rows.map((row) => (
              <TableRow key={row.itemId}>
                <TableCell className="font-medium">{row.code}</TableCell>
                <TableCell>{row.name}</TableCell>
                <TableCell>{row.unit}</TableCell>
                <TableCell className="text-right tabular-nums">{formatQty(row.norm)}</TableCell>
                <TableCell className="text-muted-foreground text-right tabular-nums">
                  {formatQty(row.allowed)}
                </TableCell>
                <TableCell className="text-right font-medium tabular-nums">{formatQty(row.actual)}</TableCell>
                <TableCell className="text-right tabular-nums">{formatQty(row.diff)}</TableCell>
                <TableCell className="text-right tabular-nums">
                  {row.diffPercent === null ? "-" : `${row.diffPercent > 0 ? "+" : ""}${formatQty(row.diffPercent)}%`}
                </TableCell>
                <TableCell>
                  <ReconStatusBadge status={row.status} />
                </TableCell>
              </TableRow>
            ))}
        </TableBody>
      </Table>
      <ul className="text-muted-foreground list-disc space-y-1 px-8 text-xs">
        <li>
          {t(
            "Requirement = (finished products received in the month, net of cancellations) * active BOM, expanded across all levels.",
          )}
        </li>
        <li>
          {t(
            'Only "Issue to production" and "Receive finished products" vouchers count. Items marked "Not reconciled" are ignored.',
          )}
        </li>
        <li>
          {t(
            "Work in progress on the line at month end (materials issued but finished products not yet received) skews the figures temporarily and is made up the following month.",
          )}
        </li>
        <li>
          {t(
            "If a BOM is changed mid-month, that month's figures are only approximate because the currently active version is used.",
          )}
        </li>
      </ul>
    </PageCard>
  );
}
