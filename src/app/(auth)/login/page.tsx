import { redirect } from "next/navigation";

import type { Metadata } from "next";

import { LanguageSwitcher } from "@/components/language-switcher";
import { APP_CONFIG } from "@/config/app-config";
import { getServerT } from "@/lib/i18n/server";
import { getCurrentUser } from "@/server/lib/auth";

import { LoginForm } from "./_components/login-form";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getServerT();
  return { title: t("Sign in") };
}

export default async function Page() {
  const t = await getServerT();
  if (await getCurrentUser()) redirect("/dashboard");

  return (
    <main className="bg-muted/40 relative flex min-h-screen items-center justify-center p-4">
      <div className="absolute top-4 right-4">
        <LanguageSwitcher />
      </div>
      <div className="bg-card w-full max-w-sm rounded-xl border p-6 shadow-sm">
        <div className="mb-6 flex flex-col gap-1">
          <h1 className="text-xl font-semibold">{t(APP_CONFIG.name)}</h1>
          <p className="text-muted-foreground text-sm">{t("Sign in to manage stock in, stock out and inventory.")}</p>
        </div>
        <LoginForm />
      </div>
    </main>
  );
}
