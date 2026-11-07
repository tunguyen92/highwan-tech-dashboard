"use client";

import { useState } from "react";

import { MoreHorizontal, Plus, Search } from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Field, FieldLabel } from "@/components/ui/field";
import { InputGroup, InputGroupAddon, InputGroupInput } from "@/components/ui/input-group";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useT } from "@/lib/i18n/provider";
import { unwrap, unwrapAs } from "@/lib/wms/action-client";
import type { ItemType } from "@/lib/wms/constants";
import { formatQty } from "@/lib/wms/format";
import type { ItemDTO } from "@/lib/wms/types";
import { useDebounced, useLoad } from "@/lib/wms/use-load";
import { listItemsAction, setItemActiveAction } from "@/server/actions/items";

import { ConfirmDialog } from "../../_components/wms/confirm-dialogs";
import { PageCard, tableClass } from "../../_components/wms/page-card";
import { ItemTypeBadge } from "../../_components/wms/status-badges";
import { EmptyRow, LoadingRows } from "../../_components/wms/table-states";
import { useCan } from "../../_components/wms/user-context";
import { ItemFormDialog } from "./item-form-dialog";
import { WhereUsedDialog } from "./where-used-dialog";

type TypeFilter = "ALL" | ItemType;

export function ItemsScreen() {
  const t = useT();
  const canWrite = useCan("item:write");
  const [q, setQ] = useState("");
  const [type, setType] = useState<TypeFilter>("ALL");
  const [includeInactive, setIncludeInactive] = useState(false);
  const [form, setForm] = useState<{ item: ItemDTO | null } | null>(null);
  const [whereUsed, setWhereUsed] = useState<ItemDTO | null>(null);
  const [toggle, setToggle] = useState<ItemDTO | null>(null);
  const debouncedQ = useDebounced(q);

  const { data, loading, reload } = useLoad(
    () =>
      unwrapAs<ItemDTO[]>(
        listItemsAction({ type: type === "ALL" ? undefined : type, q: debouncedQ || undefined, includeInactive }),
      ),
    [type, includeInactive, debouncedQ],
  );

  const rows = data ?? [];

  return (
    <>
      <PageCard
        title={t("Item catalog")}
        description={t(
          "Raw materials, semi-finished and finished products. Semi-finished items are only used in BOMs and are not stocked.",
        )}
        actions={
          <>
            <InputGroup className="h-7 w-full md:w-64">
              <InputGroupAddon align="inline-start">
                <Search className="size-3.5" />
              </InputGroupAddon>
              <InputGroupInput
                className="h-7"
                placeholder={t("Search by code or name...")}
                value={q}
                onChange={(event) => setQ(event.target.value)}
              />
            </InputGroup>
            {canWrite ? (
              <Button size="sm" onClick={() => setForm({ item: null })}>
                <Plus /> {t("Add item")}
              </Button>
            ) : null}
          </>
        }
      >
        <div className="flex flex-wrap items-center justify-between gap-3 px-4">
          <Tabs value={type} onValueChange={(value) => setType(value as TypeFilter)}>
            <TabsList>
              <TabsTrigger value="ALL">{t("All")}</TabsTrigger>
              <TabsTrigger value="MATERIAL">{t("Raw material")}</TabsTrigger>
              <TabsTrigger value="SEMI">{t("Semi-finished")}</TabsTrigger>
              <TabsTrigger value="PRODUCT">{t("Finished product")}</TabsTrigger>
            </TabsList>
          </Tabs>
          <Field orientation="horizontal" className="w-auto">
            <Switch id="show-inactive" checked={includeInactive} onCheckedChange={setIncludeInactive} />
            <FieldLabel htmlFor="show-inactive" className="font-normal">
              {t("Show discontinued items")}
            </FieldLabel>
          </Field>
        </div>

        <Table className={tableClass}>
          <TableHeader className="[&_tr]:border-t">
            <TableRow>
              <TableHead>{t("Code")}</TableHead>
              <TableHead>{t("Name")}</TableHead>
              <TableHead>{t("Type")}</TableHead>
              <TableHead>{t("Group")}</TableHead>
              <TableHead>{t("UoM")}</TableHead>
              <TableHead className="text-right">{t("Minimum stock")}</TableHead>
              <TableHead>{t("Notes")}</TableHead>
              <TableHead className="w-10" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? <LoadingRows columns={8} /> : null}
            {!loading && rows.length === 0 ? <EmptyRow columns={8} text={t("No items.")} /> : null}
            {!loading &&
              rows.map((item) => (
                <TableRow key={item._id} className={item.isActive ? "" : "opacity-60"}>
                  <TableCell className="font-medium">{item.code}</TableCell>
                  <TableCell>{item.name}</TableCell>
                  <TableCell>
                    <ItemTypeBadge type={item.type} />
                  </TableCell>
                  <TableCell className="text-muted-foreground">{item.group}</TableCell>
                  <TableCell>{item.unit}</TableCell>
                  <TableCell className="text-right tabular-nums">
                    {item.isStocked ? formatQty(item.minStock) : "-"}
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {item.isActive ? null : <Badge variant="secondary">{t("Inactive")}</Badge>}
                      {item.excludeFromReconciliation ? <Badge variant="outline">{t("Not reconciled")}</Badge> : null}
                    </div>
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon-sm" aria-label={t("Actions")}>
                          <MoreHorizontal />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        {canWrite ? (
                          <DropdownMenuItem onClick={() => setForm({ item })}>{t("Edit")}</DropdownMenuItem>
                        ) : null}
                        {item.type !== "PRODUCT" ? (
                          <DropdownMenuItem onClick={() => setWhereUsed(item)}>
                            {t("Used in which BOMs")}
                          </DropdownMenuItem>
                        ) : null}
                        {canWrite ? (
                          <>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={() => setToggle(item)}>
                              {item.isActive ? t("Deactivate") : t("Reactivate")}
                            </DropdownMenuItem>
                          </>
                        ) : null}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
          </TableBody>
        </Table>
      </PageCard>

      {form ? (
        <ItemFormDialog
          key={form.item?._id ?? "new"}
          item={form.item}
          onClose={() => setForm(null)}
          onSaved={() => {
            setForm(null);
            reload();
          }}
        />
      ) : null}
      <WhereUsedDialog item={whereUsed} onClose={() => setWhereUsed(null)} />
      <ConfirmDialog
        open={toggle !== null}
        onOpenChange={(open) => !open && setToggle(null)}
        title={
          toggle?.isActive
            ? t("Deactivate {code}?", { code: toggle?.code })
            : t("Reactivate {code}?", { code: toggle?.code })
        }
        description={
          toggle?.isActive
            ? t("The item will no longer appear when creating new vouchers and BOMs. Existing data is kept.")
            : undefined
        }
        confirmLabel={t("OK")}
        onConfirm={async () => {
          if (!toggle) return;
          const result = await unwrap(setItemActiveAction(toggle._id, !toggle.isActive));
          if (result !== null) {
            toast.success(t("Updated."));
            setToggle(null);
            reload();
          }
        }}
      />
    </>
  );
}
