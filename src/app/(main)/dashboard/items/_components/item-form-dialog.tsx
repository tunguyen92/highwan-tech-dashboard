"use client";

import { useState } from "react";

import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Field, FieldDescription, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Spinner } from "@/components/ui/spinner";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { useT } from "@/lib/i18n/provider";
import { unwrapAs } from "@/lib/wms/action-client";
import { ITEM_TYPE_LABEL, type ItemType } from "@/lib/wms/constants";
import type { ItemDTO } from "@/lib/wms/types";
import { createItemAction, updateItemAction } from "@/server/actions/items";

import { QtyInput } from "../../_components/wms/qty-input";

const blankToUndefined = (value: string) => (value.trim() === "" ? undefined : value.trim());

/** Create / edit one item. Mounted with a `key`, so its state always starts from the given item. */
export function ItemFormDialog({
  item,
  onClose,
  onSaved,
}: {
  item: ItemDTO | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const t = useT();
  const [code, setCode] = useState(item?.code ?? "");
  const [name, setName] = useState(item?.name ?? "");
  const [type, setType] = useState<ItemType>(item?.type ?? "MATERIAL");
  const [unit, setUnit] = useState(item?.unit ?? "");
  const [decimalPlaces, setDecimalPlaces] = useState(String(item?.decimalPlaces ?? 0));
  const [group, setGroup] = useState(item?.group ?? "");
  const [minStock, setMinStock] = useState(item?.minStock ?? "0");
  const [exclude, setExclude] = useState(item?.excludeFromReconciliation ?? false);
  const [packSize, setPackSize] = useState(item?.packSize ?? "");
  const [note, setNote] = useState(item?.note ?? "");
  const [busy, setBusy] = useState(false);

  const canSubmit = code.trim() !== "" && name.trim() !== "" && unit.trim() !== "";

  async function submit() {
    setBusy(true);
    const payload = {
      code: code.trim(),
      name: name.trim(),
      type,
      unit: unit.trim(),
      decimalPlaces: Number(decimalPlaces),
      group: blankToUndefined(group),
      minStock: minStock === "" ? "0" : minStock,
      excludeFromReconciliation: exclude,
      packSize: blankToUndefined(packSize),
      note: blankToUndefined(note),
    };

    const result = await unwrapAs<unknown>(item ? updateItemAction(item._id, payload) : createItemAction(payload));
    setBusy(false);
    if (result !== null) {
      toast.success(item ? t("Item saved.") : t("Item added."));
      onSaved();
    }
  }

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>{item ? t("Edit item {code}", { code: item.code }) : t("Add item")}</DialogTitle>
          <DialogDescription>
            {t(
              "Code, type, unit and decimal places are locked once the item has vouchers, stock transactions or a BOM.",
            )}
          </DialogDescription>
        </DialogHeader>

        <FieldGroup className="gap-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field>
              <FieldLabel htmlFor="item-code">{t("Code *")}</FieldLabel>
              <Input id="item-code" value={code} onChange={(e) => setCode(e.target.value)} maxLength={50} />
            </Field>
            <Field>
              <FieldLabel htmlFor="item-type">{t("Type *")}</FieldLabel>
              <Select value={type} onValueChange={(value) => setType(value as ItemType)}>
                <SelectTrigger id="item-type" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    {(Object.keys(ITEM_TYPE_LABEL) as ItemType[]).map((key) => (
                      <SelectItem key={key} value={key}>
                        {t(ITEM_TYPE_LABEL[key])}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>
            </Field>
          </div>

          <Field>
            <FieldLabel htmlFor="item-name">{t("Name *")}</FieldLabel>
            <Input id="item-name" value={name} onChange={(e) => setName(e.target.value)} maxLength={200} />
          </Field>

          <div className="grid gap-4 sm:grid-cols-3">
            <Field>
              <FieldLabel htmlFor="item-unit">{t("Unit of measure *")}</FieldLabel>
              <Input id="item-unit" value={unit} onChange={(e) => setUnit(e.target.value)} maxLength={20} />
            </Field>
            <Field>
              <FieldLabel htmlFor="item-dp">{t("Decimal places")}</FieldLabel>
              <Select value={decimalPlaces} onValueChange={setDecimalPlaces}>
                <SelectTrigger id="item-dp" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    {[0, 1, 2, 3, 4].map((n) => (
                      <SelectItem key={n} value={String(n)}>
                        {n === 0 ? t("0 (whole numbers)") : t("{n} digit(s)", { n })}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>
            </Field>
            <Field>
              <FieldLabel htmlFor="item-min">{t("Minimum stock")}</FieldLabel>
              <QtyInput id="item-min" value={minStock} onChange={setMinStock} disabled={type === "SEMI"} />
            </Field>
          </div>
          {type === "SEMI" ? (
            <FieldDescription>
              {t("Semi-finished items are not stocked: they only serve as an intermediate level in a BOM.")}
            </FieldDescription>
          ) : (
            <FieldDescription>
              {t(
                "Each item has a single unit used for BOMs, vouchers and stock. For wire measured in meters, choose 2 decimal places.",
              )}
            </FieldDescription>
          )}

          <div className="grid gap-4 sm:grid-cols-2">
            <Field>
              <FieldLabel htmlFor="item-group">{t("Group")}</FieldLabel>
              <Input
                id="item-group"
                value={group}
                onChange={(e) => setGroup(e.target.value)}
                placeholder={t("e.g. Resistors, ICs, Wires")}
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="item-pack">{t("Packaging (reference only)")}</FieldLabel>
              <Input
                id="item-pack"
                value={packSize}
                onChange={(e) => setPackSize(e.target.value)}
                placeholder={t("e.g. 100 m reel")}
              />
            </Field>
          </div>

          <Field orientation="horizontal">
            <Switch id="item-exclude" checked={exclude} onCheckedChange={setExclude} />
            <FieldLabel htmlFor="item-exclude" className="font-normal">
              {t("Exclude from BOM reconciliation (glue, solder, small consumables)")}
            </FieldLabel>
          </Field>

          <Field>
            <FieldLabel htmlFor="item-note">{t("Notes")}</FieldLabel>
            <Textarea id="item-note" value={note} onChange={(e) => setNote(e.target.value)} maxLength={500} />
          </Field>
        </FieldGroup>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={busy}>
            {t("Close")}
          </Button>
          <Button onClick={() => void submit()} disabled={busy || !canSubmit}>
            {busy ? <Spinner /> : null}
            {t("Save")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
