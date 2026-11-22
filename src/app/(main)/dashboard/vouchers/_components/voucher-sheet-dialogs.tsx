"use client";

import { useT } from "@/lib/i18n/provider";

import { ConfirmDialog, ReasonDialog } from "../../_components/wms/confirm-dialogs";

export type VoucherSheetDialog = "confirm" | "cancel" | "delete" | null;

export function VoucherSheetDialogs({
  direction,
  dialog,
  onOpenChange,
  onConfirm,
  onDelete,
  onCancel,
}: {
  direction: "IN" | "OUT";
  dialog: VoucherSheetDialog;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => Promise<void>;
  onDelete: () => Promise<void>;
  onCancel: (reason: string) => Promise<void>;
}) {
  const t = useT();

  return (
    <>
      <ConfirmDialog
        open={dialog === "confirm"}
        onOpenChange={onOpenChange}
        title={t("Confirm the voucher and post to the stock ledger?")}
        description={
          direction === "OUT"
            ? t(
                "Stock is deducted immediately and issuing more than the stock is not allowed. Finished-product issues also deduct materials from the active BOM. A confirmed voucher cannot be edited; if it is wrong you can only cancel it.",
              )
            : t(
                "Stock is increased immediately. A confirmed voucher cannot be edited; if it is wrong you can only cancel it.",
              )
        }
        confirmLabel={t("Confirm")}
        onConfirm={onConfirm}
      />
      <ConfirmDialog
        open={dialog === "delete"}
        onOpenChange={onOpenChange}
        title={t("Delete this draft voucher?")}
        description={t("The draft is deleted permanently. Stock is not affected.")}
        confirmLabel={t("Delete")}
        destructive
        onConfirm={onDelete}
      />
      <ReasonDialog
        open={dialog === "cancel"}
        onOpenChange={onOpenChange}
        title={t("Cancel the confirmed voucher?")}
        description={t(
          "The system writes reversal transactions to restore stock and keeps the history. Cancelling a receipt is blocked if the goods were already issued.",
        )}
        confirmLabel={t("Cancel voucher")}
        destructive
        onConfirm={onCancel}
      />
    </>
  );
}
