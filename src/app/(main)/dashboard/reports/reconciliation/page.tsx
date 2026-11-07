import type { Metadata } from "next";

import { getServerT } from "@/lib/i18n/server";

import { ReconciliationReport } from "./_components/reconciliation-report";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getServerT();
  return { title: t("BOM reconciliation") };
}

export default function Page() {
  return <ReconciliationReport />;
}
