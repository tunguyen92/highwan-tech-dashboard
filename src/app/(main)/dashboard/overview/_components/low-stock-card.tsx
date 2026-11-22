"use client";

import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useT } from "@/lib/i18n/provider";
import { formatQty } from "@/lib/wms/format";
import type { OverviewDTO } from "@/lib/wms/types";

export function LowStockCard({ rows, total }: { rows: OverviewDTO["lowStock"]; total: number }) {
  const t = useT();
  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle>{t("Low stock")}</CardTitle>
        <CardDescription>{t("Furthest below the minimum level first")}</CardDescription>
        {total > 0 ? (
          <CardAction>
            <Link href="/dashboard/stock" prefetch={false} className="text-sm underline-offset-4 hover:underline">
              {t("View all")} ({total})
            </Link>
          </CardAction>
        ) : null}
      </CardHeader>
      <CardContent>
        {rows.length === 0 ? (
          <p className="text-muted-foreground py-10 text-center text-sm">
            {t("Every item is at or above its minimum.")}
          </p>
        ) : (
          <ul className="divide-y">
            {rows.map((row) => (
              <li key={row.itemId} className="flex items-center justify-between gap-3 py-2 text-sm">
                <div className="min-w-0">
                  <div className="truncate font-medium">{row.code}</div>
                  <div className="text-muted-foreground truncate text-xs">{row.name}</div>
                </div>
                <Badge variant="destructive" className="shrink-0 tabular-nums">
                  {formatQty(row.onHand)} / {formatQty(row.minStock)} {row.unit}
                </Badge>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
