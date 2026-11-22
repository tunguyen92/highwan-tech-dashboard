"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { useT } from "@/lib/i18n/provider";
import { unwrapAs } from "@/lib/wms/action-client";
import { ROLE_LABEL } from "@/lib/wms/constants";
import { changeOwnPasswordAction } from "@/server/actions/auth";

import { PageCard } from "../../_components/wms/page-card";
import { useWmsUser } from "../../_components/wms/user-context";

const passwordFormSchema = z
  .object({
    current: z.string().min(1, "Enter the current password.").max(72),
    next: z.string().min(8, "At least 8 characters.").max(72),
    confirm: z.string().min(1, "Enter the confirmation password.").max(72),
  })
  .refine((data) => data.next === data.confirm, {
    message: "The passwords do not match.",
    path: ["confirm"],
  });

type PasswordFormValues = z.infer<typeof passwordFormSchema>;

export function AccountScreen() {
  const t = useT();
  const user = useWmsUser();
  const form = useForm<PasswordFormValues>({
    resolver: zodResolver(passwordFormSchema),
    mode: "onChange",
    defaultValues: { current: "", next: "", confirm: "" },
  });
  const { errors, isSubmitting, isValid } = form.formState;

  async function submit({ current, next }: PasswordFormValues) {
    const result = await unwrapAs<unknown>(changeOwnPasswordAction({ current, next }));
    if (result !== null) {
      toast.success(t("Password changed. Other devices have been signed out."));
      form.reset();
    }
  }

  return (
    <PageCard title={t("Account")} description={`${user.name} • ${user.username} • ${t(ROLE_LABEL[user.role])}`}>
      <div className="max-w-md px-4">
        <form noValidate onSubmit={form.handleSubmit(submit)}>
          <FieldGroup className="gap-4">
            <Field data-invalid={!!errors.current}>
              <FieldLabel htmlFor="pw-current">{t("Current password")}</FieldLabel>
              <Input
                id="pw-current"
                type="password"
                autoComplete="current-password"
                aria-invalid={!!errors.current}
                {...form.register("current")}
              />
              {errors.current?.message ? <FieldError>{t(errors.current.message)}</FieldError> : null}
            </Field>
            <Field data-invalid={!!errors.next}>
              <FieldLabel htmlFor="pw-next">{t("New password")}</FieldLabel>
              <Input
                id="pw-next"
                type="password"
                autoComplete="new-password"
                aria-invalid={!!errors.next}
                {...form.register("next")}
              />
              <FieldDescription>{t("At least 8 characters.")}</FieldDescription>
              {errors.next?.message ? <FieldError>{t(errors.next.message)}</FieldError> : null}
            </Field>
            <Field data-invalid={!!errors.confirm}>
              <FieldLabel htmlFor="pw-confirm">{t("Confirm new password")}</FieldLabel>
              <Input
                id="pw-confirm"
                type="password"
                autoComplete="new-password"
                aria-invalid={!!errors.confirm}
                {...form.register("confirm")}
              />
              {errors.confirm?.message ? <FieldError>{t(errors.confirm.message)}</FieldError> : null}
            </Field>
            <Button className="w-fit" type="submit" disabled={isSubmitting || !isValid}>
              {isSubmitting ? <Spinner /> : null}
              {t("Change password")}
            </Button>
          </FieldGroup>
        </form>
      </div>
    </PageCard>
  );
}
