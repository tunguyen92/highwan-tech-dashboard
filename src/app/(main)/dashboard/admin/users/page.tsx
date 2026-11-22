import { redirect } from "next/navigation";

import type { Metadata } from "next";

import { getServerT } from "@/lib/i18n/server";
import { can } from "@/lib/wms/permissions";
import { getCurrentUser } from "@/server/lib/auth";

import { UsersScreen } from "./_components/users-screen";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getServerT();
  return { title: t("Users") };
}

export default async function Page() {
  const user = await getCurrentUser();
  if (!user || !can(user.role, "user:manage")) redirect("/unauthorized");
  return <UsersScreen />;
}
