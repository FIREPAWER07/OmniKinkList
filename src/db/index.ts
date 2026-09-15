import { drizzle } from "drizzle-orm/postgres-js";
import postgres, { type Sql } from "postgres";
import * as schema from "./schema";

const globalForDb = globalThis as unknown as { pgClient?: Sql };

function createClient(): Sql {
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error("DATABASE_URL is not set. Use your Supabase connection string, or run `bun run db:local` for a local database.");
  }
  // Supabase's transaction pooler (port 6543) does not support prepared statements.
  return postgres(url, { prepare: false });
}

// One client per process: Next.js can load this module more than once (separate bundles, hot reloads).
const client = (globalForDb.pgClient ??= createClient());

export const db = drizzle(client, { schema });

/** Closes the connection so command line scripts can exit. */
export const closeDb = () => client.end();
