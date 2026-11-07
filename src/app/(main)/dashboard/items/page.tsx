import type { Metadata } from "next";

import { getServerT } from "@/lib/i18n/server";

import { ItemsScreen } from "./_components/items-screen";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getServerT();
  return { title: t("Item catalog") };
}

export default function Page() {
  return <ItemsScreen />;
}
