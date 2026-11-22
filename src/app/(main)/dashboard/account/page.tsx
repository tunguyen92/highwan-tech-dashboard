import type { Metadata } from "next";

import { getServerT } from "@/lib/i18n/server";

import { AccountScreen } from "./_components/account-screen";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getServerT();
  return { title: t("Account") };
}

export default function Page() {
  return <AccountScreen />;
}
