"use client";

import { createContext, type ReactNode, useContext } from "react";

import { setFormatLocale } from "@/lib/wms/format";

import type { Locale } from "./config";
import { makeT, type TFunction } from "./translate";

type I18nValue = { locale: Locale; t: TFunction };

const I18nContext = createContext<I18nValue | null>(null);

export function I18nProvider({ locale, children }: { locale: Locale; children: ReactNode }) {
  // Number and date formatters read the locale from here (they are plain functions used all over the UI)
  setFormatLocale(locale);
  return <I18nContext.Provider value={{ locale, t: makeT(locale) }}>{children}</I18nContext.Provider>;
}

function useI18n(): I18nValue {
  const value = useContext(I18nContext);
  if (!value) throw new Error("I18nProvider is missing");
  return value;
}

export const useT = (): TFunction => useI18n().t;
export const useLocale = (): Locale => useI18n().locale;
