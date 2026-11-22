"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, useWatch } from "react-hook-form";
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
import { Textarea } from "@/components/ui/textarea";
import { useT } from "@/lib/i18n/provider";
import { sanitizeQty } from "@/lib/wms/format";
import type { ItemDTO } from "@/lib/wms/types";

const pasteLinesSchema = z.object({ text: z.string() });
type PasteLinesFormValues = z.infer<typeof pasteLinesSchema>;

export type PastedRow = { item: ItemDTO; quantity: string };

/**
 * Paste many lines from Excel: one "code<TAB>quantity" per line (spaces, ";" or "," also work).
 * Only items in `items` are recognised, so the caller decides which item types are allowed.
 */
export function PasteLinesDialog({
  open,
  onOpenChange,
  items,
  onApply,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  items: ItemDTO[];
  onApply: (rows: PastedRow[]) => void;
}) {
  const t = useT();
  const form = useForm<PasteLinesFormValues>({
    resolver: zodResolver(pasteLinesSchema),
    defaultValues: { text: "" },
  });
  const text = useWatch({ control: form.control, name: "text" });

  function apply({ text }: PasteLinesFormValues) {
    const byCode = new Map(items.map((item) => [item.code.toUpperCase(), item]));
    const rows: PastedRow[] = [];
    const unknown: string[] = [];

    for (const raw of text.split(/\r?\n/)) {
      const line = raw.trim();
      if (!line) continue;
      const match = line.match(/^([^\s,;]+)[\s,;]+([\d.,]+)$/);
      const item = match ? byCode.get(match[1].trim().toUpperCase()) : undefined;
      const quantity = match ? sanitizeQty(match[2]) : "";
      if (item && quantity !== "" && Number(quantity) > 0) rows.push({ item, quantity });
      else unknown.push(line);
    }

    if (rows.length > 0) onApply(rows);
    if (unknown.length > 0) {
      const sample = `${unknown.slice(0, 3).join(" | ")}${unknown.length > 3 ? "..." : ""}`;
      toast.warning(t("Skipped {count} unrecognized line(s): {sample}", { count: unknown.length, sample }));
    }

    if (rows.length > 0) {
      form.reset();
      onOpenChange(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{t("Paste multiple lines from Excel")}</DialogTitle>
          <DialogDescription>
            {t("Each line has an item code and a quantity, for example")} <code>R1 500</code>
            {t(". Duplicate codes are added to the existing line.")}
          </DialogDescription>
        </DialogHeader>
        <form noValidate onSubmit={form.handleSubmit(apply)}>
          <Textarea {...form.register("text")} className="min-h-48 font-mono" placeholder={"R1\tt500\nnW1\tt50,5"} />
          <DialogFooter className="mt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              {t("Close")}
            </Button>
            <Button type="submit" disabled={text.trim() === ""}>
              {t("Add to list")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
