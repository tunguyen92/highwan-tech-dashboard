"use client";

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

export const successBadgeClassName = "border-status-success-border bg-status-success text-status-success-foreground";
const amberBadgeClassName = "border-status-warning-border bg-status-warning text-status-warning-foreground";
const itemTypeBadgeClassName: Record<ItemType, string> = {
  MATERIAL: "border-status-info-border bg-status-info text-status-info-foreground",
  SEMI: amberBadgeClassName,
  PRODUCT: successBadgeClassName,
};

export function VoucherStatusBadge({ status }: { status: VoucherStatus }) {
  const t = useT();
  if (status === "CANCELLED") return <Badge variant="destructive">{t(VOUCHER_STATUS_LABEL[status])}</Badge>;
  if (status === "CONFIRMED")
    return (
      <Badge variant="outline" className={successBadgeClassName}>
        {t(VOUCHER_STATUS_LABEL[status])}
      </Badge>
    );
  return <Badge variant="secondary">{t(VOUCHER_STATUS_LABEL[status])}</Badge>;
}

export function BomStatusBadge({ status }: { status: BomStatus }) {
  const t = useT();
  if (status === "ACTIVE")
    return (
      <Badge variant="outline" className={successBadgeClassName}>
        {t(BOM_STATUS_LABEL[status])}
      </Badge>
    );
  return <Badge variant={status === "DRAFT" ? "secondary" : "outline"}>{t(BOM_STATUS_LABEL[status])}</Badge>;
}

export function ItemTypeBadge({ type }: { type: ItemType }) {
  const t = useT();
  return (
    <Badge variant="outline" className={itemTypeBadgeClassName[type]}>
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
      <Badge variant="outline" className={amberBadgeClassName}>
        {t(RECON_LABEL[status])}
      </Badge>
    );
  return (
    <Badge variant="outline" className={successBadgeClassName}>
      {t(RECON_LABEL[status])}
    </Badge>
  );
}
