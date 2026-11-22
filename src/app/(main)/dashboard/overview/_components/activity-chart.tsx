"use client";

import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  type ChartConfig,
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import { useT } from "@/lib/i18n/provider";
import type { OverviewDTO } from "@/lib/wms/types";

const shortDate = (ymd: string) => `${ymd.slice(8, 10)}/${ymd.slice(5, 7)}`;

export function ActivityChart({ data }: { data: OverviewDTO["activity"] }) {
  const t = useT();
  const config = {
    receipts: { label: t("Receipts"), color: "var(--chart-1)" },
    issues: { label: t("Issues"), color: "var(--chart-4)" },
  } satisfies ChartConfig;
  const empty = data.every((d) => d.receipts === 0 && d.issues === 0);

  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle>{t("Warehouse activity")}</CardTitle>
        <CardDescription>{t("Confirmed vouchers per day, last 30 days")}</CardDescription>
      </CardHeader>
      <CardContent>
        {empty ? (
          <div className="text-muted-foreground grid h-64 place-items-center text-sm">
            {t("No confirmed vouchers in the last 30 days.")}
          </div>
        ) : (
          <ChartContainer config={config} className="h-64 w-full">
            <BarChart accessibilityLayer data={data} margin={{ left: 0, right: 0, top: 4, bottom: 0 }}>
              <CartesianGrid vertical={false} />
              <XAxis
                dataKey="date"
                tickLine={false}
                axisLine={false}
                tickMargin={8}
                minTickGap={24}
                tickFormatter={shortDate}
              />
              <YAxis width={28} allowDecimals={false} tickLine={false} axisLine={false} />
              <ChartTooltip content={<ChartTooltipContent labelFormatter={(value) => shortDate(String(value))} />} />
              <ChartLegend content={<ChartLegendContent />} />
              <Bar dataKey="receipts" fill="var(--color-receipts)" radius={[3, 3, 0, 0]} />
              <Bar dataKey="issues" fill="var(--color-issues)" radius={[3, 3, 0, 0]} />
            </BarChart>
          </ChartContainer>
        )}
      </CardContent>
    </Card>
  );
}
