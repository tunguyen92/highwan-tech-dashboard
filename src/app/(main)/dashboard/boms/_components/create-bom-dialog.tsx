"use client";

import { useRouter } from "next/navigation";

import { zodResolver } from "@hookform/resolvers/zod";
import { Controller, useForm } from "react-hook-form";
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
import { Field, FieldError, FieldLabel } from "@/components/ui/field";
import { Spinner } from "@/components/ui/spinner";
import { useT } from "@/lib/i18n/provider";
import { unwrapAs } from "@/lib/wms/action-client";
import type { ItemDTO } from "@/lib/wms/types";
import { createBomDraftAction } from "@/server/actions/boms";

import { ItemPicker } from "../../_components/wms/item-picker";

const createBomFormSchema = z.object({ itemId: z.string().min(1, "Select an item.") });
type CreateBomFormValues = z.infer<typeof createBomFormSchema>;

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
  const form = useForm<CreateBomFormValues>({
    resolver: zodResolver(createBomFormSchema),
    mode: "onChange",
    defaultValues: { itemId: "" },
  });
  const { isSubmitting, isValid } = form.formState;

  async function create({ itemId }: CreateBomFormValues) {
    const result = await unwrapAs<{ id: string }>(createBomDraftAction(itemId, []));
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
              'Choose the finished or semi-finished item that needs a BOM. If the code already has an active BOM, open it and choose "Create new version".',
            )}
          </DialogDescription>
        </DialogHeader>
        <form noValidate onSubmit={form.handleSubmit(create)} className="flex flex-col gap-4">
          <Controller
            control={form.control}
            name="itemId"
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid}>
                <FieldLabel>{t("Finished / semi-finished item")}</FieldLabel>
                <ItemPicker
                  items={items}
                  value={field.value || null}
                  allowedTypes={["PRODUCT", "SEMI"]}
                  disabled={isSubmitting}
                  onChange={(item) => field.onChange(item._id)}
                />
                {fieldState.error?.message ? <FieldError>{t(fieldState.error.message)}</FieldError> : null}
              </Field>
            )}
          />
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
              {t("Close")}
            </Button>
            <Button type="submit" disabled={isSubmitting || !isValid}>
              {isSubmitting ? <Spinner /> : null}
              {t("Create draft")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
