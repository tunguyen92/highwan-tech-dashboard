"use server";

import { run } from "@/server/lib/action";
import { getOverview } from "@/server/lib/overview";
import {
  getCurrentStock,
  getMonthlyReconciliation,
  getStockCard,
  getStockSummary,
  vnDayStart,
} from "@/server/lib/reports";
import { currentStockSchema, reconciliationSchema, stockCardSchema, stockSummarySchema } from "@/server/lib/schemas";
import {
  getDemoCurrentStock,
  getDemoOverview,
  getDemoReconciliation,
  getDemoStockCard,
  getDemoStockSummary,
} from "@/server/lib/warehouse-demo";

const DAY_MS = 24 * 3600_000;

/** Inclusive "to" date from the UI becomes an exclusive upper bound (start of the next day, Vietnam time) */
const range = (from: string, to: string) => ({
  from: vnDayStart(from),
  to: new Date(vnDayStart(to).getTime() + DAY_MS),
});

export async function currentStockAction(input: unknown = {}) {
  return run(
    "report:read",
    async () => getCurrentStock(currentStockSchema.parse(input)),
    () => getDemoCurrentStock(currentStockSchema.parse(input)),
  );
}

export async function stockSummaryAction(input: unknown) {
  return run(
    "report:read",
    async () => {
      const d = stockSummarySchema.parse(input);
      const r = range(d.from, d.to);
      return getStockSummary(r.from, r.to, d.type);
    },
    async () => {
      const d = stockSummarySchema.parse(input);
      const r = range(d.from, d.to);
      return getDemoStockSummary(r.from, r.to, d.type);
    },
  );
}

export async function reconciliationAction(input: unknown) {
  return run(
    "report:read",
    async () => {
      const d = reconciliationSchema.parse(input);
      return getMonthlyReconciliation(d.period, d.tolerancePercent, d.onlyAbnormal);
    },
    () => {
      const d = reconciliationSchema.parse(input);
      return getDemoReconciliation(d.period, d.tolerancePercent, d.onlyAbnormal);
    },
  );
}

export async function stockCardAction(input: unknown) {
  return run(
    "report:read",
    async () => {
      const d = stockCardSchema.parse(input);
      const r = range(d.from, d.to);
      return getStockCard(d.itemId, r.from, r.to);
    },
    () => {
      const d = stockCardSchema.parse(input);
      const r = range(d.from, d.to);
      return getDemoStockCard(d.itemId, r.from, r.to);
    },
  );
}

export async function overviewAction() {
  return run(
    "overview:read",
    async () => getOverview(),
    async () => getDemoOverview(),
  );
}
