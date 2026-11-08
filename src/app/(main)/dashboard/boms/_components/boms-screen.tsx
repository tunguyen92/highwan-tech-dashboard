"use client";

import { useEffect, useState } from "react";

import Link from "next/link";

import { ChevronLeft, ChevronRight, Plus, Search } from "lucide-react";

import { Button } from "@/components/ui/button";
import { InputGroup, InputGroupAddon, InputGroupInput } from "@/components/ui/input-group";
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useT } from "@/lib/i18n/provider";
import { unwrapAs } from "@/lib/wms/action-client";
import { BOM_STATUS_LABEL, type BomStatus } from "@/lib/wms/constants";
import { formatDate } from "@/lib/wms/format";
import type { BomListRow } from "@/lib/wms/types";
import { useDebounced, useLoad } from "@/lib/wms/use-load";
import { listBomsPageAction } from "@/server/actions/boms";

import { PageCard, tableClass } from "../../_components/wms/page-card";
import { BomStatusBadge } from "../../_components/wms/status-badges";
import { EmptyRow, LoadingRows } from "../../_components/wms/table-states";
import { useItems } from "../../_components/wms/use-items";
import { useCan } from "../../_components/wms/user-context";
import { CreateBomDialog } from "./create-bom-dialog";

type StatusFilter = "ALL" | BomStatus;
type BomListResult = { rows: BomListRow[]; total: number; page: number; pageSize: number };

export function BomsScreen() {
  const t = useT();
  const canWrite = useCan("bom:write");
  const [q, setQ] = useState("");
  const [status, setStatus] = useState<StatusFilter>("ALL");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [creating, setCreating] = useState(false);
  const { items } = useItems();
  const debouncedQ = useDebounced(q);

  const { data, loading } = useLoad(
    () =>
      unwrapAs<BomListResult>(
        listBomsPageAction({
          q: debouncedQ || undefined,
          status: status === "ALL" ? undefined : status,
          page,
          pageSize,
        }),
      ),
    [debouncedQ, status, page, pageSize],
  );

  const rows = data?.rows ?? [];
  const total = data?.total ?? 0;
  const pageCount = Math.max(1, Math.ceil(total / pageSize));
  const currentPage = Math.min(page, pageCount);
  const pageStart = Math.max(1, Math.min(currentPage - 2, pageCount - 4));
  const pages = Array.from({ length: Math.min(5, pageCount) }, (_, index) => pageStart + index);

  useEffect(() => {
    if (page > pageCount) setPage(pageCount);
  }, [page, pageCount]);

  return (
    <>
      <PageCard
        title={t("BOM (bill of materials)")}
        description={t(
          "Multi-level BOM: a finished product consists of semi-finished items, which consist of raw materials. An active version cannot be edited; create a new version to change it.",
        )}
        actions={
          <>
            <InputGroup className="h-7 w-full md:w-56">
              <InputGroupAddon align="inline-start">
                <Search className="size-3.5" />
              </InputGroupAddon>
              <InputGroupInput
                className="h-7"
                placeholder={t("Search by code...")}
                value={q}
                onChange={(e) => {
                  setQ(e.target.value);
                  setPage(1);
                }}
              />
            </InputGroup>
            {canWrite ? (
              <Button size="sm" onClick={() => setCreating(true)}>
                <Plus /> {t("Create BOM")}
              </Button>
            ) : null}
          </>
        }
      >
        <div className="px-4">
          <Select
            value={status}
            onValueChange={(value) => {
              setStatus(value as StatusFilter);
              setPage(1);
            }}
          >
            <SelectTrigger size="sm">
              <span className="text-muted-foreground">{t("Status:")}</span>
              <SelectValue />
            </SelectTrigger>
            <SelectContent position="popper" align="start">
              <SelectGroup>
                <SelectItem value="ALL">{t("All")}</SelectItem>
                {(Object.keys(BOM_STATUS_LABEL) as BomStatus[]).map((key) => (
                  <SelectItem key={key} value={key}>
                    {t(BOM_STATUS_LABEL[key])}
                  </SelectItem>
                ))}
              </SelectGroup>
            </SelectContent>
          </Select>
        </div>

        <Table className={tableClass}>
          <TableHeader className="[&_tr]:border-t">
            <TableRow>
              <TableHead>{t("Code")}</TableHead>
              <TableHead>{t("Name")}</TableHead>
              <TableHead>{t("Version")}</TableHead>
              <TableHead>{t("Status")}</TableHead>
              <TableHead className="text-right">{t("Lines")}</TableHead>
              <TableHead>{t("Effective from")}</TableHead>
              <TableHead>{t("Updated")}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? <LoadingRows columns={7} /> : null}
            {!loading && rows.length === 0 ? <EmptyRow columns={7} text={t("No BOMs yet.")} /> : null}
            {!loading &&
              rows.map((bom) => (
                <TableRow key={bom._id}>
                  <TableCell className="font-medium">
                    <Link href={`/dashboard/boms/${bom._id}`} className="text-primary underline underline-offset-4">
                      {bom.outputItemCode}
                    </Link>
                  </TableCell>
                  <TableCell>{bom.outputItemName || bom.outputItemCode}</TableCell>
                  <TableCell className="tabular-nums">v{bom.version}</TableCell>
                  <TableCell>
                    <BomStatusBadge status={bom.status} />
                  </TableCell>
                  <TableCell className="text-right tabular-nums">{bom.lineCount}</TableCell>
                  <TableCell>{formatDate(bom.effectiveFrom)}</TableCell>
                  <TableCell className="text-muted-foreground">{formatDate(bom.updatedAt)}</TableCell>
                </TableRow>
              ))}
          </TableBody>
        </Table>
        <footer className="bg-background flex min-h-12 shrink-0 flex-wrap items-center justify-between gap-3 border-t px-4 py-2 text-sm">
          <div className="text-muted-foreground flex flex-wrap items-center gap-4">
            <span className="tabular-nums" aria-live="polite">
              {t("{start}–{end} of {total} BOMs", {
                start: total ? (currentPage - 1) * pageSize + 1 : 0,
                end: Math.min(currentPage * pageSize, total),
                total,
              })}
            </span>
            <div className="flex items-center gap-2">
              <label htmlFor="boms-page-size">{t("Rows per page")}</label>
              <Select
                value={String(pageSize)}
                onValueChange={(value) => {
                  setPageSize(Number(value));
                  setPage(1);
                }}
              >
                <SelectTrigger id="boms-page-size" size="sm" className="w-16">
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
          <nav aria-label={t("BOM pages")} className="flex items-center gap-1">
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

      <CreateBomDialog open={creating} onOpenChange={setCreating} items={items} />
    </>
  );
}
