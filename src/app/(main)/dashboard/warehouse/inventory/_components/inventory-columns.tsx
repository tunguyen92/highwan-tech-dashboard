"use client";
import type { ColumnDef } from "@tanstack/react-table";
import { Subscribe } from "@tanstack/react-table";
import { MoreHorizontal } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { DataTableFeatures } from "@/lib/data-table-features";
import { cn } from "@/lib/utils";

import { type InventoryRow, statusMeta } from "./data";

function StatusBadge({ status }: { status: InventoryRow["status"] }) {
  const meta = statusMeta[status];

  return (
    <Badge className={cn("gap-1.5 border px-2 py-1 font-medium", meta.badgeClass)} variant="outline">
      <span className={cn("size-1.5 rounded-full", meta.dotClass)} />
      {status}
    </Badge>
  );
}

function formatUpdatedAt(value: string) {
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(value));
}

export const inventoryColumns: ColumnDef<DataTableFeatures, InventoryRow>[] = [
  {
    id: "select",
    header: ({ table }) => (
      <div className="flex items-center justify-center">
        <Subscribe
          source={table.atoms.rowSelection}
          selector={() =>
            table.getIsAllPageRowsSelected() ||
            (table.getIsSomePageRowsSelected() && !table.getIsAllPageRowsSelected() && "indeterminate")
          }
        >
          {(checked) => (
            <Checkbox
              aria-label="Select all inventory rows"
              checked={checked}
              onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
            />
          )}
        </Subscribe>
      </div>
    ),
    cell: ({ row }) => (
      <div className="flex items-center justify-center">
        <Subscribe source={row.table.atoms.rowSelection} selector={(selection) => Boolean(selection?.[row.id])}>
          {(checked) => (
            <Checkbox
              aria-label={`Select ${row.original.itemName}`}
              checked={checked}
              onCheckedChange={(value) => row.toggleSelected(!!value)}
            />
          )}
        </Subscribe>
      </div>
    ),
    enableHiding: false,
    enableSorting: false,
  },
  {
    id: "search",
    accessorFn: (row) => `${row.itemName} ${row.sku} ${row.warehouse} ${row.bin}`,
    filterFn: "includesString",
    enableHiding: true,
  },
  {
    accessorKey: "itemName",
    header: "Item",
    cell: ({ row }) => (
      <div className="min-w-0">
        <div className="truncate font-medium text-foreground text-sm">{row.original.itemName}</div>
        <div className="truncate text-muted-foreground text-sm">{row.original.sku}</div>
      </div>
    ),
  },
  {
    accessorKey: "warehouse",
    header: "Warehouse",
    filterFn: "equalsString",
    cell: ({ row }) => <div className="text-sm">{row.original.warehouse}</div>,
  },
  {
    accessorKey: "bin",
    header: "Bin",
    cell: ({ row }) => <div className="text-sm">{row.original.bin}</div>,
  },
  {
    accessorKey: "onHand",
    header: "On hand",
    cell: ({ row }) => <div className="font-medium text-foreground text-sm">{row.original.onHand}</div>,
  },
  {
    accessorKey: "reserved",
    header: "Reserved",
    cell: ({ row }) => <div className="text-sm">{row.original.reserved}</div>,
  },
  {
    accessorKey: "available",
    header: "Available",
    cell: ({ row }) => <div className="text-sm">{row.original.available}</div>,
  },
  {
    accessorKey: "status",
    header: "Status",
    filterFn: "equalsString",
    cell: ({ row }) => <StatusBadge status={row.original.status} />,
  },
  {
    id: "updatedAt",
    accessorFn: (row) => new Date(row.updatedAt).getTime(),
    header: "Last counted",
    cell: ({ row }) => <div className="text-foreground text-sm">{formatUpdatedAt(row.original.updatedAt)}</div>,
  },
  {
    id: "actions",
    header: () => <div className="text-right">Actions</div>,
    cell: ({ row }) => (
      <div className="text-right">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              aria-label={`Open actions for ${row.original.itemName}`}
              className="size-8 rounded-md text-muted-foreground hover:bg-muted/50"
              size="icon-sm"
              variant="ghost"
            >
              <MoreHorizontal className="size-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem>View stock</DropdownMenuItem>
            <DropdownMenuItem>Adjust inventory</DropdownMenuItem>
            <DropdownMenuItem>Count sheet</DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem variant="destructive">Freeze bin</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    ),
    enableHiding: false,
    enableSorting: false,
  },
];
