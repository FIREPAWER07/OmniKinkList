/**
 * Web server for the end-to-end tests. Starts a fresh in-memory database, migrates and seeds it,
 * builds the app (unless E2E_SKIP_BUILD is set), and serves the production build.
 */
import { startLocalDatabase } from "../src/db/local-server";
import { E2E_DATABASE_URL, E2E_DB_PORT } from "./env";

const port = process.argv[2] ?? "3100";
const database = await startLocalDatabase({ port: E2E_DB_PORT });
const env = { ...process.env, DATABASE_URL: E2E_DATABASE_URL };

async function exit(code: number): Promise<never> {
  await database.stop();
  process.exit(code);
}

// Steps run asynchronously: the database lives in this process and must keep answering.
const steps = [["bun", "run", "db:migrate"], ["bun", "run", "db:seed"], ...(process.env.E2E_SKIP_BUILD ? [] : [["bun", "run", "build"]])];
for (const cmd of steps) {
  const code = await Bun.spawn(cmd, { env, stdout: "inherit", stderr: "inherit" }).exited;
  if (code !== 0) await exit(code);
}

const app = Bun.spawn(["bun", "run", "start", "--port", port], { env, stdout: "inherit", stderr: "inherit" });
for (const signal of ["SIGINT", "SIGTERM"] as const) process.on(signal, () => app.kill());
await exit(await app.exited);
