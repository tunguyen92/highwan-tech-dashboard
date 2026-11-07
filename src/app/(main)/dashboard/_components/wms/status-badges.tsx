"use client";

import { cn } from "cn";

import { Badge } from "@/components/ui/badge";
import { useT } from "@/lib/i18n/provider";
import {
  BOM_STATUS_LABEL,
  type BomStatus,
  ITEM_TYPE_LABEL,
  type ItemType,
  VOUCHER_STATUS_LABEL,
  type VoucherStatus,
} from "@/lib/wms/constants";
import type { ReconStatus } from "@/lib/wms/types";

const green =
  "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-500/20 dark:bg-emerald-500/15 dark:text-emerald-300";
const amber =
  "border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-500/20 dark:bg-amber-500/15 dark:text-amber-300";

export function VoucherStatusBadge({ status }: { status: VoucherStatus }) {
  const t = useT();
  if (status === "CANCELLED") return <Badge variant="destructive">{t(VOUCHER_STATUS_LABEL[status])}</Badge>;
  if (status === "CONFIRMED")
    return (
      <Badge variant="outline" className={green}>
        {t(VOUCHER_STATUS_LABEL[status])}
      </Badge>
    );
  return <Badge variant="secondary">{t(VOUCHER_STATUS_LABEL[status])}</Badge>;
}

export function BomStatusBadge({ status }: { status: BomStatus }) {
  const t = useT();
  if (status === "ACTIVE")
    return (
      <Badge variant="outline" className={green}>
        {t(BOM_STATUS_LABEL[status])}
      </Badge>
    );
  return <Badge variant={status === "DRAFT" ? "secondary" : "outline"}>{t(BOM_STATUS_LABEL[status])}</Badge>;
}

export function ItemTypeBadge({ type }: { type: ItemType }) {
  const t = useT();
  return (
    <Badge variant="outline" className={cn(type === "SEMI" && amber)}>
      {t(ITEM_TYPE_LABEL[type])}
    </Badge>
  );
}

const RECON_LABEL: Record<ReconStatus, string> = {
  OVER: "Over norm",
  NO_NORM: "No BOM",
  UNDER: "Issued less than norm",
  OK: "Normal",
};

export function ReconStatusBadge({ status }: { status: ReconStatus }) {
  const t = useT();
  if (status === "OVER" || status === "NO_NORM") return <Badge variant="destructive">{t(RECON_LABEL[status])}</Badge>;
  if (status === "UNDER")
    return (
      <Badge variant="outline" className={amber}>
        {t(RECON_LABEL[status])}
      </Badge>
    );
  return (
    <Badge variant="outline" className={green}>
      {t(RECON_LABEL[status])}
    </Badge>
  );
}
