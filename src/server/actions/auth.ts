"use server";

import bcrypt from "bcryptjs";

import { run, runPublic } from "@/server/lib/action";
import { createSession, destroySession, getCurrentUser, hashPassword, login } from "@/server/lib/auth";
import { changePasswordSchema, loginSchema } from "@/server/lib/schemas";
import { User } from "@/server/models/user";

export async function loginAction(input: unknown) {
  return runPublic(async () => {
    const { username, password } = loginSchema.parse(input);
    return login(username, password);
  });
}

export async function logoutAction() {
  return runPublic(async () => {
    await destroySession();
    return null;
  });
}

/** Current session user, for the UI to decide which menus to show (the server still checks every action) */
export async function meAction() {
  return runPublic(async () => getCurrentUser());
}

export async function changeOwnPasswordAction(input: unknown) {
  // voucher:read is held by every role, so any signed-in user may change their own password
  return run("voucher:read", async (me) => {
    const { current, next } = changePasswordSchema.parse(input);
    const user = await User.findById(me.id).select("+passwordHash");
    if (!user || !(await bcrypt.compare(current, user.passwordHash))) throw new Error("WRONG_PASSWORD");

    user.passwordHash = await hashPassword(next);
    user.tokenVersion += 1; // signs out every other device
    await user.save();
    await createSession(user); // keep this device signed in
    return null;
  });
}
