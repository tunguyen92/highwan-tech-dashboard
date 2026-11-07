import type { Metadata } from "next";

import { getServerT } from "@/lib/i18n/server";

import { BomEditor } from "./_components/bom-editor";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getServerT();
  return { title: t("BOM details") };
}

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <BomEditor bomId={id} />;
}
