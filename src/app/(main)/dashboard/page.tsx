import { redirect } from "next/navigation";

import { can } from "@/lib/wms/permissions";
import { getCurrentUser } from "@/server/lib/auth";

export default async function Page() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  redirect(can(user.role, "overview:read") ? "/dashboard/overview" : "/dashboard/stock");
}
