import type { ReactNode } from "react";

import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

/** Standard WMS screen frame: title, description, action buttons, content. Mirrors the template's Users screen. */
export function PageCard({
  title,
  description,
  actions,
  children,
}: {
  title: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  children: ReactNode;
}) {
  return (
    <Card>
      <CardHeader className="border-b has-data-[slot=card-action]:grid-cols-1 md:has-data-[slot=card-action]:grid-cols-[1fr_auto]">
        <CardTitle className="text-xl leading-none">{title}</CardTitle>
        {description ? <CardDescription className="max-w-xl leading-snug">{description}</CardDescription> : null}
        {actions ? (
          <CardAction className="col-start-1 row-start-auto flex w-full flex-wrap justify-start gap-2 justify-self-stretch md:col-start-2 md:row-span-2 md:row-start-1 md:w-auto md:flex-nowrap md:justify-end md:justify-self-end">
            {actions}
          </CardAction>
        ) : null}
      </CardHeader>
      <CardContent className="flex flex-col gap-4 px-0">{children}</CardContent>
    </Card>
  );
}

/** Table styling shared by every WMS table (matches the template's tables) */
export const tableClass = "**:data-[slot='table-cell']:px-4 **:data-[slot='table-head']:px-4";
