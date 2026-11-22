"use client";

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
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Spinner } from "@/components/ui/spinner";
import { Switch } from "@/components/ui/switch";
import { useT } from "@/lib/i18n/provider";
import { unwrapAs } from "@/lib/wms/action-client";
import { ROLE_LABEL, type Role } from "@/lib/wms/constants";
import type { UserDTO } from "@/lib/wms/types";
import { createUserAction, resetPasswordAction, updateUserAction } from "@/server/actions/users";

const roleValues = Object.keys(ROLE_LABEL) as [Role, ...Role[]];
const createUserSchema = z.object({
  username: z
    .string()
    .trim()
    .min(3, "Letters, digits, dots, hyphens, underscores. At least 3 characters.")
    .max(50)
    .regex(/^[a-zA-Z0-9._-]+$/, "Letters, digits, dots, hyphens, underscores. At least 3 characters."),
  name: z.string().trim().min(1, "Enter a full name.").max(100),
  role: z.enum(roleValues),
  password: z.string().min(8, "At least 8 characters.").max(72),
});

type CreateUserFormValues = z.infer<typeof createUserSchema>;
const editUserSchema = z.object({ role: z.enum(roleValues), isActive: z.boolean() });
type EditUserFormValues = z.infer<typeof editUserSchema>;

function RoleSelect({ value, onChange, id }: { value: Role; onChange: (role: Role) => void; id: string }) {
  const t = useT();
  return (
    <Select value={value} onValueChange={(next) => onChange(next as Role)}>
      <SelectTrigger id={id} className="w-full">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectGroup>
          {(Object.keys(ROLE_LABEL) as Role[]).map((role) => (
            <SelectItem key={role} value={role}>
              {t(ROLE_LABEL[role])}
            </SelectItem>
          ))}
        </SelectGroup>
      </SelectContent>
    </Select>
  );
}

export function CreateUserDialog({ onClose, onSaved }: { onClose: () => void; onSaved: () => void }) {
  const t = useT();
  const form = useForm<CreateUserFormValues>({
    resolver: zodResolver(createUserSchema),
    mode: "onChange",
    defaultValues: { username: "", name: "", role: "STOREKEEPER", password: "" },
  });
  const { errors, isSubmitting, isValid } = form.formState;

  async function submit(values: CreateUserFormValues) {
    const result = await unwrapAs<unknown>(createUserAction(values));
    if (result) {
      toast.success(t("User created."));
      onSaved();
    }
  }

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t("Add user")}</DialogTitle>
          <DialogDescription>{t("The user should change the password at the first sign-in.")}</DialogDescription>
        </DialogHeader>
        <form noValidate onSubmit={form.handleSubmit(submit)} className="flex flex-col gap-4">
          <FieldGroup className="gap-4">
            <Field data-invalid={!!errors.username}>
              <FieldLabel htmlFor="u-username">{t("Username")}</FieldLabel>
              <Input
                id="u-username"
                autoComplete="off"
                aria-invalid={!!errors.username}
                {...form.register("username")}
              />
              <FieldDescription>
                {t("Letters, digits, dots, hyphens, underscores. At least 3 characters.")}
              </FieldDescription>
              {errors.username?.message ? <FieldError>{t(errors.username.message)}</FieldError> : null}
            </Field>
            <Field data-invalid={!!errors.name}>
              <FieldLabel htmlFor="u-name">{t("Full name")}</FieldLabel>
              <Input id="u-name" aria-invalid={!!errors.name} {...form.register("name")} />
              {errors.name?.message ? <FieldError>{t(errors.name.message)}</FieldError> : null}
            </Field>
            <Field>
              <FieldLabel htmlFor="u-role">{t("Role")}</FieldLabel>
              <Controller
                control={form.control}
                name="role"
                render={({ field }) => <RoleSelect id="u-role" value={field.value} onChange={field.onChange} />}
              />
            </Field>
            <Field data-invalid={!!errors.password}>
              <FieldLabel htmlFor="u-password">{t("Initial password")}</FieldLabel>
              <Input
                id="u-password"
                type="password"
                autoComplete="new-password"
                maxLength={72}
                aria-invalid={!!errors.password}
                {...form.register("password")}
              />
              <FieldDescription>{t("At least 8 characters.")}</FieldDescription>
              {errors.password?.message ? <FieldError>{t(errors.password.message)}</FieldError> : null}
            </Field>
          </FieldGroup>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting}>
              {t("Close")}
            </Button>
            <Button type="submit" disabled={isSubmitting || !isValid}>
              {isSubmitting ? <Spinner /> : null}
              {t("Create")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function EditUserDialog({
  user,
  onClose,
  onSaved,
}: {
  user: UserDTO;
  onClose: () => void;
  onSaved: () => void;
}) {
  const t = useT();
  const form = useForm<EditUserFormValues>({
    resolver: zodResolver(editUserSchema),
    defaultValues: { role: user.role, isActive: user.isActive },
  });
  const { isSubmitting } = form.formState;

  async function submit(values: EditUserFormValues) {
    const result = await unwrapAs<unknown>(updateUserAction(user._id, values));
    if (result !== null) {
      toast.success(t("Updated. The user will have to sign in again."));
      onSaved();
    }
  }

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {t("Edit")} {user.username}
          </DialogTitle>
          <DialogDescription>
            {t("Changing the role or locking the account takes effect immediately and signs out all current sessions.")}
          </DialogDescription>
        </DialogHeader>
        <form noValidate onSubmit={form.handleSubmit(submit)} className="flex flex-col gap-4">
          <FieldGroup className="gap-4">
            <Field>
              <FieldLabel htmlFor="e-role">{t("Role")}</FieldLabel>
              <Controller
                control={form.control}
                name="role"
                render={({ field }) => <RoleSelect id="e-role" value={field.value} onChange={field.onChange} />}
              />
            </Field>
            <Field orientation="horizontal">
              <Controller
                control={form.control}
                name="isActive"
                render={({ field }) => (
                  <Switch
                    id="e-active"
                    name={field.name}
                    checked={field.value}
                    onCheckedChange={field.onChange}
                    onBlur={field.onBlur}
                  />
                )}
              />
              <FieldLabel htmlFor="e-active" className="font-normal">
                {t("Currently active")}
              </FieldLabel>
            </Field>
          </FieldGroup>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting}>
              {t("Close")}
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? <Spinner /> : null}
              {t("Save")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function ResetPasswordDialog({ user, onClose }: { user: UserDTO; onClose: () => void }) {
  const t = useT();
  const form = useForm<{ password: string }>({
    resolver: zodResolver(z.object({ password: z.string().min(8, "At least 8 characters.").max(72) })),
    mode: "onChange",
    defaultValues: { password: "" },
  });
  const { errors, isSubmitting, isValid } = form.formState;

  async function submit({ password }: { password: string }) {
    const result = await unwrapAs<unknown>(resetPasswordAction(user._id, password));
    if (result !== null) {
      toast.success(t("Password reset."));
      onClose();
    }
  }

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {t("Reset password for")} {user.username}
          </DialogTitle>
          <DialogDescription>{t("All current sessions of this user will be signed out.")}</DialogDescription>
        </DialogHeader>
        <form noValidate onSubmit={form.handleSubmit(submit)} className="flex flex-col gap-4">
          <Field data-invalid={!!errors.password}>
            <FieldLabel htmlFor="r-password">{t("New password")}</FieldLabel>
            <Input
              id="r-password"
              type="password"
              autoComplete="new-password"
              maxLength={72}
              aria-invalid={!!errors.password}
              {...form.register("password")}
            />
            <FieldDescription>{t("At least 8 characters.")}</FieldDescription>
            {errors.password?.message ? <FieldError>{t(errors.password.message)}</FieldError> : null}
          </Field>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting}>
              {t("Close")}
            </Button>
            <Button type="submit" disabled={isSubmitting || !isValid}>
              {isSubmitting ? <Spinner /> : null}
              {t("Reset")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
