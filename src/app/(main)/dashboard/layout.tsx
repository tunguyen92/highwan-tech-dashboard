import type { ReactNode } from "react";

import { DashboardShell } from "../_components/dashboard-shell";

export default function Layout({ children }: Readonly<{ children: ReactNode }>) {
  return <DashboardShell>{children}</DashboardShell>;
}
