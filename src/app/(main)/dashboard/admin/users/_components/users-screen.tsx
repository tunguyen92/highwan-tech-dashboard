"use client";

import { useState } from "react";

import { MoreHorizontal, Plus, Search } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { InputGroup, InputGroupAddon, InputGroupInput } from "@/components/ui/input-group";
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useT } from "@/lib/i18n/provider";
import { unwrapAs } from "@/lib/wms/action-client";
import { ROLE, ROLE_LABEL, type Role } from "@/lib/wms/constants";
import { formatDateTime } from "@/lib/wms/format";
import type { UserDTO } from "@/lib/wms/types";
import { useLoad } from "@/lib/wms/use-load";
import { listUsersAction } from "@/server/actions/users";

import { PageCard, tableClass } from "../../../_components/wms/page-card";
import { EmptyRow, LoadingRows } from "../../../_components/wms/table-states";
import { useCan, useWmsUser } from "../../../_components/wms/user-context";
import { CreateUserDialog, EditUserDialog, ResetPasswordDialog } from "./user-dialogs";

type DialogState = { kind: "create" } | { kind: "edit"; user: UserDTO } | { kind: "reset"; user: UserDTO } | null;

export function UsersScreen() {
  const t = useT();
  const me = useWmsUser();
  const canManage = useCan("user:manage");
  const [dialog, setDialog] = useState<DialogState>(null);
  const [query, setQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState<Role | "ALL">("ALL");
  const [statusFilter, setStatusFilter] = useState<"ALL" | "ACTIVE" | "LOCKED">("ALL");
  const { data, loading, reload } = useLoad(() => unwrapAs<UserDTO[]>(listUsersAction()), []);
  const rows = data ?? [];
  const normalizedQuery = query.trim().toLowerCase();
  const filteredRows = rows.filter((user) => {
    const matchesQuery =
      !normalizedQuery ||
      user.username.toLowerCase().includes(normalizedQuery) ||
      user.name.toLowerCase().includes(normalizedQuery);
    const matchesRole = roleFilter === "ALL" || user.role === roleFilter;
    const matchesStatus = statusFilter === "ALL" || (statusFilter === "ACTIVE" ? user.isActive : !user.isActive);
    return matchesQuery && matchesRole && matchesStatus;
  });

  return (
    <>
      <PageCard
        title={t("Users")}
        description={t(
          "Manage accounts and roles. Administrator: full access. Manager: catalog, BOMs, vouchers, cancelling vouchers. Storekeeper: create and confirm vouchers. Viewer: read only.",
        )}
        actions={
          canManage ? (
            <>
              <InputGroup className="h-7 w-full md:w-64">
                <InputGroupAddon>
                  <Search />
                </InputGroupAddon>
                <InputGroupInput
                  aria-label={t("Search by username or name...")}
                  placeholder={t("Search by username or name...")}
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                />
              </InputGroup>
              <Button size="sm" onClick={() => setDialog({ kind: "create" })}>
                <Plus data-icon="inline-start" /> {t("Add user")}
              </Button>
            </>
          ) : null
        }
      >
        <div className="flex flex-wrap items-center gap-3 px-4">
          <Select value={roleFilter} onValueChange={(value) => setRoleFilter(value as Role | "ALL")}>
            <SelectTrigger size="sm" aria-label={t("Role")}>
              <span className="text-muted-foreground">{t("Role")}:</span>
              <SelectValue />
            </SelectTrigger>
            <SelectContent position="popper" align="start">
              <SelectGroup>
                <SelectItem value="ALL">{t("All")}</SelectItem>
                {Object.values(ROLE).map((role) => (
                  <SelectItem key={role} value={role}>
                    {t(ROLE_LABEL[role])}
                  </SelectItem>
                ))}
              </SelectGroup>
            </SelectContent>
          </Select>

          <Select value={statusFilter} onValueChange={(value) => setStatusFilter(value as typeof statusFilter)}>
            <SelectTrigger size="sm" aria-label={t("Status")}>
              <span className="text-muted-foreground">{t("Status")}:</span>
              <SelectValue />
            </SelectTrigger>
            <SelectContent position="popper" align="start">
              <SelectGroup>
                <SelectItem value="ALL">{t("All")}</SelectItem>
                <SelectItem value="ACTIVE">{t("Active")}</SelectItem>
                <SelectItem value="LOCKED">{t("Locked")}</SelectItem>
              </SelectGroup>
            </SelectContent>
          </Select>
        </div>

        <Table className={tableClass}>
          <TableHeader className="[&_tr]:border-t">
            <TableRow>
              <TableHead>{t("Username")}</TableHead>
              <TableHead>{t("Full name")}</TableHead>
              <TableHead>{t("Role")}</TableHead>
              <TableHead>{t("Status")}</TableHead>
              <TableHead>{t("Last sign-in")}</TableHead>
              <TableHead className="w-10" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? <LoadingRows columns={6} /> : null}
            {!loading && rows.length === 0 ? <EmptyRow columns={6} /> : null}
            {!loading && rows.length > 0 && filteredRows.length === 0 ? (
              <EmptyRow columns={6} text={t("No matching users.")} />
            ) : null}
            {!loading &&
              filteredRows.map((user) => (
                <TableRow key={user._id}>
                  <TableCell className="font-medium">
                    {user.username} {user._id === me.id ? <Badge variant="outline">{t("You")}</Badge> : null}
                  </TableCell>
                  <TableCell>{user.name}</TableCell>
                  <TableCell>{t(ROLE_LABEL[user.role])}</TableCell>
                  <TableCell>
                    {user.isActive ? (
                      <Badge variant="outline">{t("Active")}</Badge>
                    ) : (
                      <Badge variant="secondary">{t("Locked")}</Badge>
                    )}
                    {user.lockedUntil && new Date(user.lockedUntil) > new Date() ? (
                      <Badge variant="destructive" className="ml-1">
                        {t("Temporarily locked (wrong password)")}
                      </Badge>
                    ) : null}
                  </TableCell>
                  <TableCell className="text-muted-foreground">{formatDateTime(user.lastLoginAt)}</TableCell>
                  <TableCell>
                    {canManage ? (
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon-sm" aria-label={t("Actions")}>
                            <MoreHorizontal />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => setDialog({ kind: "edit", user })}>
                            {t("Edit role / status")}
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => setDialog({ kind: "reset", user })}>
                            {t("Reset password")}
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    ) : null}
                  </TableCell>
                </TableRow>
              ))}
          </TableBody>
        </Table>
      </PageCard>

      {canManage && dialog?.kind === "create" ? (
        <CreateUserDialog
          onClose={() => setDialog(null)}
          onSaved={() => {
            setDialog(null);
            reload();
          }}
        />
      ) : null}
      {canManage && dialog?.kind === "edit" ? (
        <EditUserDialog
          key={dialog.user._id}
          user={dialog.user}
          onClose={() => setDialog(null)}
          onSaved={() => {
            setDialog(null);
            reload();
          }}
        />
      ) : null}
      {canManage && dialog?.kind === "reset" ? (
        <ResetPasswordDialog key={dialog.user._id} user={dialog.user} onClose={() => setDialog(null)} />
      ) : null}
    </>
  );
}
