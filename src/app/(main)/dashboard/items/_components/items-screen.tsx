"use client";

import { useEffect, useState } from "react";

import { ChevronLeft, ChevronRight, MoreHorizontal, Plus, Search } from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Field, FieldLabel } from "@/components/ui/field";
import { InputGroup, InputGroupAddon, InputGroupInput } from "@/components/ui/input-group";
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useT } from "@/lib/i18n/provider";
import { unwrap, unwrapAs } from "@/lib/wms/action-client";
import type { ItemType } from "@/lib/wms/constants";
import { formatQty } from "@/lib/wms/format";
import type { ItemDTO } from "@/lib/wms/types";
import { useDebounced, useLoad } from "@/lib/wms/use-load";
import { listItemsPageAction, setItemActiveAction } from "@/server/actions/items";

import { ConfirmDialog } from "../../_components/wms/confirm-dialogs";
import { PageCard, tableClass } from "../../_components/wms/page-card";
import { ItemTypeBadge } from "../../_components/wms/status-badges";
import { EmptyRow, LoadingRows } from "../../_components/wms/table-states";
import { useCan } from "../../_components/wms/user-context";
import { ItemFormDialog } from "./item-form-dialog";
import { WhereUsedDialog } from "./where-used-dialog";

type TypeFilter = "ALL" | ItemType;
type ItemListResult = { rows: ItemDTO[]; total: number; page: number; pageSize: number };

export function ItemsScreen() {
  const t = useT();
  const canWrite = useCan("item:write");
  const [q, setQ] = useState("");
  const [type, setType] = useState<TypeFilter>("ALL");
  const [includeInactive, setIncludeInactive] = useState(false);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [form, setForm] = useState<{ item: ItemDTO | null } | null>(null);
  const [whereUsed, setWhereUsed] = useState<ItemDTO | null>(null);
  const [toggle, setToggle] = useState<ItemDTO | null>(null);
  const debouncedQ = useDebounced(q);

  const { data, loading, reload } = useLoad(
    () =>
      unwrapAs<ItemListResult>(
        listItemsPageAction({
          type: type === "ALL" ? undefined : type,
          q: debouncedQ || undefined,
          includeInactive,
          page,
          pageSize,
        }),
      ),
    [type, includeInactive, debouncedQ, page, pageSize],
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
        title={t("Item catalog")}
        description={t(
          "Raw materials, semi-finished and finished products. Semi-finished items are only used in BOMs and are not stocked.",
        )}
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
            {canWrite ? (
              <Button size="sm" onClick={() => setForm({ item: null })}>
                <Plus /> {t("Add item")}
              </Button>
            ) : null}
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
              <TabsTrigger value="SEMI">{t("Semi-finished")}</TabsTrigger>
              <TabsTrigger value="PRODUCT">{t("Finished product")}</TabsTrigger>
            </TabsList>
          </Tabs>
          <Field orientation="horizontal" className="w-auto">
            <Switch
              id="show-inactive"
              checked={includeInactive}
              onCheckedChange={(checked) => {
                setIncludeInactive(checked);
                setPage(1);
              }}
            />
            <FieldLabel htmlFor="show-inactive" className="font-normal">
              {t("Show discontinued items")}
            </FieldLabel>
          </Field>
        </div>

        <Table className={tableClass}>
          <TableHeader className="[&_tr]:border-t">
            <TableRow>
              <TableHead>{t("Code")}</TableHead>
              <TableHead>{t("Name")}</TableHead>
              <TableHead>{t("Spec")}</TableHead>
              <TableHead>{t("Production line")}</TableHead>
              <TableHead>{t("Type")}</TableHead>
              <TableHead>{t("UoM")}</TableHead>
              <TableHead className="text-right">{t("Minimum stock")}</TableHead>
              <TableHead>{t("Notes")}</TableHead>
              <TableHead className="w-10" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? <LoadingRows columns={9} /> : null}
            {!loading && rows.length === 0 ? <EmptyRow columns={9} text={t("No items.")} /> : null}
            {!loading &&
              rows.map((item) => (
                <TableRow key={item._id} className={item.isActive ? "" : "opacity-60"}>
                  <TableCell className="font-medium">{item.code}</TableCell>
                  <TableCell>{item.name}</TableCell>
                  <TableCell>{item.spec || "-"}</TableCell>
                  <TableCell>{item.productionLine || "-"}</TableCell>
                  <TableCell>
                    <ItemTypeBadge type={item.type} />
                  </TableCell>
                  <TableCell>{item.unit}</TableCell>
                  <TableCell className="text-right tabular-nums">
                    {item.isStocked ? formatQty(item.minStock) : "-"}
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {item.isActive ? null : <Badge variant="secondary">{t("Inactive")}</Badge>}
                      {item.excludeFromReconciliation ? <Badge variant="outline">{t("Not reconciled")}</Badge> : null}
                    </div>
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon-sm" aria-label={t("Actions")}>
                          <MoreHorizontal />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuGroup>
                          {canWrite ? (
                            <DropdownMenuItem onClick={() => setForm({ item })}>{t("Edit")}</DropdownMenuItem>
                          ) : null}
                          {item.type !== "PRODUCT" ? (
                            <DropdownMenuItem onClick={() => setWhereUsed(item)}>
                              {t("Used in which BOMs")}
                            </DropdownMenuItem>
                          ) : null}
                          {canWrite ? (
                            <>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem onClick={() => setToggle(item)}>
                                {item.isActive ? t("Deactivate") : t("Reactivate")}
                              </DropdownMenuItem>
                            </>
                          ) : null}
                          {!canWrite && item.type === "PRODUCT" ? (
                            <DropdownMenuLabel>{t("No actions available")}</DropdownMenuLabel>
                          ) : null}
                        </DropdownMenuGroup>
                      </DropdownMenuContent>
                    </DropdownMenu>
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
              <label htmlFor="items-page-size">{t("Rows per page")}</label>
              <Select
                value={String(pageSize)}
                onValueChange={(value) => {
                  setPageSize(Number(value));
                  setPage(1);
                }}
              >
                <SelectTrigger id="items-page-size" size="sm" className="w-16">
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
          <nav aria-label={t("Item pages")} className="flex items-center gap-1">
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

      {form ? (
        <ItemFormDialog
          key={form.item?._id ?? "new"}
          item={form.item}
          onClose={() => setForm(null)}
          onSaved={() => {
            setForm(null);
            reload();
          }}
        />
      ) : null}
      <WhereUsedDialog item={whereUsed} onClose={() => setWhereUsed(null)} />
      <ConfirmDialog
        open={toggle !== null}
        onOpenChange={(open) => !open && setToggle(null)}
        title={
          toggle?.isActive
            ? t("Deactivate {code}?", { code: toggle?.code })
            : t("Reactivate {code}?", { code: toggle?.code })
        }
        description={
          toggle?.isActive
            ? t("The item will no longer appear when creating new vouchers and BOMs. Existing data is kept.")
            : undefined
        }
        confirmLabel={t("OK")}
        onConfirm={async () => {
          if (!toggle) return;
          const result = await unwrap(setItemActiveAction(toggle._id, !toggle.isActive));
          if (result !== null) {
            toast.success(t("Updated."));
            setToggle(null);
            reload();
          }
        }}
      />
    </>
  );
}
