"use client";

import { useEffect, useState } from "react";

import { useRouter } from "next/navigation";

import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowLeft, Plus, Save, Trash2 } from "lucide-react";
import { useFieldArray, useForm, useWatch } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

import { CalendarDatePicker } from "@/components/calendar-date-picker";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useT } from "@/lib/i18n/provider";
import { unwrap, unwrapAs } from "@/lib/wms/action-client";
import {
  isQuantityValidForUnit,
  VOUCHER_RULES,
  VOUCHER_TYPE,
  VOUCHER_TYPE_LABEL,
  type VoucherType,
} from "@/lib/wms/constants";
import { formatDateTime, formatQty, todayYmd, toYmd, ymdToDate } from "@/lib/wms/format";
import type { VoucherDTO } from "@/lib/wms/types";
import { useLoad } from "@/lib/wms/use-load";
import {
  cancelVoucherAction,
  confirmVoucherAction,
  deleteDraftAction,
  getVoucherAction,
  saveDraftAction,
} from "@/server/actions/vouchers";

import { ConfirmDialog } from "../../_components/wms/confirm-dialogs";
import { ItemPicker } from "../../_components/wms/item-picker";
import { QtyInput } from "../../_components/wms/qty-input";
import { VoucherStatusBadge } from "../../_components/wms/status-badges";
import { useItems } from "../../_components/wms/use-items";
import { useCan } from "../../_components/wms/user-context";
import { type VoucherSheetDialog, VoucherSheetDialogs } from "./voucher-sheet-dialogs";

const voucherTypeValues = Object.values(VOUCHER_TYPE) as [VoucherType, ...VoucherType[]];
const goodsReceiptFormSchema = z.object({
  type: z.enum(voucherTypeValues),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  lines: z.array(
    z.object({
      itemId: z.string().nullable(),
      quantity: z.string(),
    }),
  ),
});

type GoodsReceiptFormValues = z.infer<typeof goodsReceiptFormSchema>;

export function GoodsReceiptEditor({ voucherId }: { voucherId: string | null }) {
  const t = useT();
  const router = useRouter();
  const canWrite = useCan("voucher:write");
  const canConfirm = useCan("voucher:confirm");
  const canCancel = useCan("voucher:cancel");
  const { items, loading: itemsLoading } = useItems();
  const [currentId, setCurrentId] = useState(voucherId);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [dialog, setDialog] = useState<VoucherSheetDialog>(null);
  const form = useForm<GoodsReceiptFormValues>({
    resolver: zodResolver(goodsReceiptFormSchema),
    defaultValues: {
      type: "IMPORT_MATERIAL",
      date: todayYmd(),
      lines: [],
    },
  });
  const { append, fields, remove, replace } = useFieldArray({ control: form.control, name: "lines" });
  const type = useWatch({ control: form.control, name: "type" });
  const date = useWatch({ control: form.control, name: "date" });
  const lines = useWatch({ control: form.control, name: "lines" }) ?? [];
  const busy = form.formState.isSubmitting;
  const rule = VOUCHER_RULES[type];
  const availableItems = items.filter((item) => item.isStocked && rule.allowed.includes(item.type));
  const itemById = new Map(items.map((item) => [item._id, item]));
  const listUrl = "/dashboard/vouchers/import";

  const {
    data: loaded,
    loading,
    reload,
  } = useLoad(
    () => (currentId ? unwrapAs<VoucherDTO>(getVoucherAction(currentId)) : Promise.resolve(null)),
    [currentId],
  );
  const types = (Object.keys(VOUCHER_RULES) as VoucherType[]).filter(
    (voucherType) => VOUCHER_RULES[voucherType].direction === "IN",
  );

  useEffect(() => {
    if (loaded?.direction !== "IN") return;
    form.reset({
      type: loaded.type,
      date: toYmd(loaded.voucherDate),
      lines: loaded.lines.map((line) => ({ itemId: line.itemId, quantity: line.quantity })),
    });
  }, [form, loaded]);

  const status = loaded?.direction === "IN" ? loaded.status : "DRAFT";
  const editable = canWrite && status === "DRAFT" && (!currentId || loaded?.direction === "IN");

  function changeType(next: VoucherType) {
    const nextRule = VOUCHER_RULES[next];
    const currentLines = form.getValues("lines");
    const nextLines = currentLines.filter((line) => {
      if (!line.itemId) return true;
      const item = itemById.get(line.itemId);
      return Boolean(item && nextRule.allowed.includes(item.type));
    });
    if (nextLines.length !== currentLines.length) {
      toast.info(t("Lines that do not fit the new voucher type were removed."));
      replace(nextLines);
    }
    form.setValue("type", next, { shouldDirty: true });
  }

  async function saveDraft(values: GoodsReceiptFormValues): Promise<string | null> {
    const filledLines = values.lines.filter((line) => line.itemId);
    if (filledLines.length === 0) {
      toast.error(t("The voucher needs at least one line with an item."));
      return null;
    }
    if (
      filledLines.some((line) => {
        const item = line.itemId ? itemById.get(line.itemId) : undefined;
        const quantity = line.quantity;
        return !item || !(Number(quantity) > 0) || !isQuantityValidForUnit(quantity, item.unit);
      })
    ) {
      toast.error(t("Every line needs a valid quantity for its unit."));
      return null;
    }

    const validLines = filledLines.filter((line): line is typeof line & { itemId: string } => Boolean(line.itemId));
    const result = await unwrapAs<{ id: string }>(
      saveDraftAction(currentId, {
        type: values.type,
        voucherDate: ymdToDate(values.date).toISOString(),
        lines: validLines.map((line) => ({
          itemId: line.itemId,
          quantity: line.quantity,
        })),
      }),
    );
    if (!result) return null;

    setCurrentId(result.id);
    router.replace(`${listUrl}/new?id=${encodeURIComponent(result.id)}`);
    return result.id;
  }

  async function handleSave() {
    await form.handleSubmit(
      async (values) => {
        if (await saveDraft(values)) {
          toast.success(t("Draft voucher saved."));
          reload();
        }
      },
      () => toast.error(t("Please check the voucher fields.")),
    )();
  }

  async function handleConfirm() {
    await form.handleSubmit(
      async (values) => {
        const id = await saveDraft(values);
        if (!id) {
          setConfirmOpen(false);
          return;
        }
        const result = await unwrapAs<{ id: string; voucherNo: string }>(confirmVoucherAction(id));
        setConfirmOpen(false);
        if (result) {
          toast.success(t("Voucher {voucherNo} confirmed. Stock has been updated.", { voucherNo: result.voucherNo }));
          reload();
        }
      },
      () => {
        setConfirmOpen(false);
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
      reload();
    }
  }

  async function handleDelete() {
    if (!currentId) return;
    const result = await unwrap(deleteDraftAction(currentId));
    if (result !== null) {
      toast.success(t("Draft voucher deleted."));
      router.push(listUrl);
    }
  }

  if (currentId && !loading && !loaded) {
    return (
      <div className="flex flex-col gap-4">
        <p role="alert" className="text-destructive text-sm">
          {t("Unable to load this voucher.")}
        </p>
        <Button type="button" variant="outline" className="w-fit" onClick={() => router.push(listUrl)}>
          <ArrowLeft data-icon="inline-start" />
          {t("Back to vouchers")}
        </Button>
      </div>
    );
  }

  if (loaded && loaded.direction !== "IN") {
    return (
      <p role="alert" className="text-destructive text-sm">
        {t("This voucher belongs to the other voucher list.")}
      </p>
    );
  }

  return (
    <>
      <div className="flex flex-col gap-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="flex items-start gap-3">
            <Button
              type="button"
              variant="outline"
              size="icon"
              aria-label={t("Back to vouchers")}
              onClick={() => router.push(listUrl)}
            >
              <ArrowLeft />
            </Button>
            <div className="flex flex-col gap-1">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-3xl leading-none font-medium tracking-tight">{t("Create goods receipt")}</h1>
                {loaded ? <VoucherStatusBadge status={loaded.status} /> : null}
              </div>
              <p className="text-muted-foreground text-sm">
                {t("Add item lines, search for an item, and enter its received quantity.")}
              </p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {editable && currentId ? (
              <Button type="button" variant="outline" disabled={busy} onClick={() => setDialog("delete")}>
                <Trash2 data-icon="inline-start" />
                {t("Delete draft")}
              </Button>
            ) : null}
            {status === "CONFIRMED" && canCancel ? (
              <Button type="button" variant="destructive" onClick={() => setDialog("cancel")}>
                {t("Cancel voucher")}
              </Button>
            ) : null}
            {editable ? (
              <Button type="button" disabled={busy} onClick={() => void handleSave()}>
                <Save data-icon="inline-start" />
                {t("Save draft")}
              </Button>
            ) : null}
            {editable && canConfirm ? (
              <Button type="button" variant="secondary" disabled={busy} onClick={() => setConfirmOpen(true)}>
                {t("Confirm")}
              </Button>
            ) : null}
          </div>
        </div>

        {currentId && loading && !loaded ? <p className="text-muted-foreground text-sm">{t("Loading...")}</p> : null}

        {loaded?.status === "CANCELLED" ? (
          <div className="border-destructive/30 bg-destructive/10 text-destructive rounded-lg border px-3 py-2 text-sm">
            {t("Voucher cancelled at ")}
            {formatDateTime(loaded.cancelledAt)}
            {t(". Reason: ")}
            {loaded.cancelReason}
          </div>
        ) : null}

        <Card className="gap-0">
          <CardHeader>
            <CardTitle>{t("Voucher details")}</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-5">
            <FieldGroup className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <Field>
                <FieldLabel htmlFor="receipt-type">{t("Voucher type")}</FieldLabel>
                <Select
                  value={type}
                  onValueChange={(value) => changeType(value as VoucherType)}
                  disabled={!editable || itemsLoading}
                >
                  <SelectTrigger id="receipt-type">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      {types.map((voucherType) => (
                        <SelectItem key={voucherType} value={voucherType}>
                          {t(VOUCHER_TYPE_LABEL[voucherType])}
                        </SelectItem>
                      ))}
                    </SelectGroup>
                  </SelectContent>
                </Select>
              </Field>
              <Field>
                <FieldLabel htmlFor="receipt-date">{t("Voucher date")}</FieldLabel>
                <CalendarDatePicker
                  id="receipt-date"
                  value={date}
                  onChange={(value) => form.setValue("date", value, { shouldDirty: true })}
                  disabled={!editable}
                />
              </Field>
            </FieldGroup>

            <div className="flex flex-col gap-1">
              <h2 className="font-medium">{t("Received items")}</h2>
            </div>

            {editable ? (
              <Button
                type="button"
                variant="outline"
                className="w-fit"
                disabled={itemsLoading}
                onClick={() => append({ itemId: null, quantity: "" })}
              >
                <Plus data-icon="inline-start" />
                {t("Add line")}
              </Button>
            ) : null}

            <div className="overflow-x-auto rounded-lg border">
              <Table className="min-w-150">
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12">{t("No.")}</TableHead>
                    <TableHead className="min-w-72">{t("Items")}</TableHead>
                    <TableHead className="w-20">{t("UoM")}</TableHead>
                    <TableHead className="w-40 text-right">{t("Quantity")}</TableHead>
                    {editable ? <TableHead className="w-12" /> : null}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {lines.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={editable ? 5 : 4} className="text-muted-foreground h-20 text-center">
                        {itemsLoading ? t("Loading...") : t("No lines yet.")}
                      </TableCell>
                    </TableRow>
                  ) : null}
                  {fields.map((field, index) => {
                    const line = lines[index];
                    if (!line) return null;
                    const item = line.itemId ? itemById.get(line.itemId) : undefined;
                    return (
                      <TableRow key={field.id}>
                        <TableCell className="text-muted-foreground tabular-nums">{index + 1}</TableCell>
                        <TableCell>
                          {editable ? (
                            <ItemPicker
                              items={availableItems}
                              value={line.itemId}
                              excludeIds={lines.flatMap((other, otherIndex) =>
                                otherIndex !== index && other.itemId ? [other.itemId] : [],
                              )}
                              onChange={(picked) =>
                                form.setValue(`lines.${index}.itemId`, picked._id, { shouldDirty: true })
                              }
                            />
                          ) : (
                            <span>
                              <span className="font-medium">{item?.code}</span>
                              <span className="text-muted-foreground"> · {item?.name}</span>
                              {item?.spec ? <span className="text-muted-foreground"> · {item.spec}</span> : null}
                            </span>
                          )}
                        </TableCell>
                        <TableCell>{item?.unit}</TableCell>
                        <TableCell className="text-right">
                          {editable ? (
                            <QtyInput
                              aria-label={t("Quantity for line {line}", { line: index + 1 })}
                              value={line.quantity}
                              onChange={(quantity) =>
                                form.setValue(`lines.${index}.quantity`, quantity, { shouldDirty: true })
                              }
                            />
                          ) : (
                            <span className="font-medium tabular-nums">{formatQty(line.quantity)}</span>
                          )}
                        </TableCell>
                        {editable ? (
                          <TableCell>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon-sm"
                              aria-label={t("Delete line")}
                              onClick={() => remove(index)}
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
          </CardContent>
        </Card>
      </div>

      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title={t("Confirm the voucher and post to the stock ledger?")}
        description={t(
          "Stock is increased immediately. A confirmed voucher cannot be edited; if it is wrong you can only cancel it.",
        )}
        confirmLabel={t("Confirm")}
        onConfirm={handleConfirm}
      />
      <VoucherSheetDialogs
        direction="IN"
        dialog={dialog}
        onOpenChange={(open) => !open && setDialog(null)}
        onConfirm={handleConfirm}
        onDelete={handleDelete}
        onCancel={handleCancel}
      />
    </>
  );
}
