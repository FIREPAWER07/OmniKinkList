import { createClient, type Client } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql";
import * as schema from "./schema";

const globalForDb = globalThis as unknown as { libsqlClient?: Client };

function createLibsqlClient() {
  return createClient({
    url: process.env.DATABASE_URL ?? "file:local.db",
    authToken: process.env.DATABASE_AUTH_TOKEN,
  });
}

// Reuse one client across hot reloads in development.
const client = globalForDb.libsqlClient ?? createLibsqlClient();
if (process.env.NODE_ENV !== "production") globalForDb.libsqlClient = client;

export const db = drizzle(client, { schema });
export type Database = typeof db;
