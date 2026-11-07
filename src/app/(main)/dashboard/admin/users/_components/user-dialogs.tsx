"user client";

import { useState } from "react";

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
import { Field, FieldDescription, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Spinner } from "@/components/ui/spinner";
import { Switch } from "@/components/ui/switch";
import { useT } from "@/lib/i18n/provider";
import { unwrapAs } from "@/lib/wms/action-client";
import { ROLE_LABEL, type Role } from "@/lib/wms/constants";
import type { UserDTO } from "@/lib/wms/types";
import { createUserAction, resetPasswordAction, updateUserAction } from "@/server/actions/users";

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
  const [username, setUsername] = useState("");
  const [name, setName] = useState("");
  const [role, setRole] = useState<Role>("STOREKEEPER");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit() {
    setBusy(true);
    const result = await unwrapAs<unknown>(createUserAction({ username, name, role, password }));
    setBusy(false);
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
        <FieldGroup className="gap-4">
          <Field>
            <FieldLabel htmlFor="u-username">{t("Username")}</FieldLabel>
            <Input id="u-username" value={username} onChange={(e) => setUsername(e.target.value)} autoComplete="off" />
            <FieldDescription>
              {t("Letters, digits, dots, hyphens, underscores. At least 3 characters.")}
            </FieldDescription>
          </Field>
          <Field>
            <FieldLabel htmlFor="u-name">{t("Full name")}</FieldLabel>
            <Input id="u-name" value={name} onChange={(e) => setName(e.target.value)} />
          </Field>
          <Field>
            <FieldLabel htmlFor="u-role">{t("Role")}</FieldLabel>
            <RoleSelect id="u-role" value={role} onChange={setRole} />
          </Field>
          <Field>
            <FieldLabel htmlFor="u-password">{t("Initial password")}</FieldLabel>
            <Input
              id="u-password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="new-password"
            />
            <FieldDescription>{t("At least 8 characters.")}</FieldDescription>
          </Field>
        </FieldGroup>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={busy}>
            {t("Close")}
          </Button>
          <Button onClick={() => void submit()} disabled={busy || !username || !name || password.length < 8}>
            {busy ? <Spinner /> : null}
            {t("Create")}
          </Button>
        </DialogFooter>
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
  const [role, setRole] = useState<Role>(user.role);
  const [isActive, setIsActive] = useState(user.isActive);
  const [busy, setBusy] = useState(false);

  async function submit() {
    setBusy(true);
    const result = await unwrapAs<unknown>(updateUserAction(user._id, { role, isActive }));
    setBusy(false);
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
        <FieldGroup className="gap-4">
          <Field>
            <FieldLabel htmlFor="e-role">{t("Role")}</FieldLabel>
            <RoleSelect id="e-role" value={role} onChange={setRole} />
          </Field>
          <Field orientation="horizontal">
            <Switch id="e-active" checked={isActive} onCheckedChange={setIsActive} />
            <FieldLabel htmlFor="e-active" className="font-normal">
              {t("Currently active")}
            </FieldLabel>
          </Field>
        </FieldGroup>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={busy}>
            {t("Close")}
          </Button>
          <Button onClick={() => void submit()} disabled={busy}>
            {busy ? <Spinner /> : null}
            {t("Save")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function ResetPasswordDialog({ user, onClose }: { user: UserDTO; onClose: () => void }) {
  const t = useT();
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit() {
    setBusy(true);
    const result = await unwrapAs<unknown>(resetPasswordAction(user._id, password));
    setBusy(false);
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
        <Field>
          <FieldLabel htmlFor="r-password">{t("New password")}</FieldLabel>
          <Input
            id="r-password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="new-password"
          />
          <FieldDescription>{t("At least 8 characters.")}</FieldDescription>
        </Field>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={busy}>
            {t("Close")}
          </Button>
          <Button onClick={() => void submit()} disabled={busy || password.length < 8}>
            {busy ? <Spinner /> : null}
            {t("Reset")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
