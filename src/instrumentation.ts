export async function register() {
  // Dev only: with MOCK_DB=true, start the in-memory database in the background as soon as the server boots,
  // so the fake data is (nearly) ready by the time the first page is opened. Not awaited on purpose:
  // register() must not delay the server.
  if (
    process.env.NEXT_RUNTIME === "nodejs" &&
    process.env.NODE_ENV === "development" &&
    process.env.MOCK_DB === "true"
  ) {
    const { connectDB } = await import("@/server/lib/db");
    void connectDB().catch((e) => console.error("[mock-db] failed to start:", e));
  }
}
