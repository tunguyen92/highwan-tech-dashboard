"use client";

import { useEffect, useRef, useState } from "react";

import { useRouter } from "next/navigation";

import Decimal from "decimal.js";
import ExcelJS from "exceljs";
import { ArrowLeft, ClipboardPaste, Download, Plus, Printer, Save, Trash2, ZoomIn, ZoomOut } from "lucide-react";
import { createPortal } from "react-dom";
import { toast } from "sonner";

import { CalendarDatePicker } from "@/components/calendar-date-picker";
import { Button } from "@/components/ui/button";
import { Card, CardAction, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useT } from "@/lib/i18n/provider";
import { unwrapAs } from "@/lib/wms/action-client";
import {
  VOUCHER_REMARK_UNIT,
  VOUCHER_RULES,
  VOUCHER_TYPE_LABEL,
  type VoucherRemarkUnit,
  type VoucherType,
} from "@/lib/wms/constants";
import { formatQty, todayYmd, toYmd, ymdToDate } from "@/lib/wms/format";
import type { VoucherDTO } from "@/lib/wms/types";
import { useLoad } from "@/lib/wms/use-load";
import { confirmVoucherAction, getVoucherAction, saveDraftAction } from "@/server/actions/vouchers";

import { ConfirmDialog } from "../../_components/wms/confirm-dialogs";
import { ItemPicker } from "../../_components/wms/item-picker";
import { type PastedRow, PasteLinesDialog } from "../../_components/wms/paste-lines-dialog";
import { QtyInput } from "../../_components/wms/qty-input";
import { VoucherStatusBadge } from "../../_components/wms/status-badges";
import { useItems } from "../../_components/wms/use-items";
import { useCan } from "../../_components/wms/user-context";
import { formatVoucherRemark, type VoucherDocumentLine, VoucherPaper } from "./voucher-paper";

export function VoucherDocumentEditor({ direction, voucherId }: { direction: "IN" | "OUT"; voucherId: string | null }) {
  const t = useT();
  const router = useRouter();
  const canWrite = useCan("voucher:write");
  const canConfirm = useCan("voucher:confirm");
  const { items, loading: itemsLoading } = useItems();
  const nextKey = useRef(1);
  const previewContainerRef = useRef<HTMLDivElement>(null);
  const [mounted, setMounted] = useState(false);
  const [currentId, setCurrentId] = useState(voucherId);
  const [type, setType] = useState<VoucherType>(direction === "IN" ? "IMPORT_MATERIAL" : "EXPORT_PRODUCT");
  const [date, setDate] = useState(todayYmd());
  const [documentNumber, setDocumentNumber] = useState("");
  const [lines, setLines] = useState<VoucherDocumentLine[]>([]);
  const [busy, setBusy] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [pasteOpen, setPasteOpen] = useState(false);
  const [previewFitZoom, setPreviewFitZoom] = useState(0.3);
  const [previewZoomStep, setPreviewZoomStep] = useState(0);
  const previewZoom = previewFitZoom * 1.2 ** previewZoomStep;

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    const container = previewContainerRef.current;
    const paper = container?.querySelector<HTMLElement>(".voucher-paper");
    if (!container || !paper) return;

    let frame = 0;
    const updateFitZoom = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const zoom = Number.parseFloat(getComputedStyle(paper).zoom) || 1;
        const paperRect = paper.getBoundingClientRect();
        const containerStyle = getComputedStyle(container);
        const horizontalPadding =
          (Number.parseFloat(containerStyle.paddingLeft) || 0) + (Number.parseFloat(containerStyle.paddingRight) || 0);
        const verticalPadding =
          (Number.parseFloat(containerStyle.paddingTop) || 0) + (Number.parseFloat(containerStyle.paddingBottom) || 0);
        const availableWidth = container.clientWidth - horizontalPadding;
        const availableHeight = container.clientHeight - verticalPadding;
        if (paperRect.width <= 0 || paperRect.height <= 0 || availableWidth <= 0 || availableHeight <= 0) return;

        const naturalWidth = paperRect.width / zoom;
        const naturalHeight = paperRect.height / zoom;
        const fitZoom = Math.min(1, (availableWidth * 0.98) / naturalWidth, (availableHeight * 0.98) / naturalHeight);
        setPreviewFitZoom((current) => (Math.abs(current - fitZoom) > 0.001 ? fitZoom : current));
      });
    };

    const observer = new ResizeObserver(updateFitZoom);
    observer.observe(container);
    observer.observe(paper);
    updateFitZoom();

    return () => {
      observer.disconnect();
      cancelAnimationFrame(frame);
    };
  }, []);

  const {
    data: loaded,
    loading,
    reload,
  } = useLoad(
    () => (currentId ? unwrapAs<VoucherDTO>(getVoucherAction(currentId)) : Promise.resolve(null)),
    [currentId],
  );

  useEffect(() => {
    if (!loaded || loaded.direction !== direction) return;
    setType(loaded.type);
    setDate(toYmd(loaded.voucherDate));
    setDocumentNumber(loaded.documentNumber ?? "");
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
  }, [direction, loaded]);

  const itemById = new Map(items.map((item) => [item._id, item]));
  const rule = VOUCHER_RULES[type];
  const types = (Object.keys(VOUCHER_RULES) as VoucherType[]).filter(
    (voucherType) => VOUCHER_RULES[voucherType].direction === direction,
  );
  const pickerItems = items.filter(
    (item) => item.isStocked && (direction === "OUT" || rule.allowed.includes(item.type)),
  );
  const status = loaded?.direction === direction ? loaded.status : "DRAFT";
  const editable = canWrite && status === "DRAFT" && (!currentId || loaded?.direction === direction);
  const paperLines = lines.map((line) => ({
    item: line.itemId ? itemById.get(line.itemId) : undefined,
    quantity: line.quantity,
    remarkQuantity: line.remarkQuantity,
    remarkUnit: line.remarkUnit,
    note: line.note,
  }));
  const total = sumQuantities(lines, itemById);
  const listUrl = `/dashboard/vouchers/${direction === "IN" ? "import" : "export"}`;

  function patchLine(key: number, patch: Partial<VoucherDocumentLine>) {
    setLines((current) => current.map((line) => (line.key === key ? { ...line, ...patch } : line)));
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

  function changeType(next: VoucherType) {
    const nextRule = VOUCHER_RULES[next];
    setLines((current) => {
      const kept =
        nextRule.direction === "OUT"
          ? current
          : current.filter(
              (line) => !line.itemId || nextRule.allowed.includes(itemById.get(line.itemId)?.type ?? "MATERIAL"),
            );
      if (kept.length !== current.length) toast.info(t("Lines that do not fit the new voucher type were removed."));
      return kept;
    });
    setType(next);
  }

  async function saveDraft(): Promise<string | null> {
    const filled = lines.filter((line): line is VoucherDocumentLine & { itemId: string } => Boolean(line.itemId));
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
        lines: filled.map((line) => ({
          itemId: line.itemId,
          quantity: line.quantity,
          remarkQuantity: line.remarkQuantity.trim() || undefined,
          remarkUnit: line.remarkQuantity.trim() ? line.remarkUnit : undefined,
          note: line.note.trim() || undefined,
        })),
      }),
    );
    setBusy(false);
    if (!result) return null;

    setCurrentId(result.id);
    router.replace(`${listUrl}/new?id=${encodeURIComponent(result.id)}`);
    return result.id;
  }

  async function handleSave() {
    if (await saveDraft()) {
      toast.success(t("Draft voucher saved."));
      reload();
    }
  }

  async function handleConfirm() {
    const id = await saveDraft();
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
  }

  function printDocument() {
    window.print();
  }

  async function downloadXlsx() {
    try {
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet(direction === "OUT" ? "Phieu xuat kho" : "Phieu nhap kho");
      worksheet.columns = [{ width: 8 }, { width: 18 }, { width: 38 }, { width: 16 }, { width: 12 }, { width: 24 }];
      worksheet.addRow([direction === "OUT" ? "DELIVERY NOTE" : "GOODS RECEIPT"]);
      worksheet.mergeCells(1, 1, 1, 6);
      worksheet.getRow(1).font = { bold: true, size: 16 };
      worksheet.addRow(["Số:", documentNumber || loaded?.voucherNo || ""]);
      worksheet.addRow(["Ngày:", date]);
      worksheet.addRow([]);
      const header = worksheet.addRow(
        direction === "OUT"
          ? ["No.", "CODE", "PART NAME", "QUANTITY", "UNIT", "REMARK (BOX / BAG)"]
          : ["No.", "CODE", "ITEM NAME", "QUANTITY", "UNIT", "REMARK"],
      );
      header.font = { bold: true };
      paperLines.forEach((line, index) => {
        worksheet.addRow([
          index + 1,
          line.item?.code ?? "",
          line.item?.name ?? "",
          line.quantity,
          line.item?.unit ?? "",
          formatVoucherRemark(line),
        ]);
      });
      worksheet.addRow(["", "", "TOTAL", total]);

      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([new Uint8Array(buffer)], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      const safeNumber = (documentNumber || date).replace(/[<>:"/\\|?*\p{Cc}]/gu, "-");
      link.download = `${direction === "OUT" ? "delivery-note" : "goods-receipt"}-${safeNumber}.xlsx`;
      document.body.append(link);
      link.click();
      link.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (error) {
      console.error("[voucher xlsx export]", error);
      toast.error(t("Unable to create the Excel file."));
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

  if (loaded && loaded.direction !== direction) {
    return (
      <p role="alert" className="text-destructive text-sm">
        {t("This voucher belongs to the other voucher list.")}
      </p>
    );
  }

  return (
    <>
      {currentId && loading && !loaded ? <p className="text-muted-foreground text-sm">{t("Loading...")}</p> : null}
      <div className="no-print flex flex-col gap-6">
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
                <h1 className="text-3xl leading-none font-medium tracking-tight">
                  {direction === "OUT" ? t("Create goods issue") : t("Create goods receipt")}
                </h1>
                {loaded ? <VoucherStatusBadge status={loaded.status} /> : null}
              </div>
              <p className="text-muted-foreground text-sm">
                {t(
                  "Enter the document number, date, and item lines. Review the document before printing or exporting.",
                )}
              </p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
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

        <div className="grid gap-5 xl:grid-cols-2">
          <Card className="gap-0">
            <CardHeader>
              <CardTitle>{t("Voucher details")}</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-5">
              <FieldGroup className="grid gap-4 sm:grid-cols-2">
                <Field>
                  <FieldLabel htmlFor="voucher-type">{t("Voucher type")}</FieldLabel>
                  <Select
                    value={type}
                    onValueChange={(value) => changeType(value as VoucherType)}
                    disabled={!editable || itemsLoading}
                  >
                    <SelectTrigger id="voucher-type">
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
                  <FieldLabel htmlFor="voucher-date">{t("Voucher date")}</FieldLabel>
                  <CalendarDatePicker id="voucher-date" value={date} onChange={setDate} disabled={!editable} />
                </Field>
                <Field>
                  <FieldLabel htmlFor="voucher-document-number">{t("Voucher no.")}</FieldLabel>
                  <Input
                    id="voucher-document-number"
                    value={documentNumber}
                    onChange={(event) => setDocumentNumber(event.target.value)}
                    maxLength={100}
                    disabled={!editable}
                    placeholder="BD27/08-225"
                  />
                </Field>
              </FieldGroup>

              {editable ? (
                <div className="flex flex-wrap gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    disabled={itemsLoading}
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
                    <Plus data-icon="inline-start" />
                    {t("Add line")}
                  </Button>
                  <Button type="button" variant="outline" disabled={itemsLoading} onClick={() => setPasteOpen(true)}>
                    <ClipboardPaste data-icon="inline-start" />
                    {t("Paste from Excel")}
                  </Button>
                </div>
              ) : null}

              <div className="overflow-x-auto rounded-lg border">
                <Table className="min-w-[680px]">
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-12">{t("No.")}</TableHead>
                      <TableHead className="min-w-60">{t("Items")}</TableHead>
                      <TableHead className="w-20">{t("UoM")}</TableHead>
                      <TableHead className="w-32 text-right">{t("Quantity")}</TableHead>
                      <TableHead className="min-w-48">{t("Remark")}</TableHead>
                      {editable ? <TableHead className="w-12" /> : null}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {lines.map((line, index) => (
                      <TableRow key={line.key}>
                        <TableCell className="text-muted-foreground tabular-nums">{index + 1}</TableCell>
                        <TableCell>
                          {editable ? (
                            <ItemPicker
                              items={pickerItems}
                              value={line.itemId}
                              disabled={itemsLoading}
                              excludeIds={lines
                                .filter(
                                  (item): item is VoucherDocumentLine & { itemId: string } =>
                                    item.key !== line.key && Boolean(item.itemId),
                                )
                                .map((item) => item.itemId)}
                              onChange={(item) => patchLine(line.key, { itemId: item._id })}
                            />
                          ) : (
                            <span>
                              {line.itemId
                                ? `${itemById.get(line.itemId)?.code ?? ""} · ${itemById.get(line.itemId)?.name ?? ""}`
                                : ""}
                            </span>
                          )}
                        </TableCell>
                        <TableCell>{line.itemId ? itemById.get(line.itemId)?.unit : ""}</TableCell>
                        <TableCell className="text-right">
                          {editable ? (
                            <QtyInput
                              value={line.quantity}
                              onChange={(quantity) => patchLine(line.key, { quantity })}
                            />
                          ) : (
                            <span className="tabular-nums">{formatQty(line.quantity)}</span>
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
                            formatVoucherRemark(line)
                          )}
                        </TableCell>
                        {editable ? (
                          <TableCell>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon-sm"
                              aria-label={t("Delete line")}
                              onClick={() => setLines((current) => current.filter((item) => item.key !== line.key))}
                            >
                              <Trash2 />
                            </Button>
                          </TableCell>
                        ) : null}
                      </TableRow>
                    ))}
                    {lines.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={editable ? 6 : 5} className="text-muted-foreground h-20 text-center">
                          {t("No lines yet.")}
                        </TableCell>
                      </TableRow>
                    ) : null}
                    {lines.length > 0 ? (
                      <TableRow className="font-semibold">
                        <TableCell colSpan={3}>{t("TOTAL")}</TableCell>
                        <TableCell className="text-right tabular-nums">{formatQty(total)}</TableCell>
                        <TableCell colSpan={editable ? 2 : 1} />
                      </TableRow>
                    ) : null}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>

          <Card className="min-w-0 gap-0 py-0">
            <CardHeader className="items-center py-4">
              <CardTitle className="self-center">{t("Preview")}</CardTitle>
              <CardAction className="row-span-1 flex flex-wrap items-center justify-end gap-2 self-center">
                <Button
                  type="button"
                  variant="outline"
                  size="icon-sm"
                  aria-label={t("Zoom out")}
                  disabled={previewZoomStep === 0}
                  onClick={() => setPreviewZoomStep((current) => current - 1)}
                >
                  <ZoomOut data-icon="inline-start" />
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="icon-sm"
                  aria-label={t("Zoom in")}
                  disabled={previewZoomStep >= 6}
                  onClick={() => setPreviewZoomStep((current) => current + 1)}
                >
                  <ZoomIn data-icon="inline-start" />
                </Button>
                <Button type="button" variant="outline" size="sm" onClick={printDocument}>
                  <Printer data-icon="inline-start" />
                  {t("Print")}
                </Button>
                <Button type="button" variant="outline" size="sm" onClick={() => void downloadXlsx()}>
                  <Download data-icon="inline-start" />
                  {t("Download Excel")}
                </Button>
              </CardAction>
            </CardHeader>
            <CardContent
              data-voucher-preview
              ref={previewContainerRef}
              className="h-[calc(100svh-16rem)] overflow-auto rounded-b-xl bg-muted p-4"
            >
              <VoucherPaper
                direction={direction}
                documentNumber={documentNumber || loaded?.voucherNo || ""}
                date={date}
                lines={paperLines}
                previewZoom={previewZoom}
              />
            </CardContent>
          </Card>
        </div>
      </div>

      {mounted
        ? createPortal(
            <div data-print-root data-print-landscape>
              <VoucherPaper
                direction={direction}
                documentNumber={documentNumber || loaded?.voucherNo || ""}
                date={date}
                lines={paperLines}
              />
            </div>,
            document.body,
          )
        : null}

      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
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
        onConfirm={handleConfirm}
      />
      <PasteLinesDialog open={pasteOpen} onOpenChange={setPasteOpen} items={pickerItems} onApply={addPasted} />
    </>
  );
}

function sumQuantities(lines: VoucherDocumentLine[], itemById: ReadonlyMap<string, { unit: string }>) {
  const units = new Set(
    lines.flatMap((line) => (line.itemId ? [itemById.get(line.itemId)?.unit].filter((unit) => unit) : [])),
  );
  if (units.size > 1) return "";
  return lines
    .reduce((sum, line) => {
      if (!/^\d+(\.\d*)?$/.test(line.quantity)) return sum;
      return sum.plus(line.quantity);
    }, new Decimal(0))
    .toString();
}
