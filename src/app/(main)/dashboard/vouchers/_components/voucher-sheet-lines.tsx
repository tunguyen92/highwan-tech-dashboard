"use client";

import { ClipboardPaste, Plus, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useT } from "@/lib/i18n/provider";
import { VOUCHER_REMARK_UNIT, type VoucherRemarkUnit } from "@/lib/wms/constants";
import { formatQty } from "@/lib/wms/format";
import type { ItemDTO } from "@/lib/wms/types";

import { ItemPicker } from "../../_components/wms/item-picker";
import { tableClass } from "../../_components/wms/page-card";
import { QtyInput } from "../../_components/wms/qty-input";

export type VoucherSheetLine = {
  itemId: string | null;
  quantity: string;
  remarkQuantity: string;
  remarkUnit: VoucherRemarkUnit;
  note: string;
};

export function VoucherSheetLines({
  lines,
  fieldIds,
  pickerItems,
  itemById,
  editable,
  onAddLine,
  onOpenPaste,
  onPatchLine,
  onRemoveLine,
}: {
  lines: VoucherSheetLine[];
  fieldIds: string[];
  pickerItems: ItemDTO[];
  itemById: Map<string, ItemDTO>;
  editable: boolean;
  onAddLine: () => void;
  onOpenPaste: () => void;
  onPatchLine: (index: number, patch: Partial<VoucherSheetLine>) => void;
  onRemoveLine: (index: number) => void;
}) {
  const t = useT();

  return (
    <>
      {editable ? (
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" onClick={onAddLine}>
            <Plus /> {t("Add line")}
          </Button>
          <Button variant="outline" size="sm" onClick={onOpenPaste}>
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
              <TableHead>{t("Notes")}</TableHead>
              <TableHead className="w-48">{t("Remark")}</TableHead>
              {editable ? <TableHead className="w-10" /> : null}
            </TableRow>
          </TableHeader>
          <TableBody>
            {lines.length === 0 ? (
              <TableRow>
                <TableCell colSpan={editable ? 7 : 6} className="text-muted-foreground h-20 text-center">
                  {t("No lines yet.")}
                </TableCell>
              </TableRow>
            ) : null}
            {lines.map((line, index) => {
              const item = line.itemId ? itemById.get(line.itemId) : undefined;
              return (
                <TableRow key={fieldIds[index]}>
                  <TableCell className="text-muted-foreground tabular-nums">{index + 1}</TableCell>
                  <TableCell>
                    {editable ? (
                      <ItemPicker
                        items={pickerItems}
                        value={line.itemId}
                        excludeIds={lines
                          .filter((_, otherIndex) => otherIndex !== index)
                          .filter((other) => other.itemId)
                          .map((other) => other.itemId as string)}
                        onChange={(picked) => onPatchLine(index, { itemId: picked._id })}
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
                      <QtyInput value={line.quantity} onChange={(value) => onPatchLine(index, { quantity: value })} />
                    ) : (
                      <span className="font-medium tabular-nums">{formatQty(line.quantity)}</span>
                    )}
                  </TableCell>
                  <TableCell>
                    {editable ? (
                      <Input
                        value={line.note}
                        maxLength={300}
                        onChange={(event) => onPatchLine(index, { note: event.target.value })}
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
                          onChange={(remarkQuantity) => onPatchLine(index, { remarkQuantity })}
                        />
                        <Select
                          value={line.remarkUnit}
                          onValueChange={(value) => onPatchLine(index, { remarkUnit: value as VoucherRemarkUnit })}
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
                        onClick={() => onRemoveLine(index)}
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
    </>
  );
}
