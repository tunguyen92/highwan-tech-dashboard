import { redirect } from "next/navigation";

import { Command } from "lucide-react";
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
    <main className="bg-background relative flex min-h-dvh">
      <aside className="bg-primary hidden lg:flex lg:w-1/3">
        <div className="flex h-full flex-col items-center justify-center p-12 text-center">
          <div className="flex flex-col gap-6">
            <Command aria-hidden="true" className="text-primary-foreground mx-auto size-12" />
            <div className="flex flex-col gap-2">
              <h2 className="text-primary-foreground text-5xl font-light">{t(APP_CONFIG.name)}</h2>
              <p className="text-primary-foreground/80 text-xl">
                {t("Sign in to manage stock in, stock out, and inventory.")}
              </p>
            </div>
          </div>
        </div>
      </aside>

      <section className="flex min-h-dvh w-full items-center justify-center p-8 lg:w-2/3">
        <div className="absolute top-4 right-4">
          <LanguageSwitcher />
        </div>
        <div className="flex w-full max-w-md flex-col gap-8 py-20">
          <div className="flex flex-col gap-4 text-center">
            <h1 className="text-3xl font-medium">{t("Sign in")}</h1>
            <p className="text-muted-foreground mx-auto max-w-xl">
              {t("Sign in to manage stock in, stock out, and inventory.")}
            </p>
          </div>
          <div className="flex flex-col gap-4">
            <LoginForm />
            <p className="text-muted-foreground text-center text-sm">
              {t("Accounts are created by an administrator.")}
            </p>
          </div>
        </div>
      </section>
    </main>
  );
}
