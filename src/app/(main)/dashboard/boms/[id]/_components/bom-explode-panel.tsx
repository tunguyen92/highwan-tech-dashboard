"use client";

import { useState } from "react";

import { Calculator, Download } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Field, FieldDescription, FieldLabel } from "@/components/ui/field";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useT } from "@/lib/i18n/provider";
import { unwrapAs } from "@/lib/wms/action-client";
import { downloadCsv } from "@/lib/wms/csv";
import { formatQty } from "@/lib/wms/format";
import type { BomRequirementsDTO } from "@/lib/wms/types";
import { explodePreviewAction } from "@/server/actions/boms";

import { tableClass } from "../../../_components/wms/page-card";
import { QtyInput } from "../../../_components/wms/qty-input";

/** Total raw-material requirement for N finished products, using the ACTIVE BOM (all levels merged) */
export function BomExplodePanel({ outputItemId, outputItemCode }: { outputItemId: string; outputItemCode: string }) {
  const t = useT();
  const [quantity, setQuantity] = useState("100");
  const [result, setResult] = useState<BomRequirementsDTO | null>(null);
  const [busy, setBusy] = useState(false);

  async function calculate() {
    setBusy(true);
    setResult(await unwrapAs<BomRequirementsDTO>(explodePreviewAction(outputItemId, quantity)));
    setBusy(false);
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-end gap-3 px-4">
        <Field className="w-44">
          <FieldLabel htmlFor="explode-qty">
            {t("Quantity")} {outputItemCode}
          </FieldLabel>
          <QtyInput id="explode-qty" value={quantity} onChange={setQuantity} />
        </Field>
        <Button onClick={() => void calculate()} disabled={busy || quantity === "" || Number(quantity) <= 0}>
          <Calculator /> {t("Calculate requirement")}
        </Button>
        {result ? (
          <Button
            variant="outline"
            onClick={() =>
              downloadCsv(
                `nhu-cau-${outputItemCode}.csv`,
                [t("Code"), t("Name"), t("UoM"), t("Requirement per BOM"), t("Rounded up")],
                result.lines.map((l) => [l.itemCode, l.itemName, l.unit, l.normQuantity, l.quantity]),
              )
            }
          >
            <Download /> {t("Export CSV")}
          </Button>
        ) : null}
      </div>
      <FieldDescription className="px-4">
        {t(
          "Uses the active BOM, expands every level down to raw materials and merges codes that repeat across branches.",
        )}
      </FieldDescription>

      {result ? (
        <Table className={tableClass}>
          <TableHeader className="[&_tr]:border-t">
            <TableRow>
              <TableHead>{t("Code")}</TableHead>
              <TableHead>{t("Name")}</TableHead>
              <TableHead>{t("UoM")}</TableHead>
              <TableHead className="text-right">{t("Per BOM")}</TableHead>
              <TableHead className="text-right">{t("Rounded up")}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {result.lines.map((line) => (
              <TableRow key={line.itemId}>
                <TableCell className="font-medium">{line.itemCode}</TableCell>
                <TableCell>{line.itemName}</TableCell>
                <TableCell>{line.unit}</TableCell>
                <TableCell className="text-right tabular-nums">{formatQty(line.normQuantity)}</TableCell>
                <TableCell className="text-right font-medium tabular-nums">{formatQty(line.quantity)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      ) : null}
    </div>
  );
}
