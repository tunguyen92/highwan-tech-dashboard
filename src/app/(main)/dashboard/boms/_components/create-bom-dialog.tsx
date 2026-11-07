"use client";

import { useState } from "react";

import { useRouter } from "next/navigation";

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
import { Field, FieldLabel } from "@/components/ui/field";
import { Spinner } from "@/components/ui/spinner";
import { useT } from "@/lib/i18n/provider";
import { unwrapAs } from "@/lib/wms/action-client";
import type { ItemDTO } from "@/lib/wms/types";
import { createBomDraftAction } from "@/server/actions/boms";

import { ItemPicker } from "../../_components/wms/item-picker";

/** Starts an empty draft BOM for a finished product or a semi-finished item, then opens the editor */
export function CreateBomDialog({
  open,
  onOpenChange,
  items,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  items: ItemDTO[];
}) {
  const t = useT();
  const router = useRouter();
  const [itemId, setItemId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function create() {
    if (!itemId) return;
    setBusy(true);
    const result = await unwrapAs<{ id: string }>(createBomDraftAction(itemId, []));
    setBusy(false);
    if (result) {
      toast.success(t("Draft created. Now add the components."));
      onOpenChange(false);
      router.push(`/dashboard/boms/${result.id}`);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t("Create BOM")}</DialogTitle>
          <DialogDescription>
            {t(
              'Choose the finished or semi-finished item that needs a BOM. If the code already has an active BOM, open it and choose "Create new version."',
            )}
          </DialogDescription>
        </DialogHeader>
        <Field>
          <FieldLabel>{t("Finished / semi-finished item")}</FieldLabel>
          <ItemPicker
            items={items}
            value={itemId}
            allowedTypes={["PRODUCT", "SEMI"]}
            onChange={(item) => setItemId(item._id)}
          />
        </Field>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={busy}>
            {t("Close")}
          </Button>
          <Button onClick={() => void create()} disabled={!itemId || busy}>
            {busy ? <Spinner /> : null}
            {t("Create draft")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
