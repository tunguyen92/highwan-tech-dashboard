import type { ReactNode } from "react";

import { redirect } from "next/navigation";

import { canAccessTools } from "@/lib/wms/tools-access";
import { getCurrentUser } from "@/server/lib/auth";

import { DashboardShell } from "../_components/dashboard-shell";

export default async function Layout({ children }: Readonly<{ children: ReactNode }>) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (!canAccessTools(user.username)) redirect("/unauthorized");

  return <DashboardShell>{children}</DashboardShell>;
}
