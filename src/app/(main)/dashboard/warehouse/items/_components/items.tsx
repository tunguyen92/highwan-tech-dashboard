"use client";
import * as React from "react";

import {
  type ColumnFiltersState,
  type ColumnVisibilityState,
  type PaginationState,
  type SortingState,
  useTable,
} from "@tanstack/react-table";
import { Cog, Download, Grid, Plus, Rows3, Search, SlidersHorizontal } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { InputGroup, InputGroupAddon, InputGroupInput } from "@/components/ui/input-group";
import { Kbd } from "@/components/ui/kbd";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { dataTableFeatures } from "@/lib/data-table-features";

import { WarehouseDialog } from "../../_components/warehouse-dialogs";
import { type ItemCategory, type ItemRow, type ItemStatus, itemCategoryValues, itemFilters } from "./data";
import { itemsColumns } from "./items-columns";
import { ItemsTable } from "./items-table";

type ItemDraft = {
  sku: string;
  name: string;
  category: ItemCategory;
  unit: string;
  stock: string;
  reserved: string;
  reorderLevel: string;
  status: ItemStatus;
  location: string;
  supplier: string;
};

const createItemDraft = (row?: ItemRow): ItemDraft => ({
  sku: row?.sku ?? "",
  name: row?.name ?? "",
  category: row?.category ?? "Raw Material",
  unit: row?.unit ?? "pcs",
  stock: String(row?.stock ?? 0),
  reserved: String(row?.reserved ?? 0),
  reorderLevel: String(row?.reorderLevel ?? 0),
  status: row?.status ?? "Active",
  location: row?.location ?? "A-01-03",
  supplier: row?.supplier ?? "NorthPeak Metals",
});

export function Items({ items: initialItems }: { items: ItemRow[] }) {
  const [rows, setRows] = React.useState<ItemRow[]>(initialItems);
  const [rowSelection, setRowSelection] = React.useState({});
  const [sorting, setSorting] = React.useState<SortingState>([{ id: "updatedAt", desc: true }]);
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([]);
  const [columnVisibility, setColumnVisibility] = React.useState<ColumnVisibilityState>({
    search: false,
    category: false,
  });

  const [pagination, setPagination] = React.useState<PaginationState>({
    pageIndex: 0,
    pageSize: 10,
  });
  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [editingSku, setEditingSku] = React.useState<string | null>(null);
  const [draft, setDraft] = React.useState<ItemDraft>(createItemDraft());

  const table = useTable({
    features: dataTableFeatures,
    data: rows,
    columns: itemsColumns(openEditDialog),
    state: {
      rowSelection,
      sorting,
      columnFilters,
      columnVisibility,
      pagination,
    },
    getRowId: (row) => row.sku,
    autoResetPageIndex: false,
    enableRowSelection: true,
    onRowSelectionChange: setRowSelection,
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onColumnVisibilityChange: setColumnVisibility,
    onPaginationChange: setPagination,
  });

  const searchQuery = (table.getColumn("search")?.getFilterValue() as string | undefined) ?? "";
  const categoryFilter =
    (table.getColumn("category")?.getFilterValue() as string | undefined) ?? itemFilters.category[0];
  const statusFilter = (table.getColumn("status")?.getFilterValue() as string | undefined) ?? itemFilters.status[0];
  const locationFilter =
    (table.getColumn("location")?.getFilterValue() as string | undefined) ?? itemFilters.location[0];
  const supplierFilter =
    (table.getColumn("supplier")?.getFilterValue() as string | undefined) ?? itemFilters.supplier[0];
  const selectedCount = table.getFilteredSelectedRowModel().rows.length;

  function setColumnSelectFilter(columnId: string, value: string) {
    table.getColumn(columnId)?.setFilterValue(value === "All" ? undefined : value);
    table.setPageIndex(0);
  }

  function openAddDialog() {
    setEditingSku(null);
    setDraft(createItemDraft());
    setDialogOpen(true);
  }

  function openEditDialog(row: ItemRow) {
    setEditingSku(row.sku);
    setDraft(createItemDraft(row));
    setDialogOpen(true);
  }

  function handleSave() {
    const safeSku = draft.sku.trim() || `ITEM-${Date.now().toString(36).toUpperCase()}`;
    const nextItem: ItemRow = {
      sku: safeSku,
      name: draft.name.trim() || "Untitled item",
      category: draft.category,
      unit: draft.unit.trim() || "pcs",
      stock: Number.parseInt(draft.stock, 10) || 0,
      reserved: Number.parseInt(draft.reserved, 10) || 0,
      reorderLevel: Number.parseInt(draft.reorderLevel, 10) || 0,
      status: draft.status,
      location: draft.location.trim() || "A-01-03",
      supplier: draft.supplier.trim() || "NorthPeak Metals",
      updatedAt: new Date().toISOString(),
    };

    if (editingSku) {
      setRows((current) => current.map((row) => (row.sku === editingSku ? nextItem : row)));
    } else {
      setRows((current) => [nextItem, ...current]);
    }

    setDialogOpen(false);
    setEditingSku(null);
    setDraft(createItemDraft());
  }

  return (
    <>
      <Card>
        <CardHeader className="border-b has-data-[slot=card-action]:grid-cols-1 md:has-data-[slot=card-action]:grid-cols-[1fr_auto]">
          <CardTitle className="text-xl leading-none">Items</CardTitle>
          <CardDescription className="max-w-sm leading-snug">
            Track stock movements, item health, and supplier coverage across the warehouse.
          </CardDescription>
          <CardAction className="col-start-1 row-start-auto flex w-full flex-wrap justify-start gap-2 justify-self-stretch md:col-start-2 md:row-span-2 md:row-start-1 md:w-auto md:flex-nowrap md:justify-end md:justify-self-end">
            <InputGroup className="h-7 w-full md:w-64">
              <InputGroupAddon align="inline-start">
                <Search className="size-3.5" />
              </InputGroupAddon>
              <InputGroupInput
                className="h-7"
                placeholder="Search items..."
                value={searchQuery}
                onChange={(event) => {
                  table.getColumn("search")?.setFilterValue(event.target.value || undefined);
                  table.setPageIndex(0);
                }}
              />
              <InputGroupAddon align="inline-end">
                <Kbd className="h-4 text-[10px]">⌘K</Kbd>
              </InputGroupAddon>
            </InputGroup>
            <Button variant="outline" size="sm">
              <SlidersHorizontal /> Hide
            </Button>
            <Button variant="outline" size="sm">
              <Cog /> Customize
            </Button>
            <Button variant="outline" size="sm">
              <Download /> Export
            </Button>
            <Button size="sm" onClick={openAddDialog}>
              <Plus /> Add item
            </Button>
          </CardAction>
        </CardHeader>
        <CardContent className="flex flex-col gap-4 px-0">
          <div className="flex flex-wrap items-center justify-between gap-3 px-4">
            <div className="flex flex-wrap items-center gap-3">
              <Select value={categoryFilter} onValueChange={(value) => setColumnSelectFilter("category", value)}>
                <SelectTrigger size="sm">
                  <span className="text-muted-foreground">Category:</span>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent position="popper" align="start">
                  <SelectGroup>
                    {itemFilters.category.map((option) => (
                      <SelectItem key={option} value={option}>
                        {option}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>

              <Select value={statusFilter} onValueChange={(value) => setColumnSelectFilter("status", value)}>
                <SelectTrigger size="sm">
                  <span className="text-muted-foreground">Status:</span>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent position="popper" align="start">
                  <SelectGroup>
                    {itemFilters.status.map((option) => (
                      <SelectItem key={option} value={option}>
                        {option}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>

              <Select value={locationFilter} onValueChange={(value) => setColumnSelectFilter("location", value)}>
                <SelectTrigger size="sm">
                  <span className="text-muted-foreground">Location:</span>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent position="popper" align="start">
                  <SelectGroup>
                    {itemFilters.location.map((option) => (
                      <SelectItem key={option} value={option}>
                        {option}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>
            </div>

            <Select value={supplierFilter} onValueChange={(value) => setColumnSelectFilter("supplier", value)}>
              <SelectTrigger size="sm">
                <span className="text-muted-foreground">Supplier:</span>
                <SelectValue />
              </SelectTrigger>
              <SelectContent position="popper" align="end">
                <SelectGroup>
                  {itemFilters.supplier.map((option) => (
                    <SelectItem key={option} value={option}>
                      {option}
                    </SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center justify-between gap-3 px-4">
            <div className="text-muted-foreground text-sm tabular-nums">{selectedCount} selected</div>

            <Tabs defaultValue="list">
              <TabsList>
                <TabsTrigger value="list" aria-label="List view">
                  <Rows3 />
                </TabsTrigger>
                <TabsTrigger value="grid" aria-label="Grid view">
                  <Grid />
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </div>

          <ItemsTable table={table} />
        </CardContent>
      </Card>

      <WarehouseDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        title={editingSku ? "Edit item" : "Add new item"}
        description={
          editingSku
            ? "Update the stock record and item metadata."
            : "Create a warehouse item and assign it to the current stock profile."
        }
        submitLabel={editingSku ? "Save changes" : "Create item"}
        onSubmit={handleSave}
      >
        <div className="grid gap-4 py-2">
          <div className="grid gap-2">
            <Label htmlFor="item-sku">SKU</Label>
            <Input
              id="item-sku"
              value={draft.sku}
              onChange={(event) => setDraft((current) => ({ ...current, sku: event.target.value }))}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="item-name">Name</Label>
            <Input
              id="item-name"
              value={draft.name}
              onChange={(event) => setDraft((current) => ({ ...current, name: event.target.value }))}
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="grid gap-2">
              <Label>Category</Label>
              <Select
                value={draft.category}
                onValueChange={(value) => setDraft((current) => ({ ...current, category: value as ItemCategory }))}
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    {itemCategoryValues.map((value) => (
                      <SelectItem key={value} value={value}>
                        {value}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label>Status</Label>
              <Select
                value={draft.status}
                onValueChange={(value) => setDraft((current) => ({ ...current, status: value as ItemStatus }))}
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    {itemFilters.status
                      .filter((option) => option !== "All")
                      .map((value) => (
                        <SelectItem key={value} value={value}>
                          {value}
                        </SelectItem>
                      ))}
                  </SelectGroup>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="grid gap-2">
              <Label htmlFor="item-stock">Stock</Label>
              <Input
                id="item-stock"
                type="number"
                value={draft.stock}
                onChange={(event) => setDraft((current) => ({ ...current, stock: event.target.value }))}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="item-reserved">Reserved</Label>
              <Input
                id="item-reserved"
                type="number"
                value={draft.reserved}
                onChange={(event) => setDraft((current) => ({ ...current, reserved: event.target.value }))}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="item-reorder">Reorder</Label>
              <Input
                id="item-reorder"
                type="number"
                value={draft.reorderLevel}
                onChange={(event) => setDraft((current) => ({ ...current, reorderLevel: event.target.value }))}
              />
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="grid gap-2">
              <Label htmlFor="item-location">Location</Label>
              <Input
                id="item-location"
                value={draft.location}
                onChange={(event) => setDraft((current) => ({ ...current, location: event.target.value }))}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="item-unit">Unit</Label>
              <Input
                id="item-unit"
                value={draft.unit}
                onChange={(event) => setDraft((current) => ({ ...current, unit: event.target.value }))}
              />
            </div>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="item-supplier">Supplier</Label>
            <Input
              id="item-supplier"
              value={draft.supplier}
              onChange={(event) => setDraft((current) => ({ ...current, supplier: event.target.value }))}
            />
          </div>
        </div>
      </WarehouseDialog>
    </>
  );
}
