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
import { categoriesColumns } from "./categories-columns";
import { CategoriesTable } from "./categories-table";
import { type CategoryRow, type CategoryStatus, type CategoryType, categoryFilters } from "./data";

type CategoryDraft = {
  code: string;
  name: string;
  type: CategoryType;
  parent: string;
  itemCount: string;
  status: CategoryStatus;
};

const createCategoryDraft = (row?: CategoryRow): CategoryDraft => ({
  code: row?.code ?? "",
  name: row?.name ?? "",
  type: row?.type ?? "Raw Material",
  parent: row?.parent ?? "Root",
  itemCount: String(row?.itemCount ?? 0),
  status: row?.status ?? "Active",
});

export function Categories({ categories: initialCategories }: { categories: CategoryRow[] }) {
  const [rows, setRows] = React.useState<CategoryRow[]>(initialCategories);
  const [rowSelection, setRowSelection] = React.useState({});
  const [sorting, setSorting] = React.useState<SortingState>([{ id: "updatedAt", desc: true }]);
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([]);
  const [columnVisibility, setColumnVisibility] = React.useState<ColumnVisibilityState>({
    search: false,
    type: false,
  });
  const [pagination, setPagination] = React.useState<PaginationState>({
    pageIndex: 0,
    pageSize: 10,
  });
  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [editingCode, setEditingCode] = React.useState<string | null>(null);
  const [draft, setDraft] = React.useState<CategoryDraft>(createCategoryDraft());

  const table = useTable({
    features: dataTableFeatures,
    data: rows,
    columns: categoriesColumns(openEditDialog),
    state: {
      rowSelection,
      sorting,
      columnFilters,
      columnVisibility,
      pagination,
    },
    getRowId: (row) => row.code,
    autoResetPageIndex: false,
    enableRowSelection: true,
    onRowSelectionChange: setRowSelection,
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onColumnVisibilityChange: setColumnVisibility,
    onPaginationChange: setPagination,
  });

  const searchQuery = (table.getColumn("search")?.getFilterValue() as string | undefined) ?? "";
  const typeFilter = (table.getColumn("type")?.getFilterValue() as string | undefined) ?? categoryFilters.type[0];
  const statusFilter = (table.getColumn("status")?.getFilterValue() as string | undefined) ?? categoryFilters.status[0];
  const parentFilter = (table.getColumn("parent")?.getFilterValue() as string | undefined) ?? categoryFilters.parent[0];
  const selectedCount = table.getFilteredSelectedRowModel().rows.length;

  function setColumnSelectFilter(columnId: string, value: string) {
    table.getColumn(columnId)?.setFilterValue(value === "All" ? undefined : value);
    table.setPageIndex(0);
  }

  function openAddDialog() {
    setEditingCode(null);
    setDraft(createCategoryDraft());
    setDialogOpen(true);
  }

  function openEditDialog(row: CategoryRow) {
    setEditingCode(row.code);
    setDraft(createCategoryDraft(row));
    setDialogOpen(true);
  }

  function handleSave() {
    const nextRow: CategoryRow = {
      code: draft.code.trim() || `CAT-${Date.now().toString(36).toUpperCase()}`,
      name: draft.name.trim() || "Untitled category",
      type: draft.type,
      parent: draft.parent,
      itemCount: Number.parseInt(draft.itemCount, 10) || 0,
      status: draft.status,
      updatedAt: new Date().toISOString(),
    };

    if (editingCode) {
      setRows((current) => current.map((row) => (row.code === editingCode ? nextRow : row)));
    } else {
      setRows((current) => [nextRow, ...current]);
    }

    setDialogOpen(false);
    setEditingCode(null);
    setDraft(createCategoryDraft());
  }

  return (
    <>
      <Card>
        <CardHeader className="border-b has-data-[slot=card-action]:grid-cols-1 md:has-data-[slot=card-action]:grid-cols-[1fr_auto]">
          <CardTitle className="text-xl leading-none">Categories</CardTitle>
          <CardDescription className="max-w-sm leading-snug">
            Organize products and materials by category hierarchy, type, and warehouse usage.
          </CardDescription>
          <CardAction className="col-start-1 row-start-auto flex w-full flex-wrap justify-start gap-2 justify-self-stretch md:col-start-2 md:row-span-2 md:row-start-1 md:w-auto md:flex-nowrap md:justify-end md:justify-self-end">
            <InputGroup className="h-7 w-full md:w-64">
              <InputGroupAddon align="inline-start">
                <Search className="size-3.5" />
              </InputGroupAddon>
              <InputGroupInput
                className="h-7"
                placeholder="Search categories..."
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
              <Plus /> Add category
            </Button>
          </CardAction>
        </CardHeader>
        <CardContent className="flex flex-col gap-4 px-0">
          <div className="flex flex-wrap items-center justify-between gap-3 px-4">
            <div className="flex flex-wrap items-center gap-3">
              <Select value={typeFilter} onValueChange={(value) => setColumnSelectFilter("type", value)}>
                <SelectTrigger size="sm">
                  <span className="text-muted-foreground">Type:</span>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent position="popper" align="start">
                  <SelectGroup>
                    {categoryFilters.type.map((option) => (
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
                    {categoryFilters.status.map((option) => (
                      <SelectItem key={option} value={option}>
                        {option}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>
            </div>

            <Select value={parentFilter} onValueChange={(value) => setColumnSelectFilter("parent", value)}>
              <SelectTrigger size="sm">
                <span className="text-muted-foreground">Parent:</span>
                <SelectValue />
              </SelectTrigger>
              <SelectContent position="popper" align="end">
                <SelectGroup>
                  {categoryFilters.parent.map((option) => (
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

          <CategoriesTable table={table} />
        </CardContent>
      </Card>

      <WarehouseDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        title={editingCode ? "Edit category" : "Add new category"}
        description={
          editingCode
            ? "Update this warehouse category and hierarchy."
            : "Add a shelf category to organize stock and materials."
        }
        submitLabel={editingCode ? "Save changes" : "Create category"}
        onSubmit={handleSave}
      >
        <div className="grid gap-4 py-2">
          <div className="grid gap-2">
            <Label htmlFor="category-code">Code</Label>
            <Input
              id="category-code"
              value={draft.code}
              onChange={(event) => setDraft((current) => ({ ...current, code: event.target.value }))}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="category-name">Name</Label>
            <Input
              id="category-name"
              value={draft.name}
              onChange={(event) => setDraft((current) => ({ ...current, name: event.target.value }))}
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="grid gap-2">
              <Label>Type</Label>
              <Select
                value={draft.type}
                onValueChange={(value) => setDraft((current) => ({ ...current, type: value as CategoryType }))}
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    {categoryFilters.type
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
            <div className="grid gap-2">
              <Label>Status</Label>
              <Select
                value={draft.status}
                onValueChange={(value) => setDraft((current) => ({ ...current, status: value as CategoryStatus }))}
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    {categoryFilters.status
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
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="grid gap-2">
              <Label>Parent</Label>
              <Select
                value={draft.parent}
                onValueChange={(value) => setDraft((current) => ({ ...current, parent: value }))}
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    {categoryFilters.parent
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
            <div className="grid gap-2">
              <Label htmlFor="category-items">Items</Label>
              <Input
                id="category-items"
                type="number"
                value={draft.itemCount}
                onChange={(event) => setDraft((current) => ({ ...current, itemCount: event.target.value }))}
              />
            </div>
          </div>
        </div>
      </WarehouseDialog>
    </>
  );
}
