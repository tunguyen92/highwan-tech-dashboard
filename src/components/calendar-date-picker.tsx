"use client";

import * as React from "react";

import { format, parseISO } from "date-fns";
import { CalendarIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

interface CalendarDatePickerProps {
  id: string;
  value: string;
  onChange: (value: string) => void;
  type?: "date" | "month";
  min?: string;
  max?: string;
  disabled?: boolean;
  clearable?: boolean;
}

export function CalendarDatePicker({
  id,
  value,
  onChange,
  type = "date",
  min,
  max,
  disabled = false,
  clearable = false,
}: CalendarDatePickerProps) {
  const [open, setOpen] = React.useState(false);
  const date = parseDateValue(value, type);
  const minDate = min ? parseDateValue(min, type) : undefined;
  const maxDate = max ? parseDateValue(max, type) : undefined;
  const disabledDates = [...(minDate ? [{ before: minDate }] : []), ...(maxDate ? [{ after: maxDate }] : [])];

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          id={id}
          variant="outline"
          disabled={disabled}
          data-empty={!date}
          className="data-[empty=true]:text-muted-foreground w-full justify-between text-left font-normal"
        >
          {date ? format(date, "dd/MM/yyyy") : <span>Pick a date</span>}
          <CalendarIcon className="text-muted-foreground" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="single"
          selected={date}
          onSelect={(selectedDate) => {
            if (!selectedDate) return;

            onChange(format(selectedDate, type === "month" ? "yyyy-MM" : "yyyy-MM-dd"));
            setOpen(false);
          }}
          defaultMonth={date}
          disabled={disabledDates}
        />
        {clearable && date ? (
          <div className="flex justify-end border-t p-2">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => {
                onChange("");
                setOpen(false);
              }}
            >
              Clear
            </Button>
          </div>
        ) : null}
      </PopoverContent>
    </Popover>
  );
}

function parseDateValue(value: string, type: "date" | "month") {
  const date = parseISO(type === "month" ? `${value}-01` : value);

  return Number.isNaN(date.getTime()) ? undefined : date;
}
