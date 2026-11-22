"use client";

import { useEffect, useRef, useState } from "react";

import Link from "next/link";
import { useRouter } from "next/navigation";

import { zodResolver } from "@hookform/resolvers/zod";
import Decimal from "decimal.js";
import { ArrowLeft, CopyPlus, Rocket, Save, Trash2 } from "lucide-react";
import { useFieldArray, useForm, useWatch } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useT } from "@/lib/i18n/provider";
import { unwrap, unwrapAs } from "@/lib/wms/action-client";
import { isQuantityValidForUnit } from "@/lib/wms/constants";
import { formatDate } from "@/lib/wms/format";
import type { BomDTO } from "@/lib/wms/types";
import { useLoad } from "@/lib/wms/use-load";
import {
  activateBomAction,
  cloneBomAction,
  deleteBomDraftAction,
  getBomAction,
  updateBomDraftAction,
} from "@/server/actions/boms";

import { ConfirmDialog } from "../../../_components/wms/confirm-dialogs";
import { PageCard } from "../../../_components/wms/page-card";
import { type PastedRow, PasteLinesDialog } from "../../../_components/wms/paste-lines-dialog";
import { BomStatusBadge } from "../../../_components/wms/status-badges";
import { useItems } from "../../../_components/wms/use-items";
import { useCan } from "../../../_components/wms/user-context";
import { type BomEditorLine, BomEditorLines } from "./bom-editor-lines";
import { BomExplodePanel } from "./bom-explode-panel";
import { BomTree } from "./bom-tree";

const bomEditorSchema = z.object({
  lines: z.array(
    z.object({
      key: z.number(),
      itemId: z.string().nullable(),
      itemCode: z.string(),
      itemName: z.string(),
      unit: z.string(),
      quantity: z.string(),
      scrapPercent: z.string(),
      note: z.string().max(300),
    }),
  ),
});

type BomEditorFormValues = z.infer<typeof bomEditorSchema>;

export function BomEditor({ bomId }: { bomId: string }) {
  const t = useT();
  const router = useRouter();
  const canWrite = useCan("bom:write");
  const canActivate = useCan("bom:activate");
  const { items } = useItems();
  const { data: bom, loading, reload } = useLoad(() => unwrapAs<BomDTO>(getBomAction(bomId)), [bomId]);

  const nextKey = useRef(1);
  const [pasteOpen, setPasteOpen] = useState(false);
  const [confirm, setConfirm] = useState<"activate" | "delete" | "clone" | null>(null);
  const form = useForm<BomEditorFormValues>({
    resolver: zodResolver(bomEditorSchema),
    defaultValues: { lines: [] },
  });
  const {
    append,
    fields,
    remove: removeLine,
    replace,
  } = useFieldArray({
    control: form.control,
    name: "lines",
    keyName: "fieldKey",
  });
  const lines = useWatch({ control: form.control, name: "lines" }) ?? [];
  const { isDirty: dirty, isSubmitting: busy } = form.formState;
  const { reset } = form;

  // Reset the local editor state whenever a fresh copy of the BOM arrives
  useEffect(() => {
    if (!bom) return;
    reset({
      lines: bom.lines.map((line) => ({
        key: nextKey.current++,
        itemId: line.itemId,
        itemCode: line.itemCode,
        itemName: line.itemName,
        unit: line.unit,
        quantity: line.quantity,
        scrapPercent: String(line.scrapPercent),
        note: line.note ?? "",
      })),
    });
  }, [bom, reset]);

  if (loading && !bom) return <Skeleton className="h-64 w-full" />;
  if (!bom) return <p className="text-muted-foreground">{t("BOM not found.")}</p>;

  const editable = bom.status === "DRAFT" && canWrite;
  const itemById = new Map(items.map((item) => [item._id, item]));
  const outputItem = itemById.get(bom.outputItemId);

  function patchLine(key: number, patch: Partial<BomEditorLine>) {
    const index = form.getValues("lines").findIndex((line) => line.key === key);
    if (index < 0) return;
    const options = { shouldDirty: true };
    if (patch.itemId !== undefined) form.setValue(`lines.${index}.itemId`, patch.itemId, options);
    if (patch.itemCode !== undefined) form.setValue(`lines.${index}.itemCode`, patch.itemCode, options);
    if (patch.itemName !== undefined) form.setValue(`lines.${index}.itemName`, patch.itemName, options);
    if (patch.unit !== undefined) form.setValue(`lines.${index}.unit`, patch.unit, options);
    if (patch.quantity !== undefined) form.setValue(`lines.${index}.quantity`, patch.quantity, options);
    if (patch.scrapPercent !== undefined) form.setValue(`lines.${index}.scrapPercent`, patch.scrapPercent, options);
    if (patch.note !== undefined) form.setValue(`lines.${index}.note`, patch.note, options);
  }

  function addPasted(rows: PastedRow[]) {
    let next = form.getValues("lines");
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
    replace(next);
  }

  /** Validates and saves the draft. Returns true on success. */
  async function save(): Promise<boolean> {
    let saved = false;
    await form.handleSubmit(async ({ lines: values }) => {
      const filled = values.filter((line): line is BomEditorLine & { itemId: string } => Boolean(line.itemId));
      if (filled.some((line) => !(Number(line.quantity) > 0) || !isQuantityValidForUnit(line.quantity, line.unit))) {
        toast.error(t("Every line needs a valid quantity for its unit."));
        return;
      }

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
      if (!result) return;
      toast.success(t("Draft saved."));
      reload();
      saved = true;
    })();
    return saved;
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
            <BomEditorLines
              lines={lines}
              rowKeys={fields.map((field) => field.fieldKey)}
              items={items}
              outputItemId={bom.outputItemId}
              outputItemCode={bom.outputItemCode}
              editable={editable}
              onAddLine={() =>
                append({
                  key: nextKey.current++,
                  itemId: null,
                  itemCode: "",
                  itemName: "",
                  unit: "",
                  quantity: "",
                  scrapPercent: "0",
                  note: "",
                })
              }
              onOpenPaste={() => setPasteOpen(true)}
              onPatchLine={patchLine}
              onRemoveLine={removeLine}
            />
          </TabsContent>

          <TabsContent value="tree">
            <BomTree bomId={bomId} refreshKey={bom.updatedAt} />
          </TabsContent>

          <TabsContent value="explode">
            {bom.status === "ACTIVE" ? (
              <BomExplodePanel
                outputItemId={bom.outputItemId}
                outputItemCode={bom.outputItemCode}
                outputItemUnit={outputItem?.unit}
              />
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
