import { Types } from "mongoose";

export const D = (v: string | number | Types.Decimal128) =>
  v instanceof Types.Decimal128 ? v : Types.Decimal128.fromString(String(v));

export const isPositive = (d: Types.Decimal128) => {
  const s = d.toString();
  return !s.startsWith("-") && parseFloat(s) > 0;
};

export const negate = (d: Types.Decimal128) => {
  const s = d.toString();
  return Types.Decimal128.fromString(s.startsWith("-") ? s.slice(1) : `-${s}`);
};

/** Actual number of decimal places of a value (also handles scientific notation such as 1E-3) */
export const decimalsOf = (d: Types.Decimal128) => {
  const s = d.toString();
  const m = s.match(/^-?\d+(?:\.(\d+))?(?:E([+-]?\d+))?$/i);
  if (!m) return 99;
  const frac = (m[1] ?? "").replace(/0+$/, "").length;
  const exp = m[2] ? parseInt(m[2], 10) : 0;
  return Math.max(0, frac - exp);
};

/** Vietnam time (UTC+7), used for voucher numbers and reporting periods */
const vn = (d: Date) => new Date(d.getTime() + 7 * 3600_000);
export const vnYear = (d: Date) => vn(d).getUTCFullYear();
export const vnPeriod = (d: Date) => {
  const x = vn(d);
  return `${x.getUTCFullYear()}-${String(x.getUTCMonth() + 1).padStart(2, "0")}`;
};
