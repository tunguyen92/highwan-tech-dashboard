"use client";

import { useState } from "react";

import { Check, ChevronsUpDown } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useT } from "@/lib/i18n/provider";
import { ITEM_TYPE_LABEL, type ItemType } from "@/lib/wms/constants";
import type { ItemDTO } from "@/lib/wms/types";

type ItemPickerProps = {
  items: ItemDTO[];
  value: string | null;
  onChange: (item: ItemDTO) => void;
  /** Restrict the choices to these item types */
  allowedTypes?: ItemType[];
  /** Hide these item ids (e.g. the BOM's own output item) */
  excludeIds?: string[];
  placeholder?: string;
  disabled?: boolean;
  className?: string;
};

export function ItemPicker({
  items,
  value,
  onChange,
  allowedTypes,
  excludeIds,
  placeholder,
  disabled,
  className,
}: ItemPickerProps) {
  const t = useT();
  const [open, setOpen] = useState(false);
  const options = items.filter(
    (item) => (!allowedTypes || allowedTypes.includes(item.type)) && !excludeIds?.includes(item._id),
  );
  const selected = items.find((item) => item._id === value);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          role="combobox"
          aria-expanded={open}
          disabled={disabled}
          className={`w-full justify-between font-normal ${className ?? ""}`}
        >
          <span className="truncate">
            {selected ? (
              <>
                <span className="font-medium">{selected.code}</span>
                <span className="text-muted-foreground"> · {selected.name}</span>
              </>
            ) : (
              <span className="text-muted-foreground">{placeholder ?? t("Select an item...")}</span>
            )}
          </span>
          <ChevronsUpDown className="opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[min(380px,90vw)] p-0" align="start">
        <Command>
          <CommandInput placeholder={t("Search by code or name...")} />
          <CommandList>
            <CommandEmpty>{t("No item found.")}</CommandEmpty>
            <CommandGroup>
              {options.map((item) => (
                <CommandItem
                  key={item._id}
                  value={`${item.code} ${item.name}`}
                  onSelect={() => {
                    onChange(item);
                    setOpen(false);
                  }}
                >
                  <Check className={item._id === value ? "opacity-100" : "opacity-0"} />
                  <div className="grid min-w-0 flex-1">
                    <span className="truncate font-medium">{item.code}</span>
                    <span className="text-muted-foreground truncate text-xs">
                      {item.name} · {item.unit} · {t(ITEM_TYPE_LABEL[item.type])}
                    </span>
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
