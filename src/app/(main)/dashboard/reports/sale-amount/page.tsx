import { redirect } from "next/navigation";

import type { Metadata } from "next";

import { getServerT } from "@/lib/i18n/server";
import { can } from "@/lib/wms/permissions";
import { getCurrentUser } from "@/server/lib/auth";

import { SaleAmountReport } from "./_components/sale-amount-report";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getServerT();
  return { title: t("Sale Amount") };
}

export default async function Page() {
  const user = await getCurrentUser();
  if (!user || !can(user.role, "sale-amount:read")) redirect("/unauthorized");

  return <SaleAmountReport />;
}
