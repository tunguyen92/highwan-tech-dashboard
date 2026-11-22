import { redirect } from "next/navigation";

import type { Metadata } from "next";

import { getServerT } from "@/lib/i18n/server";
import { can } from "@/lib/wms/permissions";
import { getCurrentUser } from "@/server/lib/auth";

import { OverviewScreen } from "./_components/overview-screen";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getServerT();
  return { title: t("Overview") };
}

export default async function Page() {
  // const user = await getCurrentUser();
  // if (!user) redirect('/login');

  // Administrator-only screen; the Server Action checks the same permission again.
  // if (!can(user.role, 'overview:read')) redirect('/dashboard/stock');
  return <OverviewScreen />;
}
