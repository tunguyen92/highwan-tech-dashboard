"use server";

import { can } from "@/lib/wms/permissions";
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

function withoutPrice<T extends { price?: unknown }>(item: T) {
  const result = { ...item };
  delete result.price;
  return result;
}

export async function listItemsAction(input: unknown = {}) {
  return run("item:read", async (user) => {
    const items = await listItems(itemFilterSchema.parse(input));
    return can(user.role, "item:price:read") ? items : items.map(withoutPrice);
  });
}

export async function listItemsPageAction(input: unknown = {}) {
  return run("item:read", async (user) => {
    const result = await listItemsPage(itemPageFilterSchema.parse(input));
    return can(user.role, "item:price:read") ? result : { ...result, rows: result.rows.map(withoutPrice) };
  });
}

export async function getItemAction(itemId: unknown) {
  return run("item:read", async (user) => {
    const item = await Item.findById(objectId.parse(itemId)).lean();
    return item && !can(user.role, "item:price:read") ? withoutPrice(item) : item;
  });
}

export async function createItemAction(input: unknown) {
  return run("item:write", async (user) => {
    const data = itemCreateSchema.parse(input);
    if (data.price !== undefined && !can(user.role, "item:price:read")) throw new Error("FORBIDDEN");
    const item = await createItem(data);
    return { id: String(item._id) };
  });
}

export async function updateItemAction(itemId: unknown, input: unknown) {
  return run("item:write", async (user) => {
    const patch = itemUpdateSchema.parse(input);
    if (!can(user.role, "item:price:read")) {
      if (patch.price !== undefined) throw new Error("FORBIDDEN");
      delete patch.price;
    }
    const item = await updateItem(objectId.parse(itemId), patch);
    return can(user.role, "item:price:read") ? item : withoutPrice(item);
  });
}

export async function setItemActiveAction(itemId: unknown, isActive: unknown) {
  return run("item:write", async () => {
    await setItemActive(objectId.parse(itemId), Boolean(isActive));
    return null;
  });
}
