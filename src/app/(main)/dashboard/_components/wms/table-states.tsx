"use client";

import { Skeleton } from "@/components/ui/skeleton";
import { TableCell, TableRow } from "@/components/ui/table";
import { useT } from "@/lib/i18n/provider";

/** Placeholder rows while a table loads */
export function LoadingRows({ columns, rows = 5 }: { columns: number; rows?: number }) {
  return Array.from({ length: rows }, (_, row) => (
    // biome-ignore lint/suspicious/noArrayIndexKey: static placeholder rows
    <TableRow key={row}>
      {Array.from({ length: columns }, (_, col) => (
        // biome-ignore lint/suspicious/noArrayIndexKey: static placeholder cells
        <TableCell key={col}>
          <Skeleton className="h-4 w-full" />
        </TableCell>
      ))}
    </TableRow>
  ));
}

export function EmptyRow({ columns, text }: { columns: number; text?: string }) {
  const t = useT();
  return (
    <TableRow>
      <TableCell colSpan={columns} className="text-muted-foreground h-24 text-center">
        {text ?? t("No data.")}
      </TableCell>
    </TableRow>
  );
}
