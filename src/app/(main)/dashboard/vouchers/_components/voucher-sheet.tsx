"use client";

import { useEffect, useRef, useState } from "react";

import Decimal from "decimal.js";
import { CircleCheck, Save, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { useT } from "@/lib/i18n/provider";
import { unwrap, unwrapAs } from "@/lib/wms/action-client";
import { VOUCHER_REMARK_UNIT, VOUCHER_RULES, type VoucherType } from "@/lib/wms/constants";
import { formatDateTime, todayYmd, toYmd, ymdToDate } from "@/lib/wms/format";
import type { VoucherDTO } from "@/lib/wms/types";
import { useLoad } from "@/lib/wms/use-load";
import {
  cancelVoucherAction,
  confirmVoucherAction,
  deleteDraftAction,
  getVoucherAction,
  saveDraftAction,
} from "@/server/actions/vouchers";

import { type PastedRow, PasteLinesDialog } from "../../_components/wms/paste-lines-dialog";
import { VoucherStatusBadge } from "../../_components/wms/status-badges";
import { useItems } from "../../_components/wms/use-items";
import { useCan } from "../../_components/wms/user-context";
import { type VoucherSheetDialog, VoucherSheetDialogs } from "./voucher-sheet-dialogs";
import { VoucherSheetFields } from "./voucher-sheet-fields";
import { type VoucherSheetLine, VoucherSheetLines } from "./voucher-sheet-lines";

export function VoucherSheet({
  direction,
  voucherId,
  onClose,
  onChanged,
}: {
  direction: "IN" | "OUT";
  voucherId: string | null;
  onClose: () => void;
  onChanged: () => void;
}) {
  const t = useT();
  const canWrite = useCan("voucher:write");
  const canConfirm = useCan("voucher:confirm");
  const canCancel = useCan("voucher:cancel");
  const { items } = useItems();

  const nextKey = useRef(1);
  const [currentId, setCurrentId] = useState(voucherId);
  const [type, setType] = useState<VoucherType>(direction === "IN" ? "IMPORT_MATERIAL" : "EXPORT_PRODUCTION");
  const [date, setDate] = useState(todayYmd());
  const [documentNumber, setDocumentNumber] = useState("");
  const [note, setNote] = useState("");
  const [lines, setLines] = useState<VoucherSheetLine[]>([]);
  const [busy, setBusy] = useState(false);
  const [pasteOpen, setPasteOpen] = useState(false);
  const [dialog, setDialog] = useState<VoucherSheetDialog>(null);

  const {
    data: loaded,
    loading,
    reload,
  } = useLoad(
    () => (currentId ? unwrapAs<VoucherDTO>(getVoucherAction(currentId)) : Promise.resolve(null)),
    [currentId],
  );

  // Fill the form from the stored voucher whenever a fresh copy arrives
  useEffect(() => {
    if (!loaded) return;
    setType(loaded.type);
    setDate(toYmd(loaded.voucherDate));
    setDocumentNumber(loaded.documentNumber ?? "");
    setNote(loaded.note ?? "");
    setLines(
      loaded.lines.map((line) => ({
        key: nextKey.current++,
        itemId: line.itemId,
        quantity: line.quantity,
        remarkQuantity: line.remarkQuantity ?? "",
        remarkUnit: line.remarkUnit ?? VOUCHER_REMARK_UNIT.BOX,
        note: line.note ?? "",
      })),
    );
  }, [loaded]);

  const status = loaded?.status ?? "DRAFT";
  const editable = status === "DRAFT" && canWrite;
  const rule = VOUCHER_RULES[type];
  const itemById = new Map(items.map((item) => [item._id, item]));
  const pickerItems = items.filter(
    (item) => item.isStocked && (direction === "OUT" || rule.allowed.includes(item.type)),
  );
  const typesOfDirection = (Object.keys(VOUCHER_RULES) as VoucherType[]).filter(
    (type) => VOUCHER_RULES[type].direction === direction,
  );

  function patchLine(key: number, patch: Partial<VoucherSheetLine>) {
    setLines((current) => current.map((line) => (line.key === key ? { ...line, ...patch } : line)));
  }

  function changeType(next: VoucherType) {
    const nextRule = VOUCHER_RULES[next];
    const kept =
      nextRule.direction === "OUT"
        ? lines
        : lines.filter(
            (line) => !line.itemId || nextRule.allowed.includes(itemById.get(line.itemId)?.type ?? "MATERIAL"),
          );
    if (kept.length !== lines.length) toast.info(t("Lines that do not fit the new voucher type were removed."));
    setLines(kept);
    setType(next);
  }

  function addPasted(rows: PastedRow[]) {
    setLines((current) => {
      let next = current;
      for (const { item, quantity } of rows) {
        if (next.some((line) => line.itemId === item._id)) {
          next = next.map((line) =>
            line.itemId === item._id
              ? { ...line, quantity: new Decimal(line.quantity || "0").plus(quantity).toString() }
              : line,
          );
        } else {
          next = [
            ...next,
            {
              key: nextKey.current++,
              itemId: item._id,
              quantity,
              remarkQuantity: "",
              remarkUnit: VOUCHER_REMARK_UNIT.BOX,
              note: "",
            },
          ];
        }
      }
      return next;
    });
  }

  /** Validates and saves the draft; returns the voucher id, or null when something is wrong */
  async function saveDraft(): Promise<string | null> {
    const filled = lines.filter((line) => line.itemId);
    if (filled.length === 0) {
      toast.error(t("The voucher needs at least one line with an item."));
      return null;
    }
    if (filled.some((line) => !(Number(line.quantity) > 0))) {
      toast.error(t("Every line needs a quantity greater than 0."));
      return null;
    }
    setBusy(true);
    const result = await unwrapAs<{ id: string }>(
      saveDraftAction(currentId, {
        type,
        voucherDate: ymdToDate(date).toISOString(),
        documentNumber: documentNumber.trim() || undefined,
        note: note.trim() === "" ? undefined : note.trim(),
        lines: filled.map((line) => ({
          itemId: line.itemId!,
          quantity: line.quantity,
          remarkQuantity: line.remarkQuantity.trim() || undefined,
          remarkUnit: line.remarkQuantity.trim() ? line.remarkUnit : undefined,
          note: line.note.trim() === "" ? undefined : line.note.trim(),
        })),
      }),
    );
    setBusy(false);
    if (!result) return null;
    setCurrentId(result.id);
    onChanged();
    return result.id;
  }

  async function handleSave() {
    if (await saveDraft()) toast.success(t("Draft voucher saved."));
  }

  async function handleConfirm() {
    const id = await saveDraft();
    if (!id) {
      setDialog(null);
      return;
    }
    const result = await unwrapAs<{ id: string; voucherNo: string }>(confirmVoucherAction(id));
    setDialog(null);
    if (result) {
      toast.success(t("Voucher {voucherNo} confirmed. Stock has been updated.", { voucherNo: result.voucherNo }));
      onChanged();
      reload();
    }
  }

  async function handleCancel(reason: string) {
    if (!currentId) return;
    const result = await unwrap(cancelVoucherAction(currentId, reason));
    if (result !== null) {
      setDialog(null);
      toast.success(t("Voucher cancelled. Stock was restored with reversal transactions."));
      onChanged();
      reload();
    }
  }

  async function handleDelete() {
    if (!currentId) return;
    const result = await unwrap(deleteDraftAction(currentId));
    if (result !== null) {
      toast.success(t("Draft voucher deleted."));
      onChanged();
      onClose();
    }
  }
  return (
    <>
      <Sheet open onOpenChange={(open) => !open && onClose()}>
        <SheetContent className="w-full gap-0 data-[side=right]:sm:max-w-5xl">
          <SheetHeader className="border-b">
            <SheetTitle className="flex flex-wrap items-center gap-2">
              {currentId ? (loaded?.voucherNo ?? t("Draft voucher")) : t("New voucher")}
              {loaded ? <VoucherStatusBadge status={loaded.status} /> : null}
            </SheetTitle>
            <SheetDescription>
              {status === "DRAFT"
                ? t("A draft does not affect stock. The stock ledger is only written when you confirm.")
                : t("A confirmed voucher cannot be edited. If it is wrong, cancel it and create a new one.")}
            </SheetDescription>
          </SheetHeader>

          <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto p-4">
            {loading && currentId && !loaded ? <Skeleton className="h-40 w-full" /> : null}

            {loaded?.status === "CANCELLED" ? (
              <div className="border-destructive/30 bg-destructive/10 text-destructive rounded-lg border px-3 py-2 text-sm">
                {t("Voucher cancelled at ")}
                {formatDateTime(loaded.cancelledAt)}
                {t(". Reason: ")}
                {loaded.cancelReason}
              </div>
            ) : null}

            <VoucherSheetFields
              type={type}
              date={date}
              documentNumber={documentNumber}
              note={note}
              voucherTypes={typesOfDirection}
              disabled={!editable}
              onTypeChange={changeType}
              onDateChange={setDate}
              onDocumentNumberChange={setDocumentNumber}
              onNoteChange={setNote}
            />
            <VoucherSheetLines
              lines={lines}
              pickerItems={pickerItems}
              itemById={itemById}
              editable={editable}
              onAddLine={() =>
                setLines((current) => [
                  ...current,
                  {
                    key: nextKey.current++,
                    itemId: null,
                    quantity: "",
                    remarkQuantity: "",
                    remarkUnit: VOUCHER_REMARK_UNIT.BOX,
                    note: "",
                  },
                ])
              }
              onOpenPaste={() => setPasteOpen(true)}
              onPatchLine={patchLine}
              onRemoveLine={(key) => setLines((current) => current.filter((line) => line.key !== key))}
            />
          </div>

          <SheetFooter className="flex-row flex-wrap justify-between gap-2 border-t">
            <div className="flex gap-2">
              {editable && currentId ? (
                <Button variant="outline" disabled={busy} onClick={() => setDialog("delete")}>
                  <Trash2 /> {t("Delete draft")}
                </Button>
              ) : null}
              {status === "CONFIRMED" && canCancel ? (
                <Button variant="destructive" onClick={() => setDialog("cancel")}>
                  {t("Cancel voucher")}
                </Button>
              ) : null}
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={onClose}>
                {t("Close")}
              </Button>
              {editable ? (
                <>
                  <Button variant="secondary" disabled={busy} onClick={() => void handleSave()}>
                    <Save /> {t("Save draft")}
                  </Button>
                  {canConfirm ? (
                    <Button disabled={busy} onClick={() => setDialog("confirm")}>
                      <CircleCheck /> {t("Confirm")}
                    </Button>
                  ) : null}
                </>
              ) : null}
            </div>
          </SheetFooter>
        </SheetContent>
      </Sheet>

      <PasteLinesDialog open={pasteOpen} onOpenChange={setPasteOpen} items={pickerItems} onApply={addPasted} />
      <VoucherSheetDialogs
        direction={direction}
        dialog={dialog}
        onOpenChange={(open) => !open && setDialog(null)}
        onConfirm={handleConfirm}
        onDelete={handleDelete}
        onCancel={handleCancel}
      />
    </>
  );
}
