"use client";

import { Cpu, Layers, Package, TriangleAlert } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useT } from "@/lib/i18n/provider";
import { unwrapAs } from "@/lib/wms/action-client";
import { formatQty } from "@/lib/wms/format";
import type { BomTreeDTO, BomTreeNodeDTO } from "@/lib/wms/types";
import { useLoad } from "@/lib/wms/use-load";
import { bomTreeAction } from "@/server/actions/boms";

const ICON = { MATERIAL: Cpu, SEMI: Layers, PRODUCT: Package } as const;

function TreeNode({ node, depth }: { node: BomTreeNodeDTO; depth: number }) {
  const t = useT();
  const Icon = ICON[node.type];
  return (
    <li>
      <div className="flex flex-wrap items-center gap-2 py-1.5 text-sm" style={{ paddingLeft: depth * 24 }}>
        <Icon className="text-muted-foreground size-4 shrink-0" />
        <span className="font-medium">{node.code}</span>
        <span className="text-muted-foreground">{node.name}</span>
        <span className="tabular-nums">
          {formatQty(node.quantity)} {node.unit}
        </span>
        {node.scrapPercent > 0 ? (
          <Badge variant="outline">
            {t("scrap")} {node.scrapPercent}%
          </Badge>
        ) : null}
        {node.missingBom ? (
          <Badge variant="destructive">
            <TriangleAlert /> {t("No active BOM yet")}
          </Badge>
        ) : null}
      </div>
      {node.children.length > 0 ? (
        <ul>
          {node.children.map((child) => (
            <TreeNode key={child.itemId} node={child} depth={depth + 1} />
          ))}
        </ul>
      ) : null}
    </li>
  );
}

/** Multi-level view: semi-finished lines are expanded with their ACTIVE BOM */
export function BomTree({ bomId, refreshKey }: { bomId: string; refreshKey: string }) {
  const t = useT();
  const { data, loading } = useLoad(() => unwrapAs<BomTreeDTO>(bomTreeAction(bomId)), [bomId, refreshKey]);

  if (loading) return <Skeleton className="h-32 w-full" />;
  if (!data || data.tree.length === 0) {
    return <p className="text-muted-foreground px-4 text-sm">{t("This BOM has no components yet.")}</p>;
  }

  return (
    <pre>
      <ul className="px-4">
        {data.tree.map((node) => (
          <TreeNode key={node.itemId} node={node} depth={0} />
        ))}
      </ul>
    </pre>
  );
}
