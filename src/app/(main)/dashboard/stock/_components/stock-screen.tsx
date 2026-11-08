"use client";

import { useEffect, useState } from "react";

import { AlertTriangle, ChevronLeft, ChevronRight, Download, History, Search } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Field, FieldLabel } from "@/components/ui/field";
import { InputGroup, InputGroupAddon, InputGroupInput } from "@/components/ui/input-group";
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useT } from "@/lib/i18n/provider";
import { unwrapAs } from "@/lib/wms/action-client";
import { downloadCsv } from "@/lib/wms/csv";
import { formatQty } from "@/lib/wms/format";
import type { StockRow } from "@/lib/wms/types";
import { useDebounced, useLoad } from "@/lib/wms/use-load";
import { currentStockAction, currentStockPageAction } from "@/server/actions/reports";

import { PageCard, tableClass } from "../../_components/wms/page-card";
import { EmptyRow, LoadingRows } from "../../_components/wms/table-states";
import { StockCardSheet } from "./stock-card-sheet";

type TypeFilter = "ALL" | "MATERIAL" | "PRODUCT";
type StockListResult = {
  rows: StockRow[];
  total: number;
  lowCount: number;
  page: number;
  pageSize: number;
};

export function StockScreen() {
  const t = useT();

  const [q, setQ] = useState("");
  const [type, setType] = useState<TypeFilter>("ALL");
  const [lowOnly, setLowOnly] = useState(false);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [cardItem, setCardItem] = useState<StockRow | null>(null);
  const bouncedQ = useDebounced(q);

  const { data, loading } = useLoad(
    () =>
      unwrapAs<StockListResult>(
        currentStockPageAction({
          type: type === "ALL" ? undefined : type,
          lowOnly,
          q: bouncedQ || undefined,
          page,
          pageSize,
        }),
      ),
    [type, lowOnly, bouncedQ, page, pageSize],
  );

  const rows = data?.rows ?? [];
  const total = data?.total ?? 0;
  const lowCount = data?.lowCount ?? 0;
  const pageCount = Math.max(1, Math.ceil(total / pageSize));
  const currentPage = Math.min(page, pageCount);
  const pageStart = Math.max(1, Math.min(currentPage - 2, pageCount - 4));
  const pages = Array.from({ length: Math.min(5, pageCount) }, (_, index) => pageStart + index);

  useEffect(() => {
    if (page > pageCount) setPage(pageCount);
  }, [page, pageCount]);

  async function exportCsv() {
    const allRows = await unwrapAs<StockRow[]>(
      currentStockAction({ type: type === "ALL" ? undefined : type, lowOnly, q: bouncedQ || undefined }),
    );
    if (allRows === null) return;
    downloadCsv(
      "ton-kho.csv",
      [t("Code"), t("Name"), t("UoM"), t("Current stock"), t("Minimum stock")],
      allRows.map((r) => [r.code, r.name, r.unit, r.onHand, r.minStock]),
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
                onChange={(event) => {
                  setQ(event.target.value);
                  setPage(1);
                }}
              />
            </InputGroup>
            <Button variant="outline" size="sm" onClick={() => void exportCsv()} disabled={rows.length === 0}>
              <Download /> {t("Export CSV")}
            </Button>
          </>
        }
      >
        <div className="flex flex-wrap items-center justify-between gap-3 px-4">
          <Tabs
            value={type}
            onValueChange={(value) => {
              setType(value as TypeFilter);
              setPage(1);
            }}
          >
            <TabsList className="gap-2">
              <TabsTrigger value="ALL">{t("All")}</TabsTrigger>
              <TabsTrigger value="MATERIAL">{t("Raw material")}</TabsTrigger>
              <TabsTrigger value="PRODUCT">{t("Finished product")}</TabsTrigger>
            </TabsList>
          </Tabs>
          <Field orientation="horizontal" className="w-auto">
            <Switch
              id="low-only"
              checked={lowOnly}
              onCheckedChange={(checked) => {
                setLowOnly(checked);
                setPage(1);
              }}
            />
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
              <TableHead>{t("UoM")}</TableHead>
              <TableHead className="text-right">{t("Current stock")}</TableHead>
              <TableHead className="text-right">{t("Minimum")}</TableHead>
              <TableHead>{t("Status")}</TableHead>
              <TableHead className="w-10" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? <LoadingRows columns={7} /> : null}
            {!loading && rows.length === 0 ? <EmptyRow columns={7} text={t("No items yet.")} /> : null}
            {!loading &&
              rows.map((row) => (
                <TableRow key={row.itemId}>
                  <TableCell className="font-medium">{row.code}</TableCell>
                  <TableCell>{row.name}</TableCell>
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
        <footer className="bg-background flex min-h-12 shrink-0 flex-wrap items-center justify-between gap-3 border-t px-4 py-2 text-sm">
          <div className="text-muted-foreground flex flex-wrap items-center gap-4">
            <span className="tabular-nums" aria-live="polite">
              {t("{start}–{end} of {total} items", {
                start: total ? (currentPage - 1) * pageSize + 1 : 0,
                end: Math.min(currentPage * pageSize, total),
                total,
              })}
            </span>
            <div className="flex items-center gap-2">
              <label htmlFor="stock-page-size">{t("Rows per page")}</label>
              <Select
                value={String(pageSize)}
                onValueChange={(value) => {
                  setPageSize(Number(value));
                  setPage(1);
                }}
              >
                <SelectTrigger id="stock-page-size" size="sm" className="w-16">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent side="top">
                  <SelectGroup>
                    {[10, 25, 50, 100].map((size) => (
                      <SelectItem key={size} value={String(size)}>
                        {size}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>
            </div>
          </div>
          <nav aria-label={t("Stock pages")} className="flex items-center gap-1">
            <Button
              variant="outline"
              size="icon-sm"
              aria-label={t("Previous page")}
              disabled={currentPage <= 1}
              onClick={() => setPage(currentPage - 1)}
            >
              <ChevronLeft />
            </Button>
            {pages.map((pageNumber) => (
              <Button
                key={pageNumber}
                variant={pageNumber === currentPage ? "secondary" : "ghost"}
                size="icon-sm"
                aria-label={t("Page {page}", { page: pageNumber })}
                aria-current={pageNumber === currentPage ? "page" : undefined}
                onClick={() => setPage(pageNumber)}
              >
                {pageNumber}
              </Button>
            ))}
            <Button
              variant="outline"
              size="icon-sm"
              aria-label={t("Next page")}
              disabled={currentPage >= pageCount}
              onClick={() => setPage(currentPage + 1)}
            >
              <ChevronRight />
            </Button>
          </nav>
        </footer>
      </PageCard>

      <StockCardSheet item={cardItem} onClose={() => setCardItem(null)} />
    </>
  );
}
