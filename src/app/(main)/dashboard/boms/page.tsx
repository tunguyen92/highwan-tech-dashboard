import type { Metadata } from "next";

import { getServerT } from "@/lib/i18n/server";

import { BomsScreen } from "./_components/boms-screen";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getServerT();
  return { title: t("BOM (bill of materials)") };
}

export default function Page() {
  return <BomsScreen />;
}
