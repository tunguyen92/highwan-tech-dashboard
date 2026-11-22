import type { Metadata } from "next";

import { getServerT } from "@/lib/i18n/server";

import { StockScreen } from "./_components/stock-screen";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getServerT();
  return { title: t("Inventory") };
}

export default function Page() {
  return <StockScreen />;
}
