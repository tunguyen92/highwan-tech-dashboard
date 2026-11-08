"use client";

import { useState } from "react";

import Link from "next/link";

import { Plus, Search } from "lucide-react";

import { Button } from "@/components/ui/button";
import { InputGroup, InputGroupAddon, InputGroupInput } from "@/components/ui/input-group";
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useT } from "@/lib/i18n/provider";
import { unwrapAs } from "@/lib/wms/action-client";
import { BOM_STATUS_LABEL, type BomStatus } from "@/lib/wms/constants";
import { formatDate } from "@/lib/wms/format";
import type { BomListRow } from "@/lib/wms/types";
import { useLoad } from "@/lib/wms/use-load";
import { listBomsAction } from "@/server/actions/boms";

import { PageCard, tableClass } from "../../_components/wms/page-card";
import { BomStatusBadge } from "../../_components/wms/status-badges";
import { EmptyRow, LoadingRows } from "../../_components/wms/table-states";
import { useItems } from "../../_components/wms/use-items";
import { useCan } from "../../_components/wms/user-context";
import { CreateBomDialog } from "./create-bom-dialog";

type StatusFilter = "ALL" | BomStatus;

export function BomsScreen() {
  const t = useT();
  const canWrite = useCan("bom:write");
  const [q, setQ] = useState("");
  const [status, setStatus] = useState<StatusFilter>("ACTIVE");
  const [creating, setCreating] = useState(false);
  const { items } = useItems();

  const { data, loading } = useLoad(
    () => unwrapAs<BomListRow[]>(listBomsAction({ status: status === "ALL" ? undefined : status })),
    [status],
  );

  const nameOf = new Map(items.map((item) => [item._id, item.name]));
  const rows = (data ?? []).filter((bom) => bom.outputItemCode.toLowerCase().includes(q.trim().toLowerCase()));

  return (
    <>
      <PageCard
        title={t("BOM (bill of materials)")}
        description={t(
          "Multi-level BOM: a finished product consists of semi-finished items, which consist of raw materials. An active version cannot be edited; create a new version to change it.",
        )}
        actions={
          <>
            <InputGroup className="h-7 w-full md:w-56">
              <InputGroupAddon align="inline-start">
                <Search className="size-3.5" />
              </InputGroupAddon>
              <InputGroupInput
                className="h-7"
                placeholder={t("Search by code...")}
                value={q}
                onChange={(e) => setQ(e.target.value)}
              />
            </InputGroup>
            {canWrite ? (
              <Button size="sm" onClick={() => setCreating(true)}>
                <Plus /> {t("Create BOM")}
              </Button>
            ) : null}
          </>
        }
      >
        <div className="px-4">
          <Select value={status} onValueChange={(value) => setStatus(value as StatusFilter)}>
            <SelectTrigger size="sm">
              <span className="text-muted-foreground">{t("Status:")}</span>
              <SelectValue />
            </SelectTrigger>
            <SelectContent position="popper" align="start">
              <SelectGroup>
                <SelectItem value="ALL">{t("All")}</SelectItem>
                {(Object.keys(BOM_STATUS_LABEL) as BomStatus[]).map((key) => (
                  <SelectItem key={key} value={key}>
                    {t(BOM_STATUS_LABEL[key])}
                  </SelectItem>
                ))}
              </SelectGroup>
            </SelectContent>
          </Select>
        </div>

        <Table className={tableClass}>
          <TableHeader className="[&_tr]:border-t">
            <TableRow>
              <TableHead>{t("Code")}</TableHead>
              <TableHead>{t("Name")}</TableHead>
              <TableHead>{t("Version")}</TableHead>
              <TableHead>{t("Status")}</TableHead>
              <TableHead className="text-right">{t("Lines")}</TableHead>
              <TableHead>{t("Effective from")}</TableHead>
              <TableHead>{t("Updated")}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? <LoadingRows columns={7} /> : null}
            {!loading && rows.length === 0 ? <EmptyRow columns={7} text={t("No BOMs yet.")} /> : null}
            {!loading &&
              rows.map((bom) => (
                <TableRow key={bom._id}>
                  <TableCell className="font-medium">
                    <Link href={`/dashboard/boms/${bom._id}`} className="text-primary underline underline-offset-4">
                      {bom.outputItemCode}
                    </Link>
                  </TableCell>
                  <TableCell>{nameOf.get(bom.outputItemId)}</TableCell>
                  <TableCell className="tabular-nums">v{bom.version}</TableCell>
                  <TableCell>
                    <BomStatusBadge status={bom.status} />
                  </TableCell>
                  <TableCell className="text-right tabular-nums">{bom.lineCount}</TableCell>
                  <TableCell>{formatDate(bom.effectiveFrom)}</TableCell>
                  <TableCell className="text-muted-foreground">{formatDate(bom.updatedAt)}</TableCell>
                </TableRow>
              ))}
          </TableBody>
        </Table>
      </PageCard>

      <CreateBomDialog open={creating} onOpenChange={setCreating} items={items} />
    </>
  );
}
