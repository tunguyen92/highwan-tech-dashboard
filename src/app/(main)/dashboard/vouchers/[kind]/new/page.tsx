import { notFound } from "next/navigation";

import type { Metadata } from "next";

import { getServerT } from "@/lib/i18n/server";

import { GoodsIssueEditor } from "../../_components/goods-issue-editor";
import { GoodsReceiptEditor } from "../../_components/goods-receipt-editor";

type Props = {
  params: Promise<{ kind: string }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { kind } = await params;
  if (kind !== "import" && kind !== "export") notFound();

  const t = await getServerT();
  return { title: kind === "import" ? t("Create goods receipt") : t("Create goods issue") };
}

export default async function Page({ params, searchParams }: Props) {
  const { kind } = await params;
  if (kind !== "import" && kind !== "export") notFound();

  const { id } = await searchParams;
  const voucherId = typeof id === "string" ? id : null;

  return kind === "import" ? <GoodsReceiptEditor voucherId={voucherId} /> : <GoodsIssueEditor voucherId={voucherId} />;
}
