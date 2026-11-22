"use client";

import { unwrapAs } from "@/lib/wms/action-client";
import type { ItemDTO } from "@/lib/wms/types";
import { useLoad } from "@/lib/wms/use-load";
import { listItemsAction } from "@/server/actions/items";

/** All active items, loaded once per screen. Pickers filter them client-side. */
export function useItems() {
  const { data, loading, reload } = useLoad(() => unwrapAs<ItemDTO[]>(listItemsAction({ includeInactive: false })), []);
  return { items: data ?? [], loading, reload };
}
