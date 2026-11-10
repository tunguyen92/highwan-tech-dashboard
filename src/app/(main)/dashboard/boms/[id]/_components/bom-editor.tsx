"use client";

import { useEffect, useRef, useState } from "react";

import Link from "next/link";
import { useRouter } from "next/navigation";

import Decimal from "decimal.js";
import { ArrowLeft, ClipboardPaste, CopyPlus, Plus, Rocket, Save, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useT } from "@/lib/i18n/provider";
import { unwrap, unwrapAs } from "@/lib/wms/action-client";
import { formatDate, formatQty } from "@/lib/wms/format";
import type { BomDTO, ItemDTO } from "@/lib/wms/types";
import { useLoad } from "@/lib/wms/use-load";
import {
  activateBomAction,
  cloneBomAction,
  deleteBomDraftAction,
  getBomAction,
  updateBomDraftAction,
} from "@/server/actions/boms";

import { ConfirmDialog } from "../../../_components/wms/confirm-dialogs";
import { ItemPicker } from "../../../_components/wms/item-picker";
import { PageCard, tableClass } from "../../../_components/wms/page-card";
import { type PastedRow, PasteLinesDialog } from "../../../_components/wms/paste-lines-dialog";
import { QtyInput } from "../../../_components/wms/qty-input";
import { BomStatusBadge } from "../../../_components/wms/status-badges";
import { useItems } from "../../../_components/wms/use-items";
import { useCan } from "../../../_components/wms/user-context";
import { BomExplodePanel } from "./bom-explode-panel";
import { BomTree } from "./bom-tree";

type LineState = {
  key: number;
  itemId: string | null;
  itemCode: string;
  itemName: string;
  unit: string;
  quantity: string;
  scrapPercent: string;
  note: string;
};

export function BomEditor({ bomId }: { bomId: string }) {
  const t = useT();
  const router = useRouter();
  const canWrite = useCan("bom:write");
  const canActivate = useCan("bom:activate");
  const { items } = useItems();
  const { data: bom, loading, reload } = useLoad(() => unwrapAs<BomDTO>(getBomAction(bomId)), [bomId]);

  const nextKey = useRef(1);
  const [lines, setLines] = useState<LineState[]>([]);
  const [dirty, setDirty] = useState(false);
  const [busy, setBusy] = useState(false);
  const [pasteOpen, setPasteOpen] = useState(false);
  const [confirm, setConfirm] = useState<"activate" | "delete" | "clone" | null>(null);

  // Reset the local editor state whenever a fresh copy of the BOM arrives
  useEffect(() => {
    if (!bom) return;
    setLines(
      bom.lines.map((line) => ({
        key: nextKey.current++,
        itemId: line.itemId,
        itemCode: line.itemCode,
        itemName: line.itemName,
        unit: line.unit,
        quantity: line.quantity,
        scrapPercent: String(line.scrapPercent),
        note: line.note ?? "",
      })),
    );
    setDirty(false);
  }, [bom]);

  if (loading && !bom) return <Skeleton className="h-64 w-full" />;
  if (!bom) return <p className="text-muted-foreground">{t("BOM not found.")}</p>;

  const editable = bom.status === "DRAFT" && canWrite;
  const itemById = new Map(items.map((item) => [item._id, item]));
  const itemByCode = new Map(items.map((item) => [item.code, item]));
  const outputItem = itemById.get(bom.outputItemId);

  function patchLine(key: number, patch: Partial<LineState>) {
    setLines((current) => current.map((line) => (line.key === key ? { ...line, ...patch } : line)));
    setDirty(true);
  }

  function addPasted(rows: PastedRow[]) {
    setLines((current) => {
      let next = current;
      for (const { item, quantity } of rows) {
        if (next.some((line) => line.itemId === item._id)) {
          next = next.map((line) =>
            line.itemId === item._id
              ? { ...line, quantity: new Decimal(line.quantity || "0").plus(quantity).toString() }
              : line,
          );
        } else {
          next = [
            ...next,
            {
              key: nextKey.current++,
              itemId: item._id,
              itemCode: item.code,
              itemName: item.name,
              unit: item.unit,
              quantity,
              scrapPercent: "0",
              note: "",
            },
          ];
        }
      }
      return next;
    });
    setDirty(true);
  }

  /** Validates and saves the draft. Returns true on success. */
  async function save(): Promise<boolean> {
    const filled = lines.filter((line) => line.itemId);
    if (filled.some((line) => !(Number(line.quantity) > 0))) {
      toast.error(t("Every line needs a quantity greater than 0."));
      return false;
    }

    setBusy(true);
    const result = await unwrap(
      updateBomDraftAction(
        bomId,
        filled.map((line) => ({
          itemId: line.itemId,
          quantity: line.quantity,
          scrapPercent: Number(line.scrapPercent || "0"),
          note: line.note.trim() === "" ? undefined : line.note.trim(),
        })),
      ),
    );
    setBusy(false);
    if (!result) return false;
    toast.success(t("Draft saved."));
    reload();
    return true;
  }

  async function activate() {
    if (dirty && !(await save())) return;
    const result = await unwrap(activateBomAction(bomId));
    if (result) {
      toast.success(t("BOM activated. The previous version is now superseded."));
      setConfirm(null);
      reload();
    }
  }

  async function remove() {
    const result = await unwrap(deleteBomDraftAction(bomId));
    if (result) {
      toast.success(t("Draft deleted."));
      router.push("/dashboard/boms");
    }
  }

  async function clone() {
    const result = await unwrapAs<{ id: string }>(cloneBomAction(bomId));
    if (result) {
      toast.success(t("A new draft was created from this BOM."));
      setConfirm(null);
      router.push(`/dashboard/boms/${result.id}`);
    }
  }

  return (
    <>
      <PageCard
        title={
          <span className="flex flex-wrap items-center gap-2">
            {bom.outputItemCode}
            <span className="text-muted-foreground text-base font-normal">{outputItem?.name}</span>
            <span className="text-base font-normal tabular-nums"> v{bom.version}</span>
            <BomStatusBadge status={bom.status} />
          </span>
        }
        description={
          bom.status === "DRAFT"
            ? t("Draft: edit freely. Activate it to apply; the currently active version (if any) will be replaced.")
            : t("Effective from {v1}. This version cannot be edited; create a new version to change it.", {
                v1: formatDate(bom.effectiveFrom) || "-",
              })
        }
        actions={
          <>
            <Button variant="outline" size="sm" asChild>
              <Link href="/dashboard/boms">
                <ArrowLeft /> {t("List")}
              </Link>
            </Button>
            {bom.status === "DRAFT" && canWrite ? (
              <>
                <Button variant="outline" size="sm" onClick={() => setConfirm("delete")} disabled={busy}>
                  <Trash2 /> {t("Delete draft")}
                </Button>
                <Button variant="outline" size="sm" onClick={() => void save()} disabled={busy || !dirty}>
                  <Save /> {t("Save")}
                </Button>
              </>
            ) : null}
            {bom.status === "DRAFT" && canActivate ? (
              <Button size="sm" onClick={() => setConfirm("activate")} disabled={busy || lines.length === 0}>
                <Rocket /> {t("Activate")}
              </Button>
            ) : null}
            {bom.status !== "DRAFT" && canWrite ? (
              <Button size="sm" onClick={() => setConfirm("clone")}>
                <CopyPlus /> {t("Create new version")}
              </Button>
            ) : null}
          </>
        }
      >
        <Tabs defaultValue="lines" className="gap-4">
          <div className="px-4">
            <TabsList className="gap-2">
              <TabsTrigger value="lines">{t("Components")}</TabsTrigger>
              <TabsTrigger value="tree">{t("Expanded tree")}</TabsTrigger>
              <TabsTrigger value="explode">{t("Total requirement")}</TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="lines" className="flex flex-col gap-3">
            {editable ? (
              <div className="flex flex-wrap gap-2 px-4">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setLines((current) => [
                      ...current,
                      {
                        key: nextKey.current++,
                        itemId: null,
                        itemCode: "",
                        itemName: "",
                        unit: "",
                        quantity: "",
                        scrapPercent: "0",
                        note: "",
                      },
                    ]);
                    setDirty(true);
                  }}
                >
                  <Plus /> {t("Add line")}
                </Button>
                <Button variant="outline" size="sm" onClick={() => setPasteOpen(true)}>
                  <ClipboardPaste /> {t("Paste from Excel")}
                </Button>
              </div>
            ) : null}

            <Table className={tableClass}>
              <TableHeader className="[&_tr]:border-t">
                <TableRow>
                  <TableHead className="w-[38%]">{t("Components")}</TableHead>
                  <TableHead className="w-36 text-right">{t("Qty / 1 unit")}</TableHead>
                  <TableHead className="w-20">{t("UoM")}</TableHead>
                  <TableHead className="w-32 text-right">{t("Allowed scrap (%)")}</TableHead>
                  <TableHead>{t("Notes")}</TableHead>
                  {editable ? <TableHead className="w-10" /> : null}
                </TableRow>
              </TableHeader>
              <TableBody>
                {lines.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-muted-foreground h-24 text-center">
                      {t("No components yet.")}
                    </TableCell>
                  </TableRow>
                ) : null}
                {lines.map((line) => {
                  const item: ItemDTO | undefined =
                    (line.itemId ? itemById.get(line.itemId) : undefined) ?? itemByCode.get(line.itemCode);
                  return (
                    <TableRow key={line.key}>
                      <TableCell>
                        {editable ? (
                          <ItemPicker
                            items={items}
                            value={line.itemId}
                            placeholder={
                              item
                                ? `${item.code} · ${item.name}`
                                : line.itemCode
                                  ? `${line.itemCode}${line.itemName ? ` · ${line.itemName}` : ""}`
                                  : undefined
                            }
                            allowedTypes={["MATERIAL", "SEMI"]}
                            excludeIds={[
                              bom.outputItemId,
                              ...lines.filter((l) => l.key !== line.key && l.itemId).map((l) => l.itemId as string),
                            ]}
                            onChange={(picked) =>
                              patchLine(line.key, {
                                itemId: picked._id,
                                itemCode: picked.code,
                                itemName: picked.name,
                                unit: picked.unit,
                              })
                            }
                          />
                        ) : (
                          <span>
                            <span className="font-medium">{line.itemCode || item?.code}</span>
                            <span className="text-muted-foreground"> • {line.itemName || item?.name}</span>
                          </span>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        {editable ? (
                          <QtyInput
                            value={line.quantity}
                            onChange={(value) => patchLine(line.key, { quantity: value })}
                          />
                        ) : (
                          <span className="tabular-nums">{formatQty(line.quantity)}</span>
                        )}
                      </TableCell>
                      <TableCell>{line.unit || item?.unit}</TableCell>
                      <TableCell className="text-right">
                        {editable ? (
                          <QtyInput
                            value={line.scrapPercent}
                            onChange={(value) => patchLine(line.key, { scrapPercent: value })}
                          />
                        ) : (
                          <span className="tabular-nums">{line.scrapPercent}</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {editable ? (
                          <Input
                            value={line.note}
                            onChange={(e) => patchLine(line.key, { note: e.target.value })}
                            maxLength={300}
                          />
                        ) : (
                          <span className="text-muted-foreground">{line.note}</span>
                        )}
                      </TableCell>
                      {editable ? (
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            aria-label={t("Delete line")}
                            onClick={() => {
                              setLines((current) => current.filter((l) => l.key !== line.key));
                              setDirty(true);
                            }}
                          >
                            <Trash2 />
                          </Button>
                        </TableCell>
                      ) : null}
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
            <p className="text-muted-foreground px-4 text-xs">
              {t("Quantity per 1 unit of {v}", { v: bom.outputItemCode })}
            </p>
            <p className="text-muted-foreground px-4 text-xs">
              {t(
                "Each quantity is expressed in the component's own unit of measure. Allowed scrap is the threshold that keeps the reconciliation report from raising false alarms; leave 0 to use the general tolerance.",
              )}
            </p>
          </TabsContent>

          <TabsContent value="tree">
            <BomTree bomId={bomId} refreshKey={bom.updatedAt} />
          </TabsContent>

          <TabsContent value="explode">
            {bom.status === "ACTIVE" ? (
              <BomExplodePanel outputItemId={bom.outputItemId} outputItemCode={bom.outputItemCode} />
            ) : (
              <p className="text-muted-foreground px-4 text-sm">
                {t("The total requirement can only be calculated for the active BOM. Activate this draft first.")}
              </p>
            )}
          </TabsContent>
        </Tabs>
      </PageCard>

      <PasteLinesDialog
        open={pasteOpen}
        onOpenChange={setPasteOpen}
        items={items.filter((item) => item.type !== "PRODUCT" && item._id !== bom.outputItemId)}
        onApply={addPasted}
      />

      <ConfirmDialog
        open={confirm === "activate"}
        onOpenChange={(open) => !open && setConfirm(null)}
        title={t("Activate BOM {outputItemCode} v{version}?", {
          outputItemCode: bom.outputItemCode,
          version: bom.version,
        })}
        description={t(
          "The system checks for circular references. The active version (if any) becomes 'Superseded'. Finished-product issues and the reconciliation report use the new active version.",
        )}
        confirmLabel={t("Activate")}
        onConfirm={activate}
      />

      <ConfirmDialog
        open={confirm === "delete"}
        onOpenChange={(open) => !open && setConfirm(null)}
        title={t("Delete this draft?")}
        description={t("The draft is deleted permanently. The active BOM is not affected.")}
        confirmLabel={t("Delete")}
        destructive
        onConfirm={remove}
      />

      <ConfirmDialog
        open={confirm === "clone"}
        onOpenChange={(open) => !open && setConfirm(null)}
        title={t("Create a new version from this BOM?")}
        description={t(
          "A new draft is created with the current components for you to edit. This version stays unchanged.",
        )}
        confirmLabel={t("Create draft")}
        onConfirm={clone}
      />
    </>
  );
}
