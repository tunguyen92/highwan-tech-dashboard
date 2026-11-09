import { notFound } from "next/navigation";

import type { Metadata } from "next";

import { getServerT } from "@/lib/i18n/server";

import { VoucherDocumentEditor } from "../../_components/voucher-document-editor";

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
  return (
    <VoucherDocumentEditor
      direction={kind === "import" ? "IN" : "OUT"}
      voucherId={typeof id === "string" ? id : null}
    />
  );
}
