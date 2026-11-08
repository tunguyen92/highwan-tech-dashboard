"use server";

import { run } from "@/server/lib/action";
import { createItem, listItems, listItemsPage, setItemActive, updateItem } from "@/server/lib/item-service";
import {
  itemCreateSchema,
  itemFilterSchema,
  itemPageFilterSchema,
  itemUpdateSchema,
  objectId,
} from "@/server/lib/schemas";
import { Item } from "@/server/models/item";

export async function listItemsAction(input: unknown = {}) {
  return run("item:read", async () => listItems(itemFilterSchema.parse(input)));
}

export async function listItemsPageAction(input: unknown = {}) {
  return run("item:read", async () => listItemsPage(itemPageFilterSchema.parse(input)));
}

export async function getItemAction(itemId: unknown) {
  return run("item:read", async () => Item.findById(objectId.parse(itemId)).lean());
}

export async function createItemAction(input: unknown) {
  return run("item:write", async () => {
    const item = await createItem(itemCreateSchema.parse(input));
    return { id: String(item._id) };
  });
}

export async function updateItemAction(itemId: unknown, input: unknown) {
  return run("item:write", async () => updateItem(objectId.parse(itemId), itemUpdateSchema.parse(input)));
}

export async function setItemActiveAction(itemId: unknown, isActive: unknown) {
  return run("item:write", async () => {
    await setItemActive(objectId.parse(itemId), Boolean(isActive));
    return null;
  });
}
