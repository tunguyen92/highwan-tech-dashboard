import type { Metadata } from "next";

import { getServerT } from "@/lib/i18n/server";

import { PayslipSplitter } from "./_components/payslip-splitter";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getServerT();
  return {
    title: t("Payslip Splitter"),
    description: t("Split a salary workbook into individual payslip files and download them as a ZIP archive."),
    alternates: {
      canonical: "/tools/payslip",
    },
  };
}

export default async function Page() {
  const t = await getServerT();

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl leading-none tracking-tight">{t("Payslip")}</h1>
        <p className="text-muted-foreground text-sm">
          {t("Turn a salary workbook into one Excel file per employee, packaged in a ZIP.")}
        </p>
      </div>
      <PayslipSplitter />
    </div>
  );
}
