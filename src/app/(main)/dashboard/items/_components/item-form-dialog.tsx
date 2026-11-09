"use client";

import { useRef, useState } from "react";

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
import { formatPrice, parsePriceInput } from "@/lib/wms/format";
import type { ItemDTO } from "@/lib/wms/types";
import { createItemAction, updateItemAction } from "@/server/actions/items";

import { QtyInput } from "../../_components/wms/qty-input";

const blankToUndefined = (value: string) => (value.trim() === "" ? undefined : value.trim());
const ITEM_UNITS = ["BOTTLE", "BOX", "EA", "KG", "M", "PRODUCT", "ROLL", "SET", "TIN"];
const PRODUCTION_LINES = ["BIDET", "AL", "LW ASSY", "LW-BT"];

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
  const [spec, setSpec] = useState(item?.spec ?? "");
  const [productionLine, setProductionLine] = useState(item?.productionLine ?? "");
  const [price, setPrice] = useState(item?.price ?? "");
  const [type, setType] = useState<ItemType>(item?.type ?? "MATERIAL");
  const [unit, setUnit] = useState(item?.unit ?? "");
  const [decimalPlaces, setDecimalPlaces] = useState(String(item?.decimalPlaces ?? 0));
  const [minStock, setMinStock] = useState(item?.minStock ?? "0");
  const [exclude, setExclude] = useState(item?.excludeFromReconciliation ?? false);
  const [packSize, setPackSize] = useState(item?.packSize ?? "");
  const [note, setNote] = useState(item?.note ?? "");
  const [busy, setBusy] = useState(false);
  const priceInputRef = useRef<HTMLInputElement>(null);

  const canSubmit = code.trim() !== "" && name.trim() !== "" && unit.trim() !== "";

  async function submit() {
    setBusy(true);
    const payload = {
      code: code.trim(),
      name: name.trim(),
      spec: blankToUndefined(spec),
      productionLine: blankToUndefined(productionLine),
      price: blankToUndefined(price),
      type,
      unit: unit.trim(),
      decimalPlaces: Number(decimalPlaces),
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

          <Field>
            <FieldLabel htmlFor="item-spec">{t("Spec")}</FieldLabel>
            <Input id="item-spec" value={spec} onChange={(e) => setSpec(e.target.value)} maxLength={100} />
          </Field>

          <Field>
            <FieldLabel htmlFor="item-production-line">{t("Production line")}</FieldLabel>
            <Select value={productionLine} onValueChange={setProductionLine}>
              <SelectTrigger id="item-production-line" className="w-full">
                <SelectValue placeholder={t("Select production line")} />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  {PRODUCTION_LINES.map((value) => (
                    <SelectItem key={value} value={value}>
                      {value}
                    </SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>
          </Field>

          <div className="grid gap-4 sm:grid-cols-3">
            <Field>
              <FieldLabel htmlFor="item-unit">{t("Unit of measure *")}</FieldLabel>
              <Select value={unit} onValueChange={setUnit}>
                <SelectTrigger id="item-unit" className="w-full">
                  <SelectValue placeholder={t("Select unit")} />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    {ITEM_UNITS.map((value) => (
                      <SelectItem key={value} value={value}>
                        {value}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>
            </Field>
            <Field>
              <FieldLabel htmlFor="item-dp">{t("Decimal places")}</FieldLabel>
              <Select value={decimalPlaces} onValueChange={setDecimalPlaces}>
                <SelectTrigger id="item-dp" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    {Array.from({ length: 11 }, (_, n) => n).map((n) => (
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
              <FieldLabel htmlFor="item-price">{t("Price (VND)")}</FieldLabel>
              <Input
                id="item-price"
                inputMode="decimal"
                autoComplete="off"
                ref={priceInputRef}
                value={formatPrice(price)}
                onChange={(event) => {
                  const input = event.currentTarget.value;
                  const caret = event.currentTarget.selectionStart ?? input.length;
                  const nextPrice = parsePriceInput(input);
                  const nextCaret = formatPrice(parsePriceInput(input.slice(0, caret))).length;
                  setPrice(nextPrice);
                  requestAnimationFrame(() => priceInputRef.current?.setSelectionRange(nextCaret, nextCaret));
                }}
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
