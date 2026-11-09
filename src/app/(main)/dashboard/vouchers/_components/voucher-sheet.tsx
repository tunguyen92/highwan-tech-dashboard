"use client";

import { useEffect, useRef, useState } from "react";

import Decimal from "decimal.js";
import { Calculator, CircleCheck, ClipboardPaste, Plus, Save, Trash2, TriangleAlert } from "lucide-react";
import { toast } from "sonner";

import { CalendarDatePicker } from "@/components/calendar-date-picker";
import { Button } from "@/components/ui/button";
import { Field, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useT } from "@/lib/i18n/provider";
import { unwrap, unwrapAs } from "@/lib/wms/action-client";
import {
  VOUCHER_REMARK_UNIT,
  VOUCHER_RULES,
  VOUCHER_TYPE_LABEL,
  type VoucherRemarkUnit,
  type VoucherType,
} from "@/lib/wms/constants";
import { formatDateTime, formatQty, todayYmd, toYmd, ymdToDate } from "@/lib/wms/format";
import type { FillByBomDTO, VoucherDTO } from "@/lib/wms/types";
import { useLoad } from "@/lib/wms/use-load";
import {
  cancelVoucherAction,
  confirmVoucherAction,
  deleteDraftAction,
  fillByBomAction,
  getVoucherAction,
  saveDraftAction,
} from "@/server/actions/vouchers";

import { ConfirmDialog, ReasonDialog } from "../../_components/wms/confirm-dialogs";
import { ItemPicker } from "../../_components/wms/item-picker";
import { tableClass } from "../../_components/wms/page-card";
import { type PastedRow, PasteLinesDialog } from "../../_components/wms/paste-lines-dialog";
import { QtyInput } from "../../_components/wms/qty-input";
import { VoucherStatusBadge } from "../../_components/wms/status-badges";
import { useItems } from "../../_components/wms/use-items";
import { useCan } from "../../_components/wms/user-context";

type LineState = {
  key: number;
  itemId: string | null;
  quantity: string;
  normQuantity?: string;
  remarkQuantity: string;
  remarkUnit: VoucherRemarkUnit;
  note: string;
};
type ProductionRef = { productId: string; quantity: string };

const exceedsNorm = (quantity: string, norm?: string) => {
  try {
    return norm !== undefined && quantity !== "" && new Decimal(quantity).gt(norm);
  } catch {
    return false;
  }
};

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
  const [batchNote, setBatchNote] = useState("");
  const [note, setNote] = useState("");
  const [lines, setLines] = useState<LineState[]>([]);
  const [productionRef, setProductionRef] = useState<ProductionRef | null>(null);
  const [fillProduct, setFillProduct] = useState<string | null>(null);
  const [fillQty, setFillQty] = useState("");
  const [busy, setBusy] = useState(false);
  const [pasteOpen, setPasteOpen] = useState(false);
  const [dialog, setDialog] = useState<"confirm" | "cancel" | "delete" | "replace" | null>(null);

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
    setBatchNote(loaded.batchNote ?? "");
    setNote(loaded.note ?? "");
    setProductionRef(
      loaded.productionRef
        ? { productId: loaded.productionRef.productId, quantity: loaded.productionRef.quantity }
        : null,
    );
    setLines(
      loaded.lines.map((line) => ({
        key: nextKey.current++,
        itemId: line.itemId,
        quantity: line.quantity,
        normQuantity: line.normQuantity,
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
  const pickerItems = items.filter((item) => item.isStocked && rule.allowed.includes(item.type));
  const typesOfDirection = (Object.keys(VOUCHER_RULES) as VoucherType[]).filter(
    (type) => VOUCHER_RULES[type].direction === direction,
  );

  const showFill = editable && type === "EXPORT_PRODUCTION";

  function patchLine(key: number, patch: Partial<LineState>) {
    setLines((current) => current.map((line) => (line.key === key ? { ...line, ...patch } : line)));
  }

  function changeType(next: VoucherType) {
    const allowed = VOUCHER_RULES[next].allowed;
    const kept = lines.filter(
      (line) => !line.itemId || allowed.includes(itemById.get(line.itemId)?.type ?? "MATERIAL"),
    );
    if (kept.length !== lines.length) toast.info(t("Lines that do not fit the new voucher type were removed."));
    setLines(kept);
    setType(next);
    if (next !== "EXPORT_PRODUCTION") setProductionRef(null);
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

  async function fillByNorm() {
    if (!fillProduct) return;
    setBusy(true);
    const result = await unwrapAs<FillByBomDTO>(fillByBomAction(fillProduct, fillQty));
    setBusy(false);
    if (!result) return;
    setLines(
      result.lines.map((line) => ({
        key: nextKey.current++,
        itemId: line.itemId,
        quantity: line.quantity,
        normQuantity: line.normQuantity,
        remarkQuantity: "",
        remarkUnit: VOUCHER_REMARK_UNIT.BOX,
        note: "",
      })),
    );
    setProductionRef({ productId: result.productionRef.productId, quantity: result.productionRef.quantity });
    setDialog(null);
    toast.success(
      t("Filled {length} line(s) from the BOM. Adjust the actual issued quantity if it differs.", {
        length: result.lines.length,
      }),
    );
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
        batchNote: batchNote.trim() === "" ? undefined : batchNote.trim(),
        note: note.trim() === "" ? undefined : note.trim(),
        productionRef: type === "EXPORT_PRODUCTION" && productionRef ? productionRef : undefined,
        lines: filled.map((line) => ({
          itemId: line.itemId!,
          quantity: line.quantity,
          normQuantity: line.normQuantity,
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

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
              <Field>
                <FieldLabel htmlFor="v-type">{t("Voucher type")}</FieldLabel>
                <Select value={type} onValueChange={(value) => changeType(value as VoucherType)} disabled={!editable}>
                  <SelectTrigger id="v-type" className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      {typesOfDirection.map((voucherType) => (
                        <SelectItem key={voucherType} value={voucherType}>
                          {t(VOUCHER_TYPE_LABEL[voucherType])}
                        </SelectItem>
                      ))}
                    </SelectGroup>
                  </SelectContent>
                </Select>
              </Field>
              <Field>
                <FieldLabel htmlFor="v-date">{t("Voucher date")}</FieldLabel>
                <CalendarDatePicker id="v-date" value={date} onChange={setDate} disabled={!editable} />
              </Field>
              <Field>
                <FieldLabel htmlFor="v-document-number">{t("Document number")}</FieldLabel>
                <Input
                  id="v-document-number"
                  value={documentNumber}
                  disabled={!editable}
                  maxLength={100}
                  onChange={(e) => setDocumentNumber(e.target.value)}
                />
              </Field>
              <Field>
                <FieldLabel htmlFor="v-batch">{t("Batch reference (optional)")}</FieldLabel>
                <Input
                  id="v-batch"
                  value={batchNote}
                  disabled={!editable}
                  maxLength={200}
                  onChange={(e) => setBatchNote(e.target.value)}
                />
              </Field>
              <Field>
                <FieldLabel htmlFor="v-note">{t("Notes")}</FieldLabel>
                <Input
                  id="v-note"
                  value={note}
                  disabled={!editable}
                  maxLength={1000}
                  onChange={(e) => setNote(e.target.value)}
                />
              </Field>
            </div>

            {showFill ? (
              <div className="bg-muted/40 flex flex-wrap items-end gap-3 rounded-lg border p-3">
                <Field className="min-w-60 flex-1">
                  <FieldLabel>{t("Fill by norm: finished product")}</FieldLabel>
                  <ItemPicker
                    items={items}
                    value={fillProduct}
                    allowedTypes={["PRODUCT"]}
                    onChange={(item) => setFillProduct(item._id)}
                  />
                </Field>
                <Field className="w-36">
                  <FieldLabel htmlFor="v-fill-qty">{t("Quantity")}</FieldLabel>
                  <QtyInput id="v-fill-qty" value={fillQty} onChange={setFillQty} />
                </Field>
                <Button
                  variant="secondary"
                  disabled={busy || !fillProduct || !(Number(fillQty) > 0)}
                  onClick={() => (lines.some((l) => l.itemId) ? setDialog("replace") : void fillByNorm())}
                >
                  <Calculator /> {t("Fill by norm")}
                </Button>
              </div>
            ) : null}

            {type === "EXPORT_PRODUCTION" && productionRef ? (
              <p className="text-muted-foreground text-sm">
                {t("Norm calculated for")} {formatQty(productionRef.quantity)}{" "}
                {itemById.get(productionRef.productId)?.code ?? loaded?.productionRef?.productCode}
                {t(
                  '. The "Norm" column is the value at the time of filling; later BOM changes do not alter this voucher.',
                )}
              </p>
            ) : null}

            {editable ? (
              <div className="flex flex-wrap gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() =>
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
                >
                  <Plus /> {t("Add line")}
                </Button>
                <Button variant="outline" size="sm" onClick={() => setPasteOpen(true)}>
                  <ClipboardPaste /> {t("Paste from Excel")}
                </Button>
              </div>
            ) : null}

            <div className="rounded-lg border">
              <Table className={tableClass}>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-10">#</TableHead>
                    <TableHead className="w-[38%]">{t("Items")}</TableHead>
                    <TableHead className="w-16">{t("UoM")}</TableHead>
                    <TableHead className="w-36 text-right">{t("Quantity")}</TableHead>
                    <TableHead className="w-32 text-right">{t("Norm")}</TableHead>
                    <TableHead>{t("Notes")}</TableHead>
                    <TableHead className="w-48">{t("Remark")}</TableHead>
                    {editable ? <TableHead className="w-10" /> : null}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {lines.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={editable ? 8 : 7} className="text-muted-foreground h-20 text-center">
                        {t("No lines yet.")}
                      </TableCell>
                    </TableRow>
                  ) : null}
                  {lines.map((line, index) => {
                    const item = line.itemId ? itemById.get(line.itemId) : undefined;
                    const over = exceedsNorm(line.quantity, line.normQuantity);
                    return (
                      <TableRow key={line.key}>
                        <TableCell className="text-muted-foreground tabular-nums">{index + 1}</TableCell>
                        <TableCell>
                          {editable ? (
                            <ItemPicker
                              items={pickerItems}
                              value={line.itemId}
                              excludeIds={lines
                                .filter((l) => l.key !== line.key && l.itemId)
                                .map((l) => l.itemId as string)}
                              onChange={(picked) => patchLine(line.key, { itemId: picked._id })}
                            />
                          ) : (
                            <span>
                              <span className="font-medium">{item?.code}</span>
                              <span className="text-muted-foreground"> · {item?.name}</span>
                            </span>
                          )}
                        </TableCell>
                        <TableCell>{item?.unit}</TableCell>
                        <TableCell className="text-right">
                          {editable ? (
                            <QtyInput
                              value={line.quantity}
                              onChange={(value) => patchLine(line.key, { quantity: value })}
                            />
                          ) : (
                            <span className="font-medium tabular-nums">{formatQty(line.quantity)}</span>
                          )}
                        </TableCell>
                        <TableCell className="text-right tabular-nums">
                          {line.normQuantity !== undefined ? (
                            <span className={over ? "text-amber-700 dark:text-amber-300" : "text-muted-foreground"}>
                              {over ? <TriangleAlert className="mr-1 inline size-3.5" /> : null}
                              {formatQty(line.normQuantity)}
                            </span>
                          ) : null}
                        </TableCell>
                        <TableCell>
                          {editable ? (
                            <Input
                              value={line.note}
                              maxLength={300}
                              onChange={(e) => patchLine(line.key, { note: e.target.value })}
                            />
                          ) : (
                            <span className="text-muted-foreground">{line.note}</span>
                          )}
                        </TableCell>
                        <TableCell>
                          {editable ? (
                            <div className="flex items-center gap-2">
                              <QtyInput
                                aria-label={`${t("Remark quantity")} ${index + 1}`}
                                value={line.remarkQuantity}
                                onChange={(remarkQuantity) => patchLine(line.key, { remarkQuantity })}
                              />
                              <Select
                                value={line.remarkUnit}
                                onValueChange={(value) =>
                                  patchLine(line.key, { remarkUnit: value as VoucherRemarkUnit })
                                }
                              >
                                <SelectTrigger className="w-24" aria-label={`${t("Remark package")} ${index + 1}`}>
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectGroup>
                                    {Object.values(VOUCHER_REMARK_UNIT).map((unit) => (
                                      <SelectItem key={unit} value={unit}>
                                        {unit}
                                      </SelectItem>
                                    ))}
                                  </SelectGroup>
                                </SelectContent>
                              </Select>
                            </div>
                          ) : (
                            <span className="text-muted-foreground">
                              {line.remarkQuantity ? `${formatQty(line.remarkQuantity)} ${line.remarkUnit}` : ""}
                            </span>
                          )}
                        </TableCell>
                        {editable ? (
                          <TableCell>
                            <Button
                              variant="ghost"
                              size="icon-sm"
                              aria-label={t("Delete line")}
                              onClick={() => setLines((current) => current.filter((l) => l.key !== line.key))}
                            >
                              <Trash2 />
                            </Button>
                          </TableCell>
                        ) : null}
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
            {editable && lines.some((l) => exceedsNorm(l.quantity, l.normQuantity)) ? (
              <p className="text-sm text-amber-700 dark:text-amber-300">
                {t(
                  "Some lines exceed the norm. You can still confirm; state the reason in the Notes column to make scrap reconciliation easier.",
                )}
              </p>
            ) : null}
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
      <ConfirmDialog
        open={dialog === "confirm"}
        onOpenChange={(open) => !open && setDialog(null)}
        title={t("Confirm the voucher and post to the stock ledger?")}
        description={
          direction === "OUT"
            ? t(
                "Stock is deducted immediately and issuing more than the stock is not allowed. A confirmed voucher cannot be edited; if it is wrong you can only cancel it.",
              )
            : t(
                "Stock is increased immediately. A confirmed voucher cannot be edited; if it is wrong you can only cancel it.",
              )
        }
        confirmLabel={t("Confirm")}
        onConfirm={handleConfirm}
      />
      <ConfirmDialog
        open={dialog === "replace"}
        onOpenChange={(open) => !open && setDialog(null)}
        title={t("Replace the existing lines?")}
        description={t("The lines you entered will be replaced by the list calculated from the BOM.")}
        confirmLabel={t("Replace")}
        onConfirm={fillByNorm}
      />
      <ConfirmDialog
        open={dialog === "delete"}
        onOpenChange={(open) => !open && setDialog(null)}
        title={t("Delete this draft voucher?")}
        description={t("The draft is deleted permanently. Stock is not affected.")}
        confirmLabel={t("Delete")}
        destructive
        onConfirm={handleDelete}
      />
      <ReasonDialog
        open={dialog === "cancel"}
        onOpenChange={(open) => !open && setDialog(null)}
        title={t("Cancel the confirmed voucher?")}
        description={t(
          "The system writes reversal transactions to restore stock and keeps the history. Cancelling a receipt is blocked if the goods were already issued.",
        )}
        confirmLabel={t("Cancel voucher")}
        destructive
        onConfirm={handleCancel}
      />
    </>
  );
}
