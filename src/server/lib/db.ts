import mongoose from "mongoose";

// Cache the connection on globalThis so Next.js hot reload does not open a new one each time
const g = globalThis as unknown as { _mongoose?: { conn?: typeof mongoose; promise?: Promise<typeof mongoose> } };
g._mongoose ??= {};
const cache = g._mongoose;

export async function connectDB() {
  if (cache.conn) return cache.conn;
  // Transactions require a replica set, e.g. mongodb://localhost:27017/wms?replicaSet=rs0
  cache.promise ??= Promise.resolve().then(() => {
    const uri = process.env.MONGODB_URI;
    if (!uri) throw new Error("MONGODB_URI is not set");
    return mongoose.connect(uri, { bufferCommands: false });
  });
  cache.conn = await cache.promise;
  return cache.conn;
}
