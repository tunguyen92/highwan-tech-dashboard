"use server";

import { cookies } from "next/headers";

import { isLocale, LOCALE_COOKIE } from "@/lib/i18n/config";

/** Stores the chosen UI language in a cookie (one year). The client then refreshes the page. */
export async function setLocaleAction(locale: string) {
  if (!isLocale(locale)) return { ok: false as const };
  (await cookies()).set(LOCALE_COOKIE, locale, {
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
    sameSite: "lax",
  });
  return { ok: true as const };
}
