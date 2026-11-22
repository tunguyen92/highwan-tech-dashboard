"use client";

import type { ComponentProps } from "react";

import { Input } from "@/components/ui/input";
import { sanitizeQty } from "@/lib/wms/format";

type QtyInputProps = Omit<ComponentProps<typeof Input>, "value" | "onChange"> & {
  value: string;
  onChange: (value: string) => void;
};

/** Text input for exact decimal quantities. Keeps the value as a string to avoid float errors. */
export function QtyInput({ value, onChange, className, ...props }: QtyInputProps) {
  return (
    <Input
      {...props}
      inputMode="decimal"
      autoComplete="off"
      value={value}
      onChange={(event) => onChange(sanitizeQty(event.target.value))}
      className={`text-right tabular-nums ${className ?? ""}`}
    />
  );
}
