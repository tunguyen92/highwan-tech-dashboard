"use client";

import { useRef } from "react";

import { zodResolver } from "@hookform/resolvers/zod";
import { Controller, useForm, useWatch } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Spinner } from "@/components/ui/spinner";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { useT } from "@/lib/i18n/provider";
import { unwrapAs } from "@/lib/wms/action-client";
import { ITEM_TYPE_LABEL, type ItemType, isQuantityValidForUnit, QTY_MAX_DECIMAL_PLACES } from "@/lib/wms/constants";
import { formatPrice, parsePriceInput } from "@/lib/wms/format";
import type { ItemDTO } from "@/lib/wms/types";
import { createItemAction, updateItemAction } from "@/server/actions/items";

import { QtyInput } from "../../_components/wms/qty-input";
import { useCan } from "../../_components/wms/user-context";

const blankToUndefined = (value: string) => (value.trim() === "" ? undefined : value.trim());
const ITEM_UNITS = ["BOTTLE", "BOX", "EA", "KG", "M", "PRODUCT", "ROLL", "SET", "TIN"];
const PRODUCTION_LINES = ["BIDET", "AL", "LW ASSY", "LW-BT"];
const itemTypeValues = Object.keys(ITEM_TYPE_LABEL) as [ItemType, ...ItemType[]];
const quantityPattern = new RegExp(`^\\d+(\\.\\d{1,${QTY_MAX_DECIMAL_PLACES}})?$`);
const pricePattern = /^\d+(\.\d{1,2})?$/;

const itemFormSchema = z
  .object({
    code: z.string().trim().min(1, "Enter the code.").max(50),
    name: z.string().trim().min(1, "Enter the name.").max(200),
    spec: z.string().max(100),
    productionLine: z.string().max(100),
    price: z
      .string()
      .max(100)
      .refine((value) => value === "" || pricePattern.test(value), "Enter a price with up to 2 decimal places."),
    type: z.enum(itemTypeValues),
    unit: z.string().trim().min(1, "Select a unit.").max(20),
    minStock: z.string().refine((value) => value === "" || quantityPattern.test(value), "Enter a valid quantity."),
    exclude: z.boolean(),
    packSize: z.string().max(100),
    note: z.string().max(500),
  })
  .superRefine(({ unit, minStock }, ctx) => {
    if (minStock !== "" && quantityPattern.test(minStock) && !isQuantityValidForUnit(minStock, unit)) {
      ctx.addIssue({
        code: "custom",
        message: "Quantity has more decimal places than allowed",
        path: ["minStock"],
      });
    }
  });

type ItemFormValues = z.infer<typeof itemFormSchema>;

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
  const canManagePrice = useCan("item:price:read");
  const priceInputRef = useRef<HTMLInputElement>(null);
  const form = useForm<ItemFormValues>({
    resolver: zodResolver(itemFormSchema),
    mode: "onChange",
    defaultValues: {
      code: item?.code ?? "",
      name: item?.name ?? "",
      spec: item?.spec ?? "",
      productionLine: item?.productionLine ?? "",
      price: item?.price ?? "",
      type: item?.type ?? "MATERIAL",
      unit: item?.unit ?? "",
      minStock: item?.minStock ?? "0",
      exclude: item?.excludeFromReconciliation ?? false,
      packSize: item?.packSize ?? "",
      note: item?.note ?? "",
    },
  });
  const { errors, isSubmitting, isValid } = form.formState;
  const type = useWatch({ control: form.control, name: "type" });

  async function submit(values: ItemFormValues) {
    const payload = {
      code: values.code.trim(),
      name: values.name.trim(),
      spec: blankToUndefined(values.spec),
      productionLine: blankToUndefined(values.productionLine),
      ...(canManagePrice ? { price: blankToUndefined(values.price) } : {}),
      type: values.type,
      unit: values.unit.trim(),
      minStock: values.minStock === "" ? "0" : values.minStock,
      excludeFromReconciliation: values.exclude,
      packSize: blankToUndefined(values.packSize),
      note: blankToUndefined(values.note),
    };

    const result = await unwrapAs<unknown>(item ? updateItemAction(item._id, payload) : createItemAction(payload));
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
            {t("Code, type and unit are locked once the item has vouchers, stock transactions or a BOM.")}
          </DialogDescription>
        </DialogHeader>

        <form noValidate onSubmit={form.handleSubmit(submit)} className="flex flex-col gap-4">
          <FieldGroup className="gap-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field data-invalid={!!errors.code}>
                <FieldLabel htmlFor="item-code">{t("Code *")}</FieldLabel>
                <Input id="item-code" maxLength={50} aria-invalid={!!errors.code} {...form.register("code")} />
                {errors.code?.message ? <FieldError>{t(errors.code.message)}</FieldError> : null}
              </Field>
              <Controller
                control={form.control}
                name="type"
                render={({ field, fieldState }) => (
                  <Field data-invalid={fieldState.invalid}>
                    <FieldLabel htmlFor="item-type">{t("Type *")}</FieldLabel>
                    <Select name={field.name} value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger
                        id="item-type"
                        className="w-full"
                        ref={field.ref}
                        onBlur={field.onBlur}
                        aria-invalid={fieldState.invalid}
                      >
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
                    {fieldState.error?.message ? <FieldError>{t(fieldState.error.message)}</FieldError> : null}
                  </Field>
                )}
              />
            </div>

            <Field data-invalid={!!errors.name}>
              <FieldLabel htmlFor="item-name">{t("Name *")}</FieldLabel>
              <Input id="item-name" maxLength={200} aria-invalid={!!errors.name} {...form.register("name")} />
              {errors.name?.message ? <FieldError>{t(errors.name.message)}</FieldError> : null}
            </Field>

            <Field data-invalid={!!errors.spec}>
              <FieldLabel htmlFor="item-spec">{t("Spec")}</FieldLabel>
              <Input id="item-spec" maxLength={100} aria-invalid={!!errors.spec} {...form.register("spec")} />
              {errors.spec?.message ? <FieldError>{t(errors.spec.message)}</FieldError> : null}
            </Field>

            <Controller
              control={form.control}
              name="productionLine"
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor="item-production-line">{t("Production line")}</FieldLabel>
                  <Select name={field.name} value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger
                      id="item-production-line"
                      className="w-full"
                      ref={field.ref}
                      onBlur={field.onBlur}
                      aria-invalid={fieldState.invalid}
                    >
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
                  {fieldState.error?.message ? <FieldError>{t(fieldState.error.message)}</FieldError> : null}
                </Field>
              )}
            />

            <div className="grid gap-4 sm:grid-cols-2">
              <Controller
                control={form.control}
                name="unit"
                render={({ field, fieldState }) => (
                  <Field data-invalid={fieldState.invalid}>
                    <FieldLabel htmlFor="item-unit">{t("Unit of measure *")}</FieldLabel>
                    <Select name={field.name} value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger
                        id="item-unit"
                        className="w-full"
                        ref={field.ref}
                        onBlur={field.onBlur}
                        aria-invalid={fieldState.invalid}
                      >
                        <SelectValue placeholder={t("Select unit")} />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectGroup>
                          {ITEM_UNITS.map((value) => (
                            <SelectItem key={value} value={value}>
                              {t(value)}
                            </SelectItem>
                          ))}
                        </SelectGroup>
                      </SelectContent>
                    </Select>
                    {fieldState.error?.message ? <FieldError>{t(fieldState.error.message)}</FieldError> : null}
                  </Field>
                )}
              />
              <Controller
                control={form.control}
                name="minStock"
                render={({ field, fieldState }) => (
                  <Field data-invalid={fieldState.invalid}>
                    <FieldLabel htmlFor="item-min">{t("Minimum stock")}</FieldLabel>
                    <QtyInput
                      id="item-min"
                      ref={field.ref}
                      value={field.value}
                      onChange={field.onChange}
                      onBlur={field.onBlur}
                      disabled={type === "SEMI"}
                      aria-invalid={fieldState.invalid}
                    />
                    {fieldState.error?.message ? <FieldError>{t(fieldState.error.message)}</FieldError> : null}
                  </Field>
                )}
              />
            </div>
            {type === "SEMI" ? (
              <FieldDescription>
                {t("Semi-finished items are not stocked: they only serve as an intermediate level in a BOM.")}
              </FieldDescription>
            ) : (
              <FieldDescription>
                {t("Only M and KG units accept fractional quantities; all other units must be whole numbers.")}
              </FieldDescription>
            )}

            <div className={canManagePrice ? "grid gap-4 sm:grid-cols-2" : "grid gap-4"}>
              {canManagePrice ? (
                <Controller
                  control={form.control}
                  name="price"
                  render={({ field, fieldState }) => (
                    <Field data-invalid={fieldState.invalid}>
                      <FieldLabel htmlFor="item-price">{t("Price (VND)")}</FieldLabel>
                      <Input
                        id="item-price"
                        inputMode="decimal"
                        autoComplete="off"
                        maxLength={100}
                        ref={(element) => {
                          field.ref(element);
                          priceInputRef.current = element;
                        }}
                        value={formatPrice(field.value)}
                        onBlur={field.onBlur}
                        onChange={(event) => {
                          const input = event.currentTarget.value;
                          const caret = event.currentTarget.selectionStart ?? input.length;
                          const nextPrice = parsePriceInput(input);
                          const nextCaret = formatPrice(parsePriceInput(input.slice(0, caret))).length;
                          field.onChange(nextPrice);
                          requestAnimationFrame(() => priceInputRef.current?.setSelectionRange(nextCaret, nextCaret));
                        }}
                        aria-invalid={fieldState.invalid}
                      />
                      {fieldState.error?.message ? <FieldError>{t(fieldState.error.message)}</FieldError> : null}
                    </Field>
                  )}
                />
              ) : null}
              <Field data-invalid={!!errors.packSize}>
                <FieldLabel htmlFor="item-pack">{t("Packaging (reference only)")}</FieldLabel>
                <Input
                  id="item-pack"
                  maxLength={100}
                  placeholder={t("e.g. box of 20 pieces")}
                  aria-invalid={!!errors.packSize}
                  {...form.register("packSize")}
                />
                {errors.packSize?.message ? <FieldError>{t(errors.packSize.message)}</FieldError> : null}
              </Field>
            </div>

            <Controller
              control={form.control}
              name="exclude"
              render={({ field, fieldState }) => (
                <Field orientation="horizontal" data-invalid={fieldState.invalid}>
                  <Switch
                    id="item-exclude"
                    name={field.name}
                    checked={field.value}
                    onCheckedChange={field.onChange}
                    onBlur={field.onBlur}
                    aria-invalid={fieldState.invalid}
                  />
                  <FieldLabel htmlFor="item-exclude" className="font-normal">
                    {t("Exclude from BOM reconciliation (glue, solder, small consumables)")}
                  </FieldLabel>
                  {fieldState.error?.message ? <FieldError>{t(fieldState.error.message)}</FieldError> : null}
                </Field>
              )}
            />

            <Field data-invalid={!!errors.note}>
              <FieldLabel htmlFor="item-note">{t("Notes")}</FieldLabel>
              <Textarea id="item-note" maxLength={500} aria-invalid={!!errors.note} {...form.register("note")} />
              {errors.note?.message ? <FieldError>{t(errors.note.message)}</FieldError> : null}
            </Field>
          </FieldGroup>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting}>
              {t("Close")}
            </Button>
            <Button type="submit" disabled={isSubmitting || !isValid}>
              {isSubmitting ? <Spinner /> : null}
              {t("Save")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
