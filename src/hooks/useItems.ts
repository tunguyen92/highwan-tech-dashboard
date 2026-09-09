import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

export function useItems() {
  return useQuery({
    queryKey: ["items"],
    queryFn: () => fetch("/api/items").then((res) => res.json()),
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
