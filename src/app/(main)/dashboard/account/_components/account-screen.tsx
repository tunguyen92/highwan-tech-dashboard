"use client";

import { useState } from "react";

import { toast } from "sonner";

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

export function AccountScreen() {
  const t = useT();
  const user = useWmsUser();
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);

  const mismatch = confirm !== "" && confirm !== next;

  async function submit() {
    setBusy(true);
    const result = await unwrapAs<unknown>(changeOwnPasswordAction({ current, next }));
    setBusy(false);
    if (result !== null) {
      toast.success(t("Password changed. Other devices have been signed out."));
      setCurrent("");
      setNext("");
      setConfirm("");
    }
  }

  return (
    <PageCard title={t("Account")} description={`${user.name} • ${user.username} • ${t(ROLE_LABEL[user.role])}`}>
      <div className="max-w-md px-4">
        <FieldGroup className="gap-4">
          <Field>
            <FieldLabel htmlFor="pw-current">{t("Current password")}</FieldLabel>
            <Input
              id="pw-current"
              type="password"
              value={current}
              onChange={(e) => setCurrent(e.target.value)}
              autoComplete="current-password"
            />
          </Field>
          <Field>
            <FieldLabel htmlFor="pw-next">{t("New password")}</FieldLabel>
            <Input
              id="pw-next"
              type="password"
              value={next}
              onChange={(e) => setNext(e.target.value)}
              autoComplete="new-password"
            />
            <FieldDescription>{t("At least 8 characters.")}</FieldDescription>
          </Field>
          <Field data-invalid={mismatch}>
            <FieldLabel htmlFor="pw-confirm">{t("Confirm new password")}</FieldLabel>
            <Input
              id="pw-confirm"
              type="password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              autoComplete="new-password"
              aria-invalid={mismatch}
            />
            {mismatch ? <FieldError>{t("The passwords do not match.")}</FieldError> : null}
          </Field>
          <Button
            className="w-fit"
            onClick={() => void submit()}
            disabled={busy || !current || next.length < 8 || next !== confirm}
          >
            {busy ? <Spinner /> : null}
            {t("Change password")}
          </Button>
        </FieldGroup>
      </div>
    </PageCard>
  );
}
