export const LOCALES = ["vi", "en"] as const;
export type Locale = (typeof LOCALES)[number];

export const DEFAULT_LOCALE: Locale = "vi";
export const LOCALE_COOKIE = "wms_locale";

export const LOCALE_LABEL: Record<Locale, string> = {
  en: "English",
  vi: "Tiếng Việt",
};

export const isLocale = (value: unknown): value is Locale => LOCALES.includes(value as Locale);
