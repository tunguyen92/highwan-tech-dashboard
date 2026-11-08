"use server";

import { run } from "@/server/lib/action";
import { getOverview } from "@/server/lib/overview";
import {
  getCurrentStock,
  getCurrentStockPage,
  getMonthlyReconciliation,
  getStockCard,
  getStockSummary,
  vnDayStart,
} from "@/server/lib/reports";
import {
  currentStockPageSchema,
  currentStockSchema,
  reconciliationSchema,
  stockCardSchema,
  stockSummarySchema,
} from "@/server/lib/schemas";

const DAY_MS = 24 * 3600_000;

/** Inclusive "to" date from the UI becomes an exclusive upper bound (start of the next day, Vietnam time) */
const range = (from: string, to: string) => ({
  from: vnDayStart(from),
  to: new Date(vnDayStart(to).getTime() + DAY_MS),
});

export async function currentStockAction(input: unknown = {}) {
  return run("report:read", async () => getCurrentStock(currentStockSchema.parse(input)));
}

export async function currentStockPageAction(input: unknown = {}) {
  return run("report:read", async () => getCurrentStockPage(currentStockPageSchema.parse(input)));
}

export async function stockSummaryAction(input: unknown) {
  return run("report:read", async () => {
    const d = stockSummarySchema.parse(input);
    const r = range(d.from, d.to);
    return getStockSummary(r.from, r.to, d.type);
  });
}

export async function reconciliationAction(input: unknown) {
  return run("report:read", async () => {
    const d = reconciliationSchema.parse(input);
    return getMonthlyReconciliation(d.period, d.tolerancePercent, d.onlyAbnormal);
  });
}

export async function stockCardAction(input: unknown) {
  return run("report:read", async () => {
    const d = stockCardSchema.parse(input);
    const r = range(d.from, d.to);
    return getStockCard(d.itemId, r.from, r.to);
  });
}

export async function overviewAction() {
  return run("overview:read", async () => getOverview());
}
