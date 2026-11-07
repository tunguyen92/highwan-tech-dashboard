import Link from "next/link";

import { Lock } from "lucide-react";
import type { Metadata } from "next";

import { getServerT } from "@/lib/i18n/server";

export const metadata: Metadata = {
  robots: {
    index: false,
    follow: false,
  },
};

export default async function page() {
  const t = await getServerT();

  return (
    <div className="bg-background flex min-h-dvh flex-col items-center justify-center px-4 py-12 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-md text-center">
        <Lock className="text-primary mx-auto size-12" />
        <h1 className="mt-4 text-3xl font-bold tracking-tight sm:text-4xl">{t("Unauthorized access")}</h1>
        <p className="text-muted-foreground mt-4">
          {t(
            "You do not have permission to view this content. Please contact the administrator if you believe this is a mistake.",
          )}
        </p>
        <div className="mt-6">
          <Link
            href="/dashboard/stock"
            className="bg-primary text-primary-foreground hover:bg-primary/90 focus:ring-primary inline-flex items-center rounded-md px-4 py-2 text-sm font-medium shadow-xs transition-colors focus:ring-2 focus:ring-offset-2 focus:outline-hidden"
            prefetch={false}
          >
            {t("Go to home page")}
          </Link>
        </div>
      </div>
    </div>
  );
}
