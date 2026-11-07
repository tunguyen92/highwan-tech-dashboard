"use server";

import { z } from "zod";

import { run } from "@/server/lib/action";
import { fillByBom } from "@/server/lib/bom-explode";
import { objectId, qty, voucherDraftSchema, voucherFilterSchema } from "@/server/lib/schemas";
import {
  createDraftVoucher,
  type DraftInput,
  deleteDraftVoucher,
  updateDraftVoucher,
} from "@/server/lib/voucher-draft";
import { cancelVoucher, confirmVoucher } from "@/server/lib/voucher-service";
import { Voucher } from "@/server/models/voucher";

export async function listVouchersAction(input: unknown = {}) {
  return run("voucher:read", async () => {
    const f = voucherFilterSchema.parse(input);
    const match: any = {};

    if (f.direction) match.direction = f.direction;
    if (f.type) match.type = f.type;
    if (f.status) match.status = f.status;
    if (f.period) match.period = f.period;
    if (f.search) match.voucherNo = { $regex: `^${f.search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}`, $options: "i" };

    const [rows, total] = await Promise.all([
      Voucher.aggregate([
        { $match: match },
        { $sort: { voucherDate: -1, _id: -1 } },
        { $skip: (f.page - 1) * f.pageSize },
        { $limit: f.pageSize },
        { $addFields: { lineCount: { $size: "$lines" } } },
        { $project: { lines: 0 } },
      ]),
      Voucher.countDocuments(match),
    ]);

    return { rows, total, page: f.page, pageSize: f.pageSize };
  });
}

export async function getVoucherAction(voucherId: unknown) {
  return run("voucher:read", async () => Voucher.findById(objectId.parse(voucherId)).lean());
}

/** Creates a draft when voucherId is null, otherwise updates the existing draft */
export async function saveDraftAction(voucherId: unknown, input: unknown) {
  return run("voucher:write", async (user) => {
    const data = voucherDraftSchema.parse(input) as DraftInput;
    if (voucherId) {
      await updateDraftVoucher(objectId.parse(voucherId), data);
      return { id: String(voucherId) };
    }
    const v = await createDraftVoucher(data, user.id);
    return { id: String(v._id) };
  });
}

export async function deleteDraftAction(voucherId: unknown) {
  return run("voucher:write", async () => {
    await deleteDraftVoucher(objectId.parse(voucherId));
    return null;
  });
}

/** "Fill by norm": returns lines for an EXPORT_PRODUCTION voucher; the client puts them into the draft form */
export async function fillByBomAction(productId: unknown, quantity: unknown) {
  return run("voucher:write", async () => fillByBom(objectId.parse(productId), qty.parse(quantity)));
}

export async function confirmVoucherAction(voucherId: unknown) {
  return run("voucher:confirm", async (user) => {
    const v = await confirmVoucher(objectId.parse(voucherId), user.id);
    return { id: String(v._id), voucherNo: v.voucherNo };
  });
}

export async function cancelVoucherAction(voucherId: unknown, reason: unknown) {
  return run("voucher:cancel", async (user) => {
    await cancelVoucher(objectId.parse(voucherId), user.id, z.string().trim().min(1).max(500).parse(reason));
    return null;
  });
}
