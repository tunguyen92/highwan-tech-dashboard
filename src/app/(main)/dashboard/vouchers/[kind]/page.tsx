import { notFound } from "next/navigation";

import type { Metadata } from "next";

import { getServerT } from "@/lib/i18n/server";

import { VouchersScreen } from "../_components/vouchers-screen";

export async function generateMetadata({ params }: { params: Promise<{ kind: string }> }): Promise<Metadata> {
  const { kind } = await params;
  const t = await getServerT();
  return { title: kind === "import" ? t("Goods receipts") : t("Goods issues") };
}

export default async function Page({ params }: { params: Promise<{ kind: string }> }) {
  const { kind } = await params;
  if (kind !== "import" && kind !== "export") notFound();
  return <VouchersScreen direction={kind === "import" ? "IN" : "OUT"} />;
}
