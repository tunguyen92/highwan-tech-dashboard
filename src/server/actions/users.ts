"use server";

import { run } from "@/server/lib/action";
import { hashPassword } from "@/server/lib/auth";
import { createUserSchema, objectId, password, updateUserSchema } from "@/server/lib/schemas";
import { ROLE, User } from "@/server/models/user";

export async function listUsersAction() {
  return run("user:manage", async () => User.find().sort({ username: 1 }).lean());
}

export async function createUserAction(input: unknown) {
  return run("user:manage", async () => {
    const d = createUserSchema.parse(input);
    const u = await User.create({
      username: d.username,
      name: d.name,
      role: d.role,
      passwordHash: await hashPassword(d.password),
    });
    return { id: String(u._id) };
  });
}

export async function updateUserAction(userId: unknown, input: unknown) {
  return run("user:manage", async (me) => {
    const id = objectId.parse(userId);
    const patch = updateUserSchema.parse(input);
    const target = await User.findById(id);
    if (!target) throw new Error("USER_NOT_FOUND");

    const losesAdmin =
      target.role === ROLE.ADMIN &&
      target.isActive &&
      ((patch.role !== undefined && patch.role !== ROLE.ADMIN) || patch.isActive === false);

    if (id === me.id && (patch.role !== undefined || patch.isActive === false)) throw new Error("CANNOT_MODIFY_SELF");
    if (losesAdmin && (await User.countDocuments({ role: ROLE.ADMIN, isActive: true, _id: { $ne: id } })) === 0) {
      throw new Error("LAST_ADMIN");
    }

    target.set(patch);
    target.tokenVersion += 1; // role / status changes take effect immediately
    await target.save();
    return null;
  });
}

export async function resetPasswordAction(userId: unknown, newPassword: unknown) {
  return run("user:manage", async () => {
    const id = objectId.parse(userId);
    const hash = await hashPassword(password.parse(newPassword));
    const res = await User.updateOne(
      { _id: id },
      {
        $set: { passwordHash: hash, failedLoginCount: 0 },
        $unset: { lockedUntil: "" },
        $inc: { tokenVersion: 1 },
      },
    );
    if (res.matchedCount === 0) throw new Error("USER_NOT_FOUND");
    return null;
  });
}
