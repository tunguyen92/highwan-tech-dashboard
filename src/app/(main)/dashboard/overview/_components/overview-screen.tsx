"use client";

import { RefreshCw } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useT } from "@/lib/i18n/provider";
import { unwrapAs } from "@/lib/wms/action-client";
import type { OverviewDTO } from "@/lib/wms/types";
import { useLoad } from "@/lib/wms/use-load";
import { overviewAction } from "@/server/actions/reports";

import { ActivityChart } from "./activity-chart";
import { KpiStrip } from "./kpi-strip";
import { LowStockCard } from "./low-stock-card";
import { RecentVouchersCard } from "./recent-vouchers-card";
import { ReconIssuesCard } from "./recon-issues-card";

export function OverviewScreen() {
  const t = useT();
  const { data, loading, reload } = useLoad(() => unwrapAs<OverviewDTO>(overviewAction()), []);

  return (
    <div className="@container/main flex flex-col gap-4 md:gap-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="text-xl leading-none font-semibold">{t("Warehouse overview")}</h1>
          <p className="text-muted-foreground mt-1.5 text-sm">
            {t("What needs attention today, and how the warehouse is moving this month.")}
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={reload} disabled={loading}>
          <RefreshCw className={loading ? "animate-spin" : undefined} /> {t("Refresh")}
        </Button>
      </div>

      {data ? (
        <>
          <KpiStrip data={data} />
          <div className="grid gap-4 md:gap-6 xl:grid-cols-3">
            <div className="xl:col-span-2">
              <ActivityChart data={data.activity} />
            </div>
            <LowStockCard rows={data.lowStock} total={data.kpis.belowMinimum} />
          </div>
          <div className="grid gap-4 md:gap-6 xl:grid-cols-2">
            <RecentVouchersCard rows={data.recentVouchers} />
            <ReconIssuesCard rows={data.reconIssues} period={data.period} skipped={data.kpis.reconSkipped} />
          </div>
        </>
      ) : (
        <OverviewPlaceholder failed={!loading} onRetry={reload} />
      )}
    </div>
  );
}

function OverviewPlaceholder({ failed, onRetry }: { failed: boolean; onRetry: () => void }) {
  const t = useT();
  if (failed) {
    return (
      <div className="text-muted-foreground flex h-48 flex-col items-center justify-center gap-3 rounded-xl border text-sm">
        {t("Could not load the overview.")}
        <Button variant="outline" size="sm" onClick={onRetry}>
          {t("Try again")}
        </Button>
      </div>
    );
  }
  return (
    <>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {Array.from({ length: 6 }, (_, i) => (
          // biome-ignore lint/suspicious/noArrayIndexKey: static placeholders
          <Skeleton key={i} className="h-28 rounded-xl" />
        ))}
      </div>
      <Skeleton className="h-72 rounded-xl" />
    </>
  );
}
