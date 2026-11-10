"use client";

import { useState } from "react";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";

import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Field, FieldError } from "@/components/ui/field";
import { Spinner } from "@/components/ui/spinner";
import { Textarea } from "@/components/ui/textarea";
import { useT } from "@/lib/i18n/provider";

type BaseProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  confirmLabel: string;
  destructive?: boolean;
};

const reasonSchema = z.object({ reason: z.string().trim().min(1, "Enter a reason (required)").max(500) });
type ReasonFormValues = z.infer<typeof reasonSchema>;

/** Confirmation that stays open while the (async) action runs */
export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel,
  destructive,
  onConfirm,
}: BaseProps & { onConfirm: () => Promise<void> }) {
  const t = useT();
  const [busy, setBusy] = useState(false);

  async function handleConfirm() {
    setBusy(true);
    try {
      await onConfirm();
    } finally {
      setBusy(false);
    }
  }

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          {description ? <AlertDialogDescription>{description}</AlertDialogDescription> : null}
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={busy}>{t("Cancel")}</AlertDialogCancel>
          <Button
            variant={destructive ? "destructive" : "default"}
            disabled={busy}
            onClick={() => void handleConfirm()}
          >
            {busy ? <Spinner /> : null}
            {confirmLabel}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

/** Confirmation that requires a written reason */
export function ReasonDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel,
  destructive,
  onConfirm,
}: BaseProps & { onConfirm: (reason: string) => Promise<void> }) {
  const t = useT();
  const form = useForm<ReasonFormValues>({
    resolver: zodResolver(reasonSchema),
    mode: "onChange",
    defaultValues: { reason: "" },
  });
  const { errors, isSubmitting, isValid } = form.formState;

  async function handleConfirm({ reason }: ReasonFormValues) {
    await onConfirm(reason);
    form.reset();
  }

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          {description ? <AlertDialogDescription>{description}</AlertDialogDescription> : null}
        </AlertDialogHeader>
        <form noValidate onSubmit={form.handleSubmit(handleConfirm)}>
          <Field data-invalid={!!errors.reason}>
            <Textarea
              maxLength={500}
              placeholder={t("Enter a reason (required)")}
              aria-invalid={!!errors.reason}
              {...form.register("reason")}
            />
            {errors.reason?.message ? <FieldError>{t(errors.reason.message)}</FieldError> : null}
          </Field>
          <AlertDialogFooter className="mt-4">
            <AlertDialogCancel type="button" disabled={isSubmitting}>
              {t("Close")}
            </AlertDialogCancel>
            <Button type="submit" variant={destructive ? "destructive" : "default"} disabled={isSubmitting || !isValid}>
              {isSubmitting ? <Spinner /> : null}
              {confirmLabel}
            </Button>
          </AlertDialogFooter>
        </form>
      </AlertDialogContent>
    </AlertDialog>
  );
}
