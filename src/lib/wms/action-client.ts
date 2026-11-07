import { toast } from "sonner";

import { translate } from "@/lib/i18n/translate";
import { getFormatLocale } from "@/lib/wms/format";
import type { ActionResult } from "@/server/lib/action";

/**
 * Unwraps a Server Action result on the client: returns the data, or shows a toast and returns null.
 * A lost session sends the user back to the login page.
 */
export async function unwrap<T>(promise: Promise<ActionResult<T>>, opts: { silent?: boolean } = {}): Promise<T | null> {
  try {
    const result = await promise;
    if (result.ok) return result.data;
    if (result.code === "UNAUTHENTICATED") {
      window.location.href = "/login";
      return null;
    }
    if (!opts.silent) toast.error(result.message);
    return null;
  } catch {
    if (!opts.silent) toast.error(translate(getFormatLocale(), "Cannot reach the server. Please try again."));
    return null;
  }
}

/** Same as `unwrap`, but lets the caller state the client-side DTO shape of the result. */
export async function unwrapAs<T>(promise: Promise<ActionResult<unknown>>, opts: { silent?: boolean } = {}) {
  return (await unwrap(promise, opts)) as T | null;
}
