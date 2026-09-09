"use client";

import { useItems } from "@/hooks/useItems";

import { Items } from "./_components/items";

export default function Page() {
  const { data: items, isLoading } = useItems();

  if (isLoading) {
    return (
      <div className="flex size-full items-center justify-center text-muted-foreground text-sm">Loading items...</div>
    );
  }

  return <Items items={items || []} />;
}
