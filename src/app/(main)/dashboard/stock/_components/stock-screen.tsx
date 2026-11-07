"use client";

import { useState } from "react";

import { AlertTriangle, Download, History, Search } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Field, FieldLabel } from "@/components/ui/field";
import { InputGroup, InputGroupAddon, InputGroupInput } from "@/components/ui/input-group";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useT } from "@/lib/i18n/provider";
import { unwrapAs } from "@/lib/wms/action-client";
import { downloadCsv } from "@/lib/wms/csv";
import { formatQty } from "@/lib/wms/format";
import type { StockRow } from "@/lib/wms/types";
import { useDebounced, useLoad } from "@/lib/wms/use-load";
import { currentStockAction } from "@/server/actions/reports";

import { PageCard, tableClass } from "../../_components/wms/page-card";
import { EmptyRow, LoadingRows } from "../../_components/wms/table-states";
import { StockCardSheet } from "./stock-card-sheet";

type TypeFilter = "ALL" | "MATERIAL" | "PRODUCT";

export function StockScreen() {
  const t = useT();

  const [q, setQ] = useState("");
  const [type, setType] = useState<TypeFilter>("ALL");
  const [lowOnly, setLowOnly] = useState(false);
  const [cardItem, setCardItem] = useState<StockRow | null>(null);
  const bouncedQ = useDebounced(q);

  const { data, loading } = useLoad(
    () =>
      unwrapAs<StockRow[]>(
        currentStockAction({ type: type === "ALL" ? undefined : type, lowOnly, q: bouncedQ || undefined }),
      ),
    [type, lowOnly, bouncedQ],
  );

  const rows = data ?? [];
  const lowCount = rows.filter((row) => row.isLow).length;

  function exportCsv() {
    downloadCsv(
      "ton-kho.csv",
      [t("Code"), t("Name"), t("Group"), t("UoM"), t("Current stock"), t("Minimum stock")],
      rows.map((r) => [r.code, r.name, r.group, r.unit, r.onHand, r.minStock]),
    );
  }

  return (
    <>
      <PageCard
        title={t("Inventory")}
        description={t("Current stock of raw materials and finished products, with alerts below the minimum level.")}
        actions={
          <>
            <InputGroup className="h-7 w-full md:w-64">
              <InputGroupAddon align="inline-start">
                <Search className="size-3.5" />
              </InputGroupAddon>
              <InputGroupInput
                className="h-7"
                placeholder={t("Search by code or name...")}
                value={q}
                onChange={(event) => setQ(event.target.value)}
              />
            </InputGroup>
            <Button variant="outline" size="sm" onClick={exportCsv} disabled={rows.length === 0}>
              <Download /> {t("Export CSV")}
            </Button>
          </>
        }
      >
        <div className="flex flex-wrap items-center justify-between gap-3 px-4">
          <Tabs value={type} onValueChange={(value) => setType(value as TypeFilter)}>
            <TabsList>
              <TabsTrigger value="ALL">{t("All")}</TabsTrigger>
              <TabsTrigger value="MATERIAL">{t("Raw material")}</TabsTrigger>
              <TabsTrigger value="PRODUCT">{t("Finished product")}</TabsTrigger>
            </TabsList>
          </Tabs>
          <Field orientation="horizontal" className="w-auto">
            <Switch id="low-only" checked={lowOnly} onCheckedChange={setLowOnly} />
            <FieldLabel htmlFor="low-only" className="font-normal">
              {t("Only items below minimum")}
            </FieldLabel>
          </Field>
        </div>

        {lowCount > 0 && !lowOnly ? (
          <div className="mx-4 flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800 dark:border-amber-500/20 dark:bg-amber-500/15 dark:text-amber-300">
            <AlertTriangle className="size-4 shrink-0" />
            {lowCount} {t("item(s) below the minimum stock level.")}
          </div>
        ) : null}

        <Table className={tableClass}>
          <TableHeader className="[&_tr]:border-t">
            <TableRow>
              <TableHead>{t("Code")}</TableHead>
              <TableHead>{t("Name")}</TableHead>
              <TableHead>{t("Group")}</TableHead>
              <TableHead>{t("UoM")}</TableHead>
              <TableHead className="text-right">{t("Current stock")}</TableHead>
              <TableHead className="text-right">{t("Minimum")}</TableHead>
              <TableHead>{t("Status")}</TableHead>
              <TableHead className="w-10" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? <LoadingRows columns={8} /> : null}
            {!loading && rows.length === 0 ? <EmptyRow columns={8} text={t("No items yet.")} /> : null}
            {!loading &&
              rows.map((row) => (
                <TableRow key={row.itemId}>
                  <TableCell className="font-medium">{row.code}</TableCell>
                  <TableCell>{row.name}</TableCell>
                  <TableCell className="text-muted-foreground">{row.group}</TableCell>
                  <TableCell>{row.unit}</TableCell>
                  <TableCell className={`text-right font-medium tabular-nums ${row.isLow ? "text-destructive" : ""}`}>
                    {formatQty(row.onHand)}
                  </TableCell>
                  <TableCell className="text-muted-foreground text-right tabular-nums">
                    {formatQty(row.minStock)}
                  </TableCell>
                  <TableCell>
                    {row.isLow ? (
                      <Badge variant="destructive">{t("Below minimum")}</Badge>
                    ) : (
                      <Badge variant="outline">{t("Sufficient")}</Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      aria-label={t("View stock card")}
                      onClick={() => setCardItem(row)}
                    >
                      <History />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
          </TableBody>
        </Table>
      </PageCard>

      <StockCardSheet item={cardItem} onClose={() => setCardItem(null)} />
    </>
  );
}
