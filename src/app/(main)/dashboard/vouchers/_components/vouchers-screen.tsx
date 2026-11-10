"use client";

import { useState } from "react";

import { useRouter } from "next/navigation";

import { Plus, Search } from "lucide-react";

import { CalendarDatePicker } from "@/components/calendar-date-picker";
import { Button } from "@/components/ui/button";
import { InputGroup, InputGroupAddon, InputGroupInput } from "@/components/ui/input-group";
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useT } from "@/lib/i18n/provider";
import { unwrapAs } from "@/lib/wms/action-client";
import {
  VOUCHER_RULES,
  VOUCHER_STATUS_LABEL,
  VOUCHER_TYPE_LABEL,
  type VoucherStatus,
  type VoucherType,
} from "@/lib/wms/constants";
import { formatDate } from "@/lib/wms/format";
import type { VoucherListRow } from "@/lib/wms/types";
import { useDebounced, useLoad } from "@/lib/wms/use-load";
import { listVouchersAction } from "@/server/actions/vouchers";

import { PageCard, tableClass } from "../../_components/wms/page-card";
import { PaginationBar } from "../../_components/wms/pagination-bar";
import { VoucherStatusBadge } from "../../_components/wms/status-badges";
import { EmptyRow, LoadingRows } from "../../_components/wms/table-states";
import { useCan } from "../../_components/wms/user-context";
import { VoucherSheet } from "./voucher-sheet";

type ListResult = { rows: VoucherListRow[]; total: number; page: number; pageSize: number };
const PAGE_SIZE = 20;

export function VouchersScreen({ direction }: { direction: "IN" | "OUT" }) {
  const router = useRouter();
  const t = useT();
  const canWrite = useCan("voucher:write");
  const isImport = direction === "IN";
  const types = (Object.keys(VOUCHER_RULES) as VoucherType[]).filter((t) => VOUCHER_RULES[t].direction === direction);

  const [type, setType] = useState<"ALL" | VoucherType>("ALL");
  const [status, setStatus] = useState<"ALL" | VoucherStatus>("ALL");
  const [period, setPeriod] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [sheet, setSheet] = useState<{ id: string | null } | null>(null);
  const debouncedSearch = useDebounced(search);

  const { data, loading, reload } = useLoad(
    () =>
      unwrapAs<ListResult>(
        listVouchersAction({
          direction,
          type: type === "ALL" ? undefined : type,
          status: status === "ALL" ? undefined : status,
          period: period || undefined,
          search: debouncedSearch || undefined,
          page,
          pageSize: PAGE_SIZE,
        }),
      ),
    [direction, type, status, period, debouncedSearch, page],
  );

  const rows = data?.rows ?? [];

  return (
    <>
      <PageCard
        title={isImport ? t("Goods receipts") : t("Goods issues")}
        description={
          isImport
            ? t(
                "Receive raw materials from the partner and finished products from production. A voucher only posts to the stock ledger once confirmed.",
              )
            : t(
                "Issue goods. Confirming a finished-product issue also deducts its active BOM materials. Issuing more than the stock is not allowed.",
              )
        }
        actions={
          <>
            <InputGroup className="h-7 w-full md:w-56">
              <InputGroupAddon align="inline-start">
                <Search className="size-3.5" />
              </InputGroupAddon>
              <InputGroupInput
                className="h-7"
                placeholder={t("Search by voucher number...")}
                value={search}
                onChange={(event) => {
                  setSearch(event.target.value);
                  setPage(1);
                }}
              />
            </InputGroup>
            {canWrite ? (
              <Button
                size="sm"
                onClick={() => router.push(`/dashboard/vouchers/${isImport ? "import" : "export"}/new`)}
              >
                <Plus /> {t("Create voucher")}
              </Button>
            ) : null}
          </>
        }
      >
        <div className="flex flex-wrap items-center gap-3 px-4">
          <Select
            value={type}
            onValueChange={(value) => {
              setType(value as "ALL" | VoucherType);
              setPage(1);
            }}
          >
            <SelectTrigger size="sm">
              <span className="text-muted-foreground">{t("Type:")}</span>
              <SelectValue />
            </SelectTrigger>
            <SelectContent position="popper" align="start">
              <SelectGroup>
                <SelectItem value="ALL">{t("All")}</SelectItem>
                {types.map((voucherType) => (
                  <SelectItem key={voucherType} value={voucherType}>
                    {t(VOUCHER_TYPE_LABEL[voucherType])}
                  </SelectItem>
                ))}
              </SelectGroup>
            </SelectContent>
          </Select>

          <Select
            value={status}
            onValueChange={(value) => {
              setStatus(value as "ALL" | VoucherStatus);
              setPage(1);
            }}
          >
            <SelectTrigger size="sm">
              <span className="text-muted-foreground">{t("Status:")}</span>
              <SelectValue />
            </SelectTrigger>
            <SelectContent position="popper" align="start">
              <SelectGroup>
                <SelectItem value="ALL">{t("All")}</SelectItem>
                {(Object.keys(VOUCHER_STATUS_LABEL) as VoucherStatus[]).map((s) => (
                  <SelectItem key={s} value={s}>
                    {t(VOUCHER_STATUS_LABEL[s])}
                  </SelectItem>
                ))}
              </SelectGroup>
            </SelectContent>
          </Select>

          <div className="flex items-center gap-2 text-sm">
            <span className="text-muted-foreground">{t("Month:")}</span>
            <CalendarDatePicker
              id="vouchers-period"
              type="month"
              value={period}
              clearable
              onChange={(value) => {
                setPeriod(value);
                setPage(1);
              }}
            />
          </div>
        </div>

        <Table className={tableClass}>
          <TableHeader className="[&_tr]:border-t">
            <TableRow>
              <TableHead>{t("Voucher no.")}</TableHead>
              <TableHead>{t("Type")}</TableHead>
              <TableHead>{t("Date")}</TableHead>
              <TableHead className="text-right">{t("Lines")}</TableHead>
              <TableHead>{t("Status")}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? <LoadingRows columns={5} /> : null}
            {!loading && rows.length === 0 ? <EmptyRow columns={5} text={t("No vouchers yet.")} /> : null}
            {!loading &&
              rows.map((row) => (
                <TableRow key={row._id}>
                  <TableCell>
                    <Button
                      variant="link"
                      className="h-auto p-0 font-medium underline underline-offset-4"
                      onClick={() => setSheet({ id: row._id })}
                    >
                      <span className="flex flex-col items-start">
                        <span>{row.documentNumber ?? row.voucherNo ?? t("(Draft)")}</span>
                        {row.documentNumber && row.voucherNo ? (
                          <span className="text-muted-foreground text-xs">{row.voucherNo}</span>
                        ) : null}
                      </span>
                    </Button>
                  </TableCell>
                  <TableCell>{t(VOUCHER_TYPE_LABEL[row.type])}</TableCell>
                  <TableCell>{formatDate(row.voucherDate)}</TableCell>
                  <TableCell className="text-right tabular-nums">{row.lineCount}</TableCell>
                  <TableCell>
                    <VoucherStatusBadge status={row.status} />
                  </TableCell>
                </TableRow>
              ))}
          </TableBody>
        </Table>
        <PaginationBar page={page} pageSize={PAGE_SIZE} total={data?.total ?? 0} onPageChange={setPage} />
      </PageCard>

      {sheet ? (
        <VoucherSheet
          key={sheet.id ?? "new"}
          direction={direction}
          voucherId={sheet.id}
          onClose={() => setSheet(null)}
          onChanged={reload}
        />
      ) : null}
    </>
  );
}
