import type { Locale } from "./config";
import { vi } from "./vi";

export type TParams = Record<string, string | number | null | undefined>;
export type TFunction = (key: string, params?: TParams) => string;

export function translate(locale: Locale, key: string, params?: TParams): string {
  const template = locale === "vi" ? (vi[key] ?? key) : key;
  if (!params) return template;
  return template.replace(/\{(\w+)\}/g, (match, name: string) =>
    name in params ? (String(params[name]) ?? "") : match,
  );
}

export const makeT =
  (locale: Locale): TFunction =>
  (key, params) =>
    translate(locale, key, params);
