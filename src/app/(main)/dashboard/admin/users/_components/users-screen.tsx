"use client";

import { useState } from "react";

import { MoreHorizontal, Plus } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useT } from "@/lib/i18n/provider";
import { unwrapAs } from "@/lib/wms/action-client";
import { ROLE_LABEL } from "@/lib/wms/constants";
import { formatDateTime } from "@/lib/wms/format";
import type { UserDTO } from "@/lib/wms/types";
import { useLoad } from "@/lib/wms/use-load";
import { listUsersAction } from "@/server/actions/users";

import { PageCard, tableClass } from "../../../_components/wms/page-card";
import { EmptyRow, LoadingRows } from "../../../_components/wms/table-states";
import { useWmsUser } from "../../../_components/wms/user-context";
import { CreateUserDialog, EditUserDialog, ResetPasswordDialog } from "./user-dialogs";

type DialogState = { kind: "create" } | { kind: "edit"; user: UserDTO } | { kind: "reset"; user: UserDTO } | null;

export function UsersScreen() {
  const t = useT();
  const me = useWmsUser();
  const [dialog, setDialog] = useState<DialogState>(null);
  const { data, loading, reload } = useLoad(() => unwrapAs<UserDTO[]>(listUsersAction()), []);
  const rows = data ?? [];

  return (
    <>
      <PageCard
        title={t("Users")}
        description={t(
          "Manage accounts and roles. Administrator: full access. Manager: catalog, BOMs, vouchers, cancelling vouchers. Storekeeper: create and confirm vouchers. Viewer: read only.",
        )}
        actions={
          <Button size="sm" onClick={() => setDialog({ kind: "create" })}>
            <Plus /> {t("Add user")}
          </Button>
        }
      >
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
            {!loading &&
              rows.map((user) => (
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
                  </TableCell>
                </TableRow>
              ))}
          </TableBody>
        </Table>
      </PageCard>

      {dialog?.kind === "create" ? (
        <CreateUserDialog
          onClose={() => setDialog(null)}
          onSaved={() => {
            setDialog(null);
            reload();
          }}
        />
      ) : null}
      {dialog?.kind === "edit" ? (
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
      {dialog?.kind === "reset" ? (
        <ResetPasswordDialog key={dialog.user._id} user={dialog.user} onClose={() => setDialog(null)} />
      ) : null}
    </>
  );
}
