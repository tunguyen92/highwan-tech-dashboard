"use client";

import { useRouter } from "next/navigation";

import { Check, Languages } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { LOCALE_LABEL, LOCALES, type Locale } from "@/lib/i18n/config";
import { useLocale, useT } from "@/lib/i18n/provider";
import { setLocaleAction } from "@/server/actions/locale";

/** Switches the UI language (Vietnamese / English). Stored in a cookie, then the page is re-rendered. */
export function LanguageSwitcher({ variant = "outline" }: { variant?: "outline" | "ghost" }) {
  const t = useT();
  const locale = useLocale();
  const router = useRouter();

  async function choose(next: Locale) {
    if (next === locale) return;
    await setLocaleAction(next);
    router.refresh();
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant={variant} size="icon" aria-label={t("Language")}>
          <Languages />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {LOCALES.map((code) => (
          <DropdownMenuItem key={code} onClick={() => void choose(code)}>
            {LOCALE_LABEL[code]}
            {code === locale ? <Check className="ml-auto" /> : null}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
