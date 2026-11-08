import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import type { ItemDTO } from "@/lib/wms/types";

type PaginatedItems = { rows: ItemDTO[]; total: number; page: number; pageSize: number };

export function useItems(page = 1, pageSize = 20) {
  return useQuery<PaginatedItems>({
    queryKey: ["items", page, pageSize],
    queryFn: async () => {
      const response = await fetch(`/api/items?page=${page}&pageSize=${pageSize}`);
      if (!response.ok) throw new Error("Failed to fetch items");
      return response.json();
    },
  });
}

export function useUpdateItem() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (item: any) =>
      fetch(`/api/items/${item._id}`, {
        method: "PUT",
        body: JSON.stringify(item),
      }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["items"] }),
  });
}
