"use client";

import Link from "next/link";

import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useT } from "@/lib/i18n/provider";
import { formatQty } from "@/lib/wms/format";
import type { OverviewDTO } from "@/lib/wms/types";

import { ReconStatusBadge } from "../../_components/wms/status-badges";

export function ReconIssuesCard({
  rows,
  period,
  skipped,
}: {
  rows: OverviewDTO["reconIssues"];
  period: string;
  skipped: number;
}) {
  const t = useT();
  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle>{t("BOM reconciliation exceptions")}</CardTitle>
        <CardDescription>
          {t("Materials issued above norm in")} {period}
        </CardDescription>
        <CardAction>
          <Link
            href="/dashboard/reports/reconciliation"
            prefetch={false}
            className="text-sm underline-offset-4 hover:underline"
          >
            {t("Open report")}
          </Link>
        </CardAction>
      </CardHeader>
      <CardContent>
        {rows.length === 0 ? (
          <p className="text-muted-foreground py-10 text-center text-sm">
            {t("No material is over its norm this month.")}
          </p>
        ) : (
          <ul className="divide-y">
            {rows.map((r) => (
              <li key={r.itemId} className="flex items-center justify-between gap-3 py-2 text-sm">
                <div className="min-w-0">
                  <div className="truncate font-medium">{r.code}</div>
                  <div className="text-muted-foreground truncate text-xs">
                    {t("Norm")} {formatQty(r.norm)} · {t("Actual")} {formatQty(r.actual)} {r.unit}
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  {r.diffPercent !== null ? (
                    <span className="text-destructive text-xs tabular-nums">+{r.diffPercent}%</span>
                  ) : null}
                  <ReconStatusBadge status={r.status} />
                </div>
              </li>
            ))}
          </ul>
        )}
        {skipped > 0 ? (
          <p className="text-muted-foreground mt-3 text-xs">
            {skipped} {t("finished products were skipped because they have no active BOM.")}
          </p>
        ) : null}
      </CardContent>
    </Card>
  );
}
