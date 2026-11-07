import Decimal from "decimal.js";

import type { Locale } from "@/lib/i18n/config";

const TZ = "Asia/Ho_Chi_Minh";

let currentLocale: Locale = "vi";
export function setFormatLocale(locale: Locale) {
  currentLocale = locale;
}
export const getFormatLocale = () => currentLocale;

const DATE_LOCALE: Record<Locale, string> = { vi: "vi-VN", en: "en-GB" };
const SEPARATORS: Record<Locale, { group: string; decimal: string }> = {
  vi: { group: ".", decimal: "," },
  en: { group: ",", decimal: "." },
};

/** Quantities arrive as exact decimal strings. Format with locale grouping (vi: 1.234,5 / en: 1,234.5) without float math. */
export function formatQty(value: string | number | null | undefined): string {
  if (value === null || value === undefined || value === "") return "";
  let plain: string;
  try {
    plain = new Decimal(value).toFixed();
  } catch {
    return String(value);
  }

  const { group, decimal } = SEPARATORS[currentLocale];
  const negative = plain.startsWith("-");
  const [int, frac] = (negative ? plain.slice(1) : plain).split(".");
  const grouped = int.replace(/\B(?=(\d{3})+(?!\d))/g, group);
  return `${negative ? "-" : ""}${grouped}${frac ? `${decimal}${frac}` : ""}`;
}

export function formatDate(value: string | Date | null | undefined): string {
  if (!value) return "";
  return new Date(value).toLocaleDateString(DATE_LOCALE[currentLocale], { timeZone: TZ });
}

export function formatDateTime(value: string | Date | null | undefined): string {
  if (!value) return "";
  return new Date(value).toLocaleString(DATE_LOCALE[currentLocale], { timeZone: TZ });
}

/** "YYYY-MM-DD" in Vietnam time, as used by <input type="date"> */
export function toYmd(value: string | Date): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: TZ }).format(new Date(value));
}

export const todayYmd = () => toYmd(new Date());
export const currentPeriod = () => todayYmd().slice(0, 7);
export const firstDayOfMonthYmd = () => `${currentPeriod()}-01`;

/** 00:00 Vietnam time of a "YYYY-MM-DD" date, as a Date (serialized to ISO when sent to the server) */
export const ymdToDate = (ymd: string) => new Date(`${ymd}T00:00:00+07:00`);

/** Keeps digits and one decimal separator; accepts "," as the decimal separator */
export function sanitizeQty(raw: string): string {
  const s = raw.replace(",", ".").replace(/[^\d.]/g, "");
  const i = s.indexOf(".");
  return i === -1 ? s : `${s.slice(0, i + 1)}${s.slice(i + 1).replace(/\./g, "")}`;
}
