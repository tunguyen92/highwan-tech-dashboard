"use client";

import { ClipboardPaste, Plus, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useT } from "@/lib/i18n/provider";
import { formatQty } from "@/lib/wms/format";
import type { ItemDTO } from "@/lib/wms/types";

import { ItemPicker } from "../../../_components/wms/item-picker";
import { tableClass } from "../../../_components/wms/page-card";
import { QtyInput } from "../../../_components/wms/qty-input";

export type BomEditorLine = {
  key: number;
  itemId: string | null;
  itemCode: string;
  itemName: string;
  unit: string;
  quantity: string;
  scrapPercent: string;
  note: string;
};

type BomEditorLinesProps = {
  lines: BomEditorLine[];
  rowKeys: string[];
  items: ItemDTO[];
  outputItemId: string;
  outputItemCode: string;
  editable: boolean;
  onAddLine: () => void;
  onOpenPaste: () => void;
  onPatchLine: (key: number, patch: Partial<BomEditorLine>) => void;
  onRemoveLine: (index: number) => void;
};

export function BomEditorLines({
  lines,
  rowKeys,
  items,
  outputItemId,
  outputItemCode,
  editable,
  onAddLine,
  onOpenPaste,
  onPatchLine,
  onRemoveLine,
}: BomEditorLinesProps) {
  const t = useT();
  const itemById = new Map(items.map((item) => [item._id, item]));
  const itemByCode = new Map(items.map((item) => [item.code, item]));

  return (
    <>
      {editable ? (
        <div className="flex flex-wrap gap-2 px-4">
          <Button variant="outline" size="sm" onClick={onAddLine}>
            <Plus /> {t("Add line")}
          </Button>
          <Button variant="outline" size="sm" onClick={onOpenPaste}>
            <ClipboardPaste /> {t("Paste from Excel")}
          </Button>
        </div>
      ) : null}

      <Table className={tableClass}>
        <TableHeader className="[&_tr]:border-t">
          <TableRow>
            <TableHead className="w-[38%]">{t("Components")}</TableHead>
            <TableHead className="w-36 text-right">{t("Qty / 1 unit")}</TableHead>
            <TableHead className="w-20">{t("UoM")}</TableHead>
            <TableHead className="w-32 text-right">{t("Allowed scrap (%)")}</TableHead>
            <TableHead>{t("Notes")}</TableHead>
            {editable ? <TableHead className="w-10" /> : null}
          </TableRow>
        </TableHeader>
        <TableBody>
          {lines.length === 0 ? (
            <TableRow>
              <TableCell colSpan={editable ? 6 : 5} className="text-muted-foreground h-24 text-center">
                {t("No components yet.")}
              </TableCell>
            </TableRow>
          ) : null}
          {lines.map((line, index) => {
            const item = (line.itemId ? itemById.get(line.itemId) : undefined) ?? itemByCode.get(line.itemCode);
            let placeholder: string | undefined;
            if (item) {
              placeholder = `${item.code} · ${item.name}`;
            } else if (line.itemCode) {
              placeholder = `${line.itemCode}${line.itemName ? ` · ${line.itemName}` : ""}`;
            }

            return (
              <TableRow key={rowKeys[index] ?? line.key}>
                <TableCell>
                  {editable ? (
                    <ItemPicker
                      items={items}
                      value={line.itemId}
                      placeholder={placeholder}
                      allowedTypes={["MATERIAL", "SEMI"]}
                      excludeIds={[
                        outputItemId,
                        ...lines
                          .filter(
                            (other): other is BomEditorLine & { itemId: string } =>
                              other.key !== line.key && Boolean(other.itemId),
                          )
                          .map((other) => other.itemId),
                      ]}
                      onChange={(picked) =>
                        onPatchLine(line.key, {
                          itemId: picked._id,
                          itemCode: picked.code,
                          itemName: picked.name,
                          unit: picked.unit,
                        })
                      }
                    />
                  ) : (
                    <span>
                      <span className="font-medium">{line.itemCode || item?.code}</span>
                      <span className="text-muted-foreground"> • {line.itemName || item?.name}</span>
                    </span>
                  )}
                </TableCell>
                <TableCell className="text-right">
                  {editable ? (
                    <QtyInput value={line.quantity} onChange={(value) => onPatchLine(line.key, { quantity: value })} />
                  ) : (
                    <span className="tabular-nums">{formatQty(line.quantity)}</span>
                  )}
                </TableCell>
                <TableCell>{line.unit || item?.unit}</TableCell>
                <TableCell className="text-right">
                  {editable ? (
                    <QtyInput
                      value={line.scrapPercent}
                      onChange={(value) => onPatchLine(line.key, { scrapPercent: value })}
                    />
                  ) : (
                    <span className="tabular-nums">{line.scrapPercent}</span>
                  )}
                </TableCell>
                <TableCell>
                  {editable ? (
                    <Input
                      value={line.note}
                      onChange={(event) => onPatchLine(line.key, { note: event.target.value })}
                      maxLength={300}
                    />
                  ) : (
                    <span className="text-muted-foreground">{line.note}</span>
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
      <p className="text-muted-foreground px-4 text-xs">{t("Quantity per 1 unit of {v}", { v: outputItemCode })}</p>
      <p className="text-muted-foreground px-4 text-xs">
        {t(
          "Each quantity is expressed in the component's own unit of measure. Allowed scrap is the threshold that keeps the reconciliation report from raising false alarms; leave 0 to use the general tolerance.",
        )}
      </p>
    </>
  );
}
