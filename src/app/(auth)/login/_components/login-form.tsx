"use client";

import { type FormEvent, useState } from "react";

import { useRouter } from "next/navigation";

import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { useT } from "@/lib/i18n/provider";
import { unwrapAs } from "@/lib/wms/action-client";
import { loginAction } from "@/server/actions/auth";

export function LoginForm() {
  const t = useT();
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    const result = await unwrapAs<unknown>(loginAction({ username, password }));
    if (result) {
      toast.success(t("Signed in."));
      router.replace("/dashboard");
      router.refresh();
      return;
    }
    setBusy(false);
  }

  return (
    <form onSubmit={(event) => void submit(event)} className="flex flex-col gap-4">
      <FieldGroup className="gap-4">
        <Field>
          <FieldLabel htmlFor="login-username">{t("Username")}</FieldLabel>
          <Input
            id="login-username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            autoComplete="username"
            autoFocus
          />
        </Field>
        <Field>
          <FieldLabel htmlFor="login-password">{t("Password")}</FieldLabel>
          <Input
            id="login-password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
          />
        </Field>
      </FieldGroup>
      <Button type="submit" className="w-full" disabled={busy || !username || !password}>
        {busy ? <Spinner /> : null}
        {t("Sign in")}
      </Button>
    </form>
  );
}
