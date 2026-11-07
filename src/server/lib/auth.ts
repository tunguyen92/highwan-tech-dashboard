import { cookies } from "next/headers";

import bcrypt from "bcryptjs";
import { jwtVerify, SignJWT } from "jose";

import { can, type Permission } from "@/lib/wms/permissions";
import { ROLE, type Role, User } from "@/server/models/user";

import { connectDB } from "./db";
import { isWarehouseDemoMode } from "./demo-mode";

const COOKIE = "session";
const SESSION_HOURS = 12;
const MAX_FAILED_LOGINS = 5;
const LOCK_MINUTES = 15;
// Compared against when the username does not exist, so response time does not reveal valid usernames
const DUMMY_HASH = bcrypt.hashSync("dummy-password", 10);

export type SessionUser = { id: string; username: string; name: string; role: Role; demo?: boolean };

const secret = () => {
  const s = process.env.AUTH_SECRET;
  if (!s || s.length < 32) throw new Error("AUTH_SECRET must be set and at least 32 characters");
  return new TextEncoder().encode(s);
};

export const hashPassword = (plain: string) => bcrypt.hash(plain, 12);

export async function createSession(user: { _id: any; tokenVersion: number }) {
  const token = await new SignJWT({ tv: user.tokenVersion })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(String(user._id))
    .setIssuedAt()
    .setExpirationTime(`${SESSION_HOURS}h`)
    .sign(secret());

  (await cookies()).set(COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_HOURS * 3600,
  });
}

export async function destroySession() {
  (await cookies()).delete(COOKIE);
}

/** Reads the cookie, then re-checks the user in the DB so deactivation / role changes apply immediately */
export async function getCurrentUser(): Promise<SessionUser | null> {
  if (isWarehouseDemoMode()) {
    return {
      id: "000000000000000000000001",
      username: "demo-admin",
      name: "Warehouse Demo",
      role: ROLE.ADMIN,
      demo: true,
    };
  }

  // Local development only: DEV_AUTH_BYPASS=true skips login and acts as a fixed administrator.
  if (process.env.NODE_ENV === "development" && process.env.DEV_AUTH_BYPASS === "true") {
    return { id: "000000000000000000000001", username: "dev-admin", name: "Dev Admin", role: ROLE.ADMIN };
  }

  const token = (await cookies()).get(COOKIE)?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secret());
    await connectDB();
    const user = await User.findById(payload.sub);
    if (!user || !user.isActive || user.tokenVersion !== payload.tv) return null;
    return { id: String(user._id), username: user.username, name: user.name, role: user.role };
  } catch {
    return null;
  }
}

export async function requirePermission(permission: Permission): Promise<SessionUser> {
  const user = await getCurrentUser();
  if (!user) throw new Error("UNAUTHENTICATED");
  if (!can(user.role, permission)) throw new Error("FORBIDDEN");
  return user;
}

export async function login(username: string, password: string) {
  const user = await User.findOne({ username: username.trim().toLowerCase() }).select("+passwordHash");
  if (user?.lockedUntil && user.lockedUntil > new Date()) throw new Error("ACCOUNT_LOCKED");

  const ok = await bcrypt.compare(password, user?.passwordHash ?? DUMMY_HASH);
  if (!user || !user.isActive || !ok) {
    if (user) {
      const updated = await User.findByIdAndUpdate(
        user._id,
        { $inc: { failedLoginCount: 1 } },
        { returnDocument: "after" },
      );

      if (updated && updated.failedLoginCount >= MAX_FAILED_LOGINS) {
        await User.updateOne(
          { _id: user._id },
          { $set: { failedLoginCount: 0, lockedUntil: new Date(Date.now() + LOCK_MINUTES * 60_000) } },
        );
      }
    }
    throw new Error("INVALID_CREDENTIALS");
  }

  await User.updateOne(
    { _id: user._id },
    { $set: { failedLoginCount: 0, lastLoginAt: new Date() }, $unset: { lockedUntil: "" } },
  );

  await createSession(user);
  return { id: String(user._id), username: user.username, name: user.name, role: user.role };
}
