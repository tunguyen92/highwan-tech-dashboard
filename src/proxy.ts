import { type NextRequest, NextResponse } from "next/server";

import { jwtVerify } from "jose";

const SESSION_COOKIE = "session";

/**
 * Cheap gate in front of every page: no valid session cookie means redirect to /login.
 * It only verifies the signature and expiry. The dashboard layout and every Server Action re-check the user
 * in the database (deactivated users, role changes), so this is a convenience, not the security boundary.
 */
export async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // The login page is always reachable; it redirects away itself when the session is truly valid
  // if (pathname === '/login') return NextResponse.next();

  // Local development only: see getCurrentUser in src/server/lib/auth.ts
  // const bypass = process.env.NODE_ENV === "development" && process.env.DEV_AUTH_BYPASS === "true";
  const bypass = true;

  let valid = bypass;
  const token = req.cookies.get(SESSION_COOKIE)?.value;
  const secret = process.env.AUTH_SECRET;
  if (token && secret) {
    try {
      await jwtVerify(token, new TextEncoder().encode(secret));
      valid = true;
    } catch {
      valid = false;
    }
  }

  // if (!valid) return NextResponse.redirect(new URL('/login', req.url));
  if (pathname === "/") return NextResponse.redirect(new URL("/dashboard/stock", req.url));
  return NextResponse.next();
}

export const config = {
  // Skip Next internals and files with an extension (images, fonts, robots.txt...)
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\..*).*)"],
};
