import mongoose from "mongoose";

// Cache the connection on globalThis so Next.js hot reload does not open a new one each time
const g = globalThis as unknown as { _mongoose?: { conn?: typeof mongoose; promise?: Promise<typeof mongoose> } };
g._mongoose ??= {};
const cache = g._mongoose;

async function resolveUri() {
  // Dev-only: MOCK_DB=true runs against an in-memory database filled with fake data (see dev-mock-db.ts)
  if (process.env.NODE_ENV === "development" && process.env.MOCK_DB === "true") {
    return (await import("./dev-mock-db")).startMockDb();
  }
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error("MONGODB_URI is not set");
  return uri;
}

export async function connectDB() {
  if (cache.conn) return cache.conn;
  // Transactions require a replica set, e.g. mongodb://localhost:27017/wms?replicaSet=rs0
  cache.promise ??= resolveUri().then((uri) => mongoose.connect(uri, { bufferCommands: false }));
  cache.conn = await cache.promise;
  return cache.conn;
}
