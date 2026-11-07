"use client";

import { createContext, type ReactNode, useContext } from "react";

import type { Role } from "@/lib/wms/constants";
import { can, type Permission } from "@/lib/wms/permissions";

export type WmsUser = { id: string; username: string; name: string; role: Role };

const UserContext = createContext<WmsUser | null>(null);

/** Gives client components the signed-in user. Only for showing/hiding UI: the server re-checks every action. */
export function WmsUserProvider({ user, children }: { user: WmsUser; children: ReactNode }) {
  return <UserContext.Provider value={user}>{children}</UserContext.Provider>;
}

export function useWmsUser(): WmsUser {
  const user = useContext(UserContext);
  if (!user) throw new Error("WmsUserProvider is missing");
  return user;
}

export function useCan(permission: Permission): boolean {
  return can(useWmsUser().role, permission);
}
