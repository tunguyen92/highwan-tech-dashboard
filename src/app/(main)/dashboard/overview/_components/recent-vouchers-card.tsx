"use client";

import Link from "next/link";

import { ArrowDownToLine, ArrowUpFromLine } from "lucide-react";

import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useT } from "@/lib/i18n/provider";
import { VOUCHER_TYPE_LABEL } from "@/lib/wms/constants";
import { formatDate } from "@/lib/wms/format";
import type { OverviewDTO } from "@/lib/wms/types";

import { VoucherStatusBadge } from "../../_components/wms/status-badges";

const linkClass = "text-sm underline-offset-4 hover:underline";

export function RecentVouchersCard({ rows }: { rows: OverviewDTO["recentVouchers"] }) {
  const t = useT();
  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle>{t("Recent vouchers")}</CardTitle>
        <CardDescription>{t("Latest changes across receipts and issues")}</CardDescription>
        <CardAction>
          <Link href="/dashboard/vouchers/import" prefetch={false} className={linkClass}>
            {t("Receipts")}
          </Link>
          <span className="text-muted-foreground px-1.5">·</span>
          <Link href="/dashboard/vouchers/export" prefetch={false} className={linkClass}>
            {t("Issues")}
          </Link>
        </CardAction>
      </CardHeader>
      <CardContent>
        {rows.length === 0 ? (
          <p className="text-muted-foreground py-10 text-center text-sm">{t("No vouchers yet.")}</p>
        ) : (
          <ul className="divide-y">
            {rows.map((v) => (
              <li key={v._id} className="flex items-center gap-3 py-2 text-sm">
                {v.direction === "IN" ? (
                  <ArrowDownToLine className="text-muted-foreground size-4 shrink-0" aria-hidden />
                ) : (
                  <ArrowUpFromLine className="text-muted-foreground size-4 shrink-0" aria-hidden />
                )}
                <div className="min-w-0 flex-1">
                  <div className="truncate font-medium">{v.voucherNo ?? t("Draft")}</div>
                  <div className="text-muted-foreground truncate text-xs">
                    {t(VOUCHER_TYPE_LABEL[v.type])} · {v.lineCount} {t("lines")} · {formatDate(v.voucherDate)}
                  </div>
                </div>
                <VoucherStatusBadge status={v.status} />
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
