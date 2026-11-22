"use client";

import type { ReactNode } from "react";

import Link from "next/link";

import { cn } from "cn";
import { AlertTriangle, ArrowDownToLine, ArrowUpFromLine, FileEdit, Scale, Undo2 } from "lucide-react";

import { Card, CardAction, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useT } from "@/lib/i18n/provider";
import type { OverviewDTO } from "@/lib/wms/types";

function KpiCard({
  title,
  value,
  icon,
  alert = false,
  href,
  footer,
}: {
  title: string;
  value: number;
  icon: ReactNode;
  /** Shows the number in the destructive color while it is above zero */
  alert?: boolean;
  href: string;
  footer: ReactNode;
}) {
  return (
    <Link href={href} prefetch={false} className="focus-visible:ring-ring rounded-xl outline-none focus-visible:ring-2">
      <Card className="hover:bg-muted/40 h-full transition-colors">
        <CardHeader>
          <CardTitle className="text-sm font-normal">{title}</CardTitle>
          <CardDescription
            className={cn(
              "text-3xl leading-none font-semibold tracking-tight tabular-nums",
              alert && value > 0 ? "text-destructive" : "text-foreground",
            )}
          >
            {value.toLocaleString()}
          </CardDescription>
          <CardAction className="bg-muted grid size-6 place-items-center rounded-sm [&_svg]:size-3">{icon}</CardAction>
        </CardHeader>
        <div className="text-muted-foreground px-4 pb-4 text-sm">{footer}</div>
      </Card>
    </Link>
  );
}

/** Month-over-month change. 'badWhenUp' marks an increase as bad (e.g. cancellations). */
function Delta({ current, previous, badWhenUp = false }: { current: number; previous: number; badWhenUp?: boolean }) {
  const t = useT();
  const diff = current - previous;
  if (diff === 0) return <>{t("Same as last month")}</>;
  const bad = badWhenUp && diff > 0;
  return (
    <>
      <span className={cn("tabular-nums", bad && "text-destructive")}>{`${diff > 0 ? "+" : ""}${diff}`}</span>{" "}
      {t("vs last month")}
    </>
  );
}

export function KpiStrip({ data }: { data: OverviewDTO }) {
  const t = useT();
  const k = data.kpis;
  const reconProblems = k.reconOver + k.reconNoNorm;

  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
      <KpiCard
        title={t("Items below minimum")}
        value={k.belowMinimum}
        alert
        icon={<AlertTriangle />}
        href="/dashboard/stock"
        footer={`${k.outOfStock} ${t("out of stock")} · ${k.stockedItems} ${t("stocked items")}`}
      />
      <KpiCard
        title={t("Drafts awaiting confirmation")}
        value={k.draftReceipts + k.draftIssues}
        icon={<FileEdit />}
        href="/dashboard/vouchers/import"
        footer={`${k.draftReceipts} ${t("receipts")} · ${k.draftIssues} ${t("issues")}`}
      />
      <KpiCard
        title={t("Over-norm materials this month")}
        value={reconProblems}
        alert
        icon={<Scale />}
        href="/dashboard/reports/reconciliation"
        footer={
          `${k.reconOver} ${t("over norm")} · ${k.reconNoNorm} ${t("without norm")}` +
          (k.reconSkipped > 0 ? ` · ${k.reconSkipped} ${t("products without BOM")}` : "")
        }
      />
      <KpiCard
        title={t("Receipts this month")}
        value={k.receipts.current}
        icon={<ArrowDownToLine />}
        href="/dashboard/vouchers/import"
        footer={<Delta current={k.receipts.current} previous={k.receipts.previous} />}
      />
      <KpiCard
        title={t("Issues this month")}
        value={k.issues.current}
        icon={<ArrowUpFromLine />}
        href="/dashboard/vouchers/export"
        footer={<Delta current={k.issues.current} previous={k.issues.previous} />}
      />
      <KpiCard
        title={t("Cancelled vouchers this month")}
        value={k.cancelled.current}
        alert
        icon={<Undo2 />}
        href="/dashboard/vouchers/import"
        footer={<Delta current={k.cancelled.current} previous={k.cancelled.previous} badWhenUp />}
      />
    </div>
  );
}
