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
import { type PartnerRow, type PartnerStatus, type PartnerType, partnerFilters } from "./data";
import { partnersColumns } from "./partners-columns";
import { PartnersTable } from "./partners-table";

type PartnerDraft = {
  code: string;
  name: string;
  type: PartnerType;
  contact: string;
  email: string;
  phone: string;
  status: PartnerStatus;
  country: string;
};

const createPartnerDraft = (row?: PartnerRow): PartnerDraft => ({
  code: row?.code ?? "",
  name: row?.name ?? "",
  type: row?.type ?? "Supplier",
  contact: row?.contact ?? "",
  email: row?.email ?? "",
  phone: row?.phone ?? "",
  status: row?.status ?? "Active",
  country: row?.country ?? "United States",
});

export function Partners({ partners: initialPartners }: { partners: PartnerRow[] }) {
  const [rows, setRows] = React.useState<PartnerRow[]>(initialPartners);
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
  const [draft, setDraft] = React.useState<PartnerDraft>(createPartnerDraft());

  const table = useTable({
    features: dataTableFeatures,
    data: rows,
    columns: partnersColumns(openEditDialog),
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
  const typeFilter = (table.getColumn("type")?.getFilterValue() as string | undefined) ?? partnerFilters.type[0];
  const statusFilter = (table.getColumn("status")?.getFilterValue() as string | undefined) ?? partnerFilters.status[0];
  const countryFilter =
    (table.getColumn("country")?.getFilterValue() as string | undefined) ?? partnerFilters.country[0];
  const selectedCount = table.getFilteredSelectedRowModel().rows.length;

  function setColumnSelectFilter(columnId: string, value: string) {
    table.getColumn(columnId)?.setFilterValue(value === "All" ? undefined : value);
    table.setPageIndex(0);
  }

  function openAddDialog() {
    setEditingCode(null);
    setDraft(createPartnerDraft());
    setDialogOpen(true);
  }

  function openEditDialog(row: PartnerRow) {
    setEditingCode(row.code);
    setDraft(createPartnerDraft(row));
    setDialogOpen(true);
  }

  function handleSave() {
    const nextRow: PartnerRow = {
      code: draft.code.trim() || `PART-${Date.now().toString(36).toUpperCase()}`,
      name: draft.name.trim() || "Untitled partner",
      type: draft.type,
      contact: draft.contact.trim() || "Unassigned contact",
      email: draft.email.trim() || "noreply@example.com",
      phone: draft.phone.trim() || "",
      status: draft.status,
      country: draft.country.trim() || "United States",
      updatedAt: new Date().toISOString(),
    };

    if (editingCode) {
      setRows((current) => current.map((row) => (row.code === editingCode ? nextRow : row)));
    } else {
      setRows((current) => [nextRow, ...current]);
    }

    setDialogOpen(false);
    setEditingCode(null);
    setDraft(createPartnerDraft());
  }

  return (
    <>
      <Card>
        <CardHeader className="border-b has-data-[slot=card-action]:grid-cols-1 md:has-data-[slot=card-action]:grid-cols-[1fr_auto]">
          <CardTitle className="text-xl leading-none">Partners</CardTitle>
          <CardDescription className="max-w-sm leading-snug">
            Manage your suppliers, customers, and logistics partners across the supply chain.
          </CardDescription>
          <CardAction className="col-start-1 row-start-auto flex w-full flex-wrap justify-start gap-2 justify-self-stretch md:col-start-2 md:row-span-2 md:row-start-1 md:w-auto md:flex-nowrap md:justify-end md:justify-self-end">
            <InputGroup className="h-7 w-full md:w-64">
              <InputGroupAddon align="inline-start">
                <Search className="size-3.5" />
              </InputGroupAddon>
              <InputGroupInput
                className="h-7"
                placeholder="Search partners..."
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
              <Plus /> Add partner
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
                    {partnerFilters.type.map((option) => (
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
                    {partnerFilters.status.map((option) => (
                      <SelectItem key={option} value={option}>
                        {option}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>
            </div>

            <Select value={countryFilter} onValueChange={(value) => setColumnSelectFilter("country", value)}>
              <SelectTrigger size="sm">
                <span className="text-muted-foreground">Country:</span>
                <SelectValue />
              </SelectTrigger>
              <SelectContent position="popper" align="end">
                <SelectGroup>
                  {partnerFilters.country.map((option) => (
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

          <PartnersTable table={table} />
        </CardContent>
      </Card>

      <WarehouseDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        title={editingCode ? "Edit partner" : "Add new partner"}
        description={
          editingCode
            ? "Update the partnership details and operating status."
            : "Create a new supplier or business relationship in the warehouse network."
        }
        submitLabel={editingCode ? "Save changes" : "Create partner"}
        onSubmit={handleSave}
      >
        <div className="grid gap-4 py-2">
          <div className="grid gap-2">
            <Label htmlFor="partner-code">Code</Label>
            <Input
              id="partner-code"
              value={draft.code}
              onChange={(event) => setDraft((current) => ({ ...current, code: event.target.value }))}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="partner-name">Name</Label>
            <Input
              id="partner-name"
              value={draft.name}
              onChange={(event) => setDraft((current) => ({ ...current, name: event.target.value }))}
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="grid gap-2">
              <Label>Type</Label>
              <Select
                value={draft.type}
                onValueChange={(value) => setDraft((current) => ({ ...current, type: value as PartnerType }))}
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    {partnerFilters.type
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
                onValueChange={(value) => setDraft((current) => ({ ...current, status: value as PartnerStatus }))}
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    {partnerFilters.status
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
              <Label htmlFor="partner-contact">Contact</Label>
              <Input
                id="partner-contact"
                value={draft.contact}
                onChange={(event) => setDraft((current) => ({ ...current, contact: event.target.value }))}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="partner-country">Country</Label>
              <Input
                id="partner-country"
                value={draft.country}
                onChange={(event) => setDraft((current) => ({ ...current, country: event.target.value }))}
              />
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="grid gap-2">
              <Label htmlFor="partner-email">Email</Label>
              <Input
                id="partner-email"
                type="email"
                value={draft.email}
                onChange={(event) => setDraft((current) => ({ ...current, email: event.target.value }))}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="partner-phone">Phone</Label>
              <Input
                id="partner-phone"
                value={draft.phone}
                onChange={(event) => setDraft((current) => ({ ...current, phone: event.target.value }))}
              />
            </div>
          </div>
        </div>
      </WarehouseDialog>
    </>
  );
}
