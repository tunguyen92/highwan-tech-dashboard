"use client";

import { useEffect, useState } from "react";

import { zodResolver } from "@hookform/resolvers/zod";
import Decimal from "decimal.js";
import { CircleCheck, Save, Trash2 } from "lucide-react";
import { useFieldArray, useForm, useWatch } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { useT } from "@/lib/i18n/provider";
import { unwrap, unwrapAs } from "@/lib/wms/action-client";
import {
  QTY_MAX_DECIMAL_PLACES,
  VOUCHER_REMARK_UNIT,
  VOUCHER_RULES,
  VOUCHER_TYPE,
  type VoucherRemarkUnit,
  type VoucherType,
} from "@/lib/wms/constants";
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

const voucherTypeValues = Object.values(VOUCHER_TYPE) as [VoucherType, ...VoucherType[]];
const remarkUnitValues = Object.values(VOUCHER_REMARK_UNIT) as [VoucherRemarkUnit, ...VoucherRemarkUnit[]];

const voucherSheetSchema = z.object({
  type: z.enum(voucherTypeValues),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  documentNumber: z.string().max(100),
  note: z.string().max(1000),
  lines: z.array(
    z.object({
      itemId: z.string().nullable(),
      quantity: z.string(),
      remarkQuantity: z.string(),
      remarkUnit: z.enum(remarkUnitValues),
      note: z.string().max(300),
    }),
  ),
});

type VoucherSheetFormValues = z.infer<typeof voucherSheetSchema>;

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

  const [currentId, setCurrentId] = useState(voucherId);
  const [pasteOpen, setPasteOpen] = useState(false);
  const [dialog, setDialog] = useState<VoucherSheetDialog>(null);
  const form = useForm<VoucherSheetFormValues>({
    resolver: zodResolver(voucherSheetSchema),
    defaultValues: {
      type: direction === "IN" ? "IMPORT_MATERIAL" : "EXPORT_PRODUCTION",
      date: todayYmd(),
      documentNumber: "",
      note: "",
      lines: [],
    },
  });
  const { append, fields, remove, replace } = useFieldArray({ control: form.control, name: "lines" });
  const type = useWatch({ control: form.control, name: "type" });
  const date = useWatch({ control: form.control, name: "date" });
  const documentNumber = useWatch({ control: form.control, name: "documentNumber" });
  const note = useWatch({ control: form.control, name: "note" });
  const lines = useWatch({ control: form.control, name: "lines" });
  const busy = form.formState.isSubmitting;

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
    form.reset({
      type: loaded.type,
      date: toYmd(loaded.voucherDate),
      documentNumber: loaded.documentNumber ?? "",
      note: loaded.note ?? "",
      lines: loaded.lines.map((line) => ({
        itemId: line.itemId,
        quantity: line.quantity,
        remarkQuantity: line.remarkQuantity ?? "",
        remarkUnit: line.remarkUnit ?? VOUCHER_REMARK_UNIT.BOX,
        note: line.note ?? "",
      })),
    });
  }, [form, loaded]);

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

  function patchLine(index: number, patch: Partial<VoucherSheetLine>) {
    const options = { shouldDirty: true };
    if (patch.itemId !== undefined) form.setValue(`lines.${index}.itemId`, patch.itemId, options);
    if (patch.quantity !== undefined) form.setValue(`lines.${index}.quantity`, patch.quantity, options);
    if (patch.remarkQuantity !== undefined)
      form.setValue(`lines.${index}.remarkQuantity`, patch.remarkQuantity, options);
    if (patch.remarkUnit !== undefined) form.setValue(`lines.${index}.remarkUnit`, patch.remarkUnit, options);
    if (patch.note !== undefined) form.setValue(`lines.${index}.note`, patch.note, options);
  }

  function changeType(next: VoucherType) {
    const nextRule = VOUCHER_RULES[next];
    const currentLines = form.getValues("lines");
    const kept =
      nextRule.direction === "OUT"
        ? currentLines
        : currentLines.filter(
            (line) => !line.itemId || nextRule.allowed.includes(itemById.get(line.itemId)?.type ?? "MATERIAL"),
          );
    if (kept.length !== currentLines.length) {
      toast.info(t("Lines that do not fit the new voucher type were removed."));
      replace(kept);
    }
    form.setValue("type", next, { shouldDirty: true });
  }

  function addPasted(rows: PastedRow[]) {
    let next = form.getValues("lines");
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
            itemId: item._id,
            quantity,
            remarkQuantity: "",
            remarkUnit: VOUCHER_REMARK_UNIT.BOX,
            note: "",
          },
        ];
      }
    }
    replace(next);
  }

  /** Validates and saves the draft; returns the voucher id, or null when something is wrong */
  async function saveDraft(values: VoucherSheetFormValues): Promise<string | null> {
    const quantityPattern = new RegExp(`^\\d+(\\.\\d{1,${QTY_MAX_DECIMAL_PLACES}})?$`);
    const filled = values.lines.filter((line) => line.itemId);
    if (filled.length === 0) {
      toast.error(t("The voucher needs at least one line with an item."));
      return null;
    }
    if (filled.some((line) => !(Number(line.quantity) > 0) || !quantityPattern.test(line.quantity))) {
      toast.error(t("Every line needs a quantity greater than 0."));
      return null;
    }
    const result = await unwrapAs<{ id: string }>(
      saveDraftAction(currentId, {
        type: values.type,
        voucherDate: ymdToDate(values.date).toISOString(),
        documentNumber: values.documentNumber.trim() || undefined,
        note: values.note.trim() === "" ? undefined : values.note.trim(),
        lines: filled.map((line) => ({
          itemId: line.itemId!,
          quantity: line.quantity,
          remarkQuantity: line.remarkQuantity.trim() || undefined,
          remarkUnit: line.remarkQuantity.trim() ? line.remarkUnit : undefined,
          note: line.note.trim() === "" ? undefined : line.note.trim(),
        })),
      }),
    );
    if (!result) return null;
    setCurrentId(result.id);
    onChanged();
    return result.id;
  }

  async function handleSave() {
    await form.handleSubmit(
      async (values) => {
        if (await saveDraft(values)) toast.success(t("Draft voucher saved."));
      },
      () => toast.error(t("Please check the voucher fields.")),
    )();
  }

  async function handleConfirm() {
    await form.handleSubmit(
      async (values) => {
        const id = await saveDraft(values);
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
      },
      () => {
        setDialog(null);
        toast.error(t("Please check the voucher fields."));
      },
    )();
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
              onDateChange={(value) => form.setValue("date", value, { shouldDirty: true })}
              onDocumentNumberChange={(value) => form.setValue("documentNumber", value, { shouldDirty: true })}
              onNoteChange={(value) => form.setValue("note", value, { shouldDirty: true })}
            />
            <VoucherSheetLines
              lines={lines ?? []}
              fieldIds={fields.map((field) => field.id)}
              pickerItems={pickerItems}
              itemById={itemById}
              editable={editable}
              onAddLine={() =>
                append({
                  itemId: null,
                  quantity: "",
                  remarkQuantity: "",
                  remarkUnit: VOUCHER_REMARK_UNIT.BOX,
                  note: "",
                })
              }
              onOpenPaste={() => setPasteOpen(true)}
              onPatchLine={patchLine}
              onRemoveLine={remove}
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
