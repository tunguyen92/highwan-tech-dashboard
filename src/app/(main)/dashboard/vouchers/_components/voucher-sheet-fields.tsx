"use client";

import { CalendarDatePicker } from "@/components/calendar-date-picker";
import { Field, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useT } from "@/lib/i18n/provider";
import { VOUCHER_TYPE_LABEL, type VoucherType } from "@/lib/wms/constants";

export function VoucherSheetFields({
  type,
  date,
  documentNumber,
  note,
  voucherTypes,
  disabled,
  onTypeChange,
  onDateChange,
  onDocumentNumberChange,
  onNoteChange,
}: {
  type: VoucherType;
  date: string;
  documentNumber: string;
  note: string;
  voucherTypes: VoucherType[];
  disabled: boolean;
  onTypeChange: (type: VoucherType) => void;
  onDateChange: (date: string) => void;
  onDocumentNumberChange: (value: string) => void;
  onNoteChange: (value: string) => void;
}) {
  const t = useT();

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
      <Field>
        <FieldLabel htmlFor="v-type">{t("Voucher type")}</FieldLabel>
        <Select value={type} onValueChange={(value) => onTypeChange(value as VoucherType)} disabled={disabled}>
          <SelectTrigger id="v-type" className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectGroup>
              {voucherTypes.map((voucherType) => (
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
        <CalendarDatePicker id="v-date" value={date} onChange={onDateChange} disabled={disabled} />
      </Field>
      <Field>
        <FieldLabel htmlFor="v-document-number">{t("Voucher no.")}</FieldLabel>
        <Input
          id="v-document-number"
          value={documentNumber}
          disabled={disabled}
          maxLength={100}
          onChange={(event) => onDocumentNumberChange(event.target.value)}
        />
      </Field>
      <Field>
        <FieldLabel htmlFor="v-note">{t("Notes")}</FieldLabel>
        <Input
          id="v-note"
          value={note}
          disabled={disabled}
          maxLength={1000}
          onChange={(event) => onNoteChange(event.target.value)}
        />
      </Field>
    </div>
  );
}
