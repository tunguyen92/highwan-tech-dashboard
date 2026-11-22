"use client";

import Link from "next/link";

import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { useT } from "@/lib/i18n/provider";
import { unwrapAs } from "@/lib/wms/action-client";
import { formatQty } from "@/lib/wms/format";
import type { ItemDTO, WhereUsedRow } from "@/lib/wms/types";
import { useLoad } from "@/lib/wms/use-load";
import { whereUsedAction } from "@/server/actions/boms";

/** Which Active BOMs use this item (where-used lookup) */
export function WhereUsedDialog({ item, onClose }: { item: ItemDTO | null; onClose: () => void }) {
  const t = useT();
  const { data, loading } = useLoad(
    () => (item ? unwrapAs<WhereUsedRow[]>(whereUsedAction(item._id)) : Promise.resolve(null)),
    [item?._id],
  );

  return (
    <Dialog open={item !== null} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {item?.code} {t("is used in which BOMs?")}
          </DialogTitle>
          <DialogDescription>
            {t("Only active BOMs are counted. Useful before changing or discontinuing a material.")}
          </DialogDescription>
        </DialogHeader>

        {loading ? <Skeleton className="h-16 w-full" /> : null}
        {!loading && (data ?? []).length === 0 ? (
          <p className="text-muted-foreground text-sm">{t("No active BOM uses this code.")}</p>
        ) : null}

        <ul className="flex flex-col divide-y rounded-lg border">
          {(data ?? []).map((bom) => (
            <li key={bom._id} className="flex items-center justify-between gap-3 px-3 py-2 text-sm">
              <Link href={`/dashboard/boms/${bom._id}`} className="font-medium hover:underline" onClick={onClose}>
                {bom.outputItemCode} {t(". version")} {bom.version}
              </Link>
              <span className="text-muted-foreground tabular-nums">
                {formatQty(bom.lines[0]?.quantity)} {item?.unit} {t("/ 1 unit")}
              </span>
            </li>
          ))}
        </ul>
      </DialogContent>
    </Dialog>
  );
}
