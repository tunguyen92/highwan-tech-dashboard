import type { Metadata } from "next";

import { getServerT } from "@/lib/i18n/server";

import { MovementReport } from "./_components/movement-report";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getServerT();
  return { title: t("Stock in / out / balance report") };
}

export default function Page() {
  return <MovementReport />;
}
