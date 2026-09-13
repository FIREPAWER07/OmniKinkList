import { createClient as createWebClient, type Client, type Config } from "@libsql/client/web";
import { drizzle } from "drizzle-orm/libsql/web";
import * as schema from "./schema";

const globalForDb = globalThis as unknown as { libsqlClient?: Client };

function createLibsqlClient(): Client {
  const config: Config = {
    url: process.env.DATABASE_URL ?? "file:local.db",
    authToken: process.env.DATABASE_AUTH_TOKEN,
  };
  if (config.url.startsWith("file:")) {
    // A local SQLite file needs the native client. It is only loaded here, so serverless
    // deploys talking to Turso over HTTP never need the native binary.
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { createClient } = require("@libsql/client") as typeof import("@libsql/client");
    return createClient(config);
  }
  return createWebClient(config);
}

// Reuse one client across hot reloads in development.
const client = globalForDb.libsqlClient ?? createLibsqlClient();
if (process.env.NODE_ENV !== "production") globalForDb.libsqlClient = client;

export const db = drizzle(client, { schema });
export type Database = typeof db;
