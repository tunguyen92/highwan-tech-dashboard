import { spawn } from "node:child_process";
import path from "node:path";

const LOG = "[mock-db]";
const g = globalThis as unknown as { _mockDbUri?: Promise<string> };

export const isMockDbEnabled = () => process.env.NODE_ENV === "development" && process.env.MOCK_DB === "true";

/** Starts (once per server process) the in-memory database, seeds it, and resolves with its connection string */
export function startMockDb(): Promise<string> {
  g._mockDbUri ??= boot().catch((e) => {
    g._mockDbUri = undefined; // let the next request retry
    throw e;
  });
  return g._mockDbUri;
}

async function boot(): Promise<string> {
  const t0 = Date.now();
  console.log(`${LOG} starting in-memory MongoDB (first run may download a mongod binary)...`);
  // webpackIgnore/turbopackIgnore: resolve at runtime, this is a dev-only dependency
  const { MongoMemoryReplSet } = await import(
    /* webpackIgnore: true */ /* turbopackIgnore: true */ "mongodb-memory-server"
  );
  const rs = await MongoMemoryReplSet.create({ replSet: { count: 1 } });
  const uri = rs.getUri("wms_mock");

  // Stop the database together with the dev server
  const stop = () => void rs.stop().catch(() => undefined);
  process.once("exit", stop);
  process.once("SIGINT", () => process.exit(0));
  process.once("SIGTERM", () => process.exit(0));

  console.log(`${LOG} seeding fake data with faker.js...`);
  const root = process.cwd();
  const tsx = path.join(root, "node_modules", "tsx", "dist", "cli.mjs");
  const days = process.env.MOCK_DB_DAYS ?? "60";
  await new Promise<void>((resolve, reject) => {
    const child = spawn(process.execPath, [tsx, path.join(root, "scripts", "seed.ts"), `--days=${days}`], {
      cwd: root,
      // MOCK_DB=false: the seed script must talk to this database directly, not start another mock one
      env: { ...process.env, MONGODB_URI: uri, MOCK_DB: "false" },
      stdio: ["ignore", "pipe", "pipe"],
    });
    let tail = "";
    const keep = (b: Buffer) => {
      tail = (tail + b.toString()).slice(-4000);
    };
    child.stdout.on("data", keep);
    child.stderr.on("data", keep);
    child.on("error", reject);
    child.on("exit", (code) => (code === 0 ? resolve() : reject(new Error(`seed script failed (${code}):\n${tail}`))));
  });

  console.log(
    `${LOG} ready in ${((Date.now() - t0) / 1000).toFixed(1)}s. Fake data is in memory; restart the dev server to reset it.`,
  );
  return uri;
}
