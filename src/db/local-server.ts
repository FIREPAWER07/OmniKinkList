/**
 * A local Postgres for development and end-to-end tests, backed by PGlite, so nothing has to be
 * installed. Production uses Supabase instead.
 *
 *   bun run db:local    serves the database kept in `.pglite` on port 5432
 *
 * PGlite has a single connection that the server shares, so clients must use one connection each:
 * keep `?max=1` on the DATABASE_URL (see `localDatabaseUrl`).
 */
import { PGlite } from "@electric-sql/pglite";
import { PGLiteSocketServer } from "@electric-sql/pglite-socket";

export const localDatabaseUrl = (port: number) => `postgres://postgres:postgres@127.0.0.1:${port}/postgres?max=1`;

/** Starts the server. `dataDir` undefined keeps everything in memory. */
export async function startLocalDatabase({ dataDir, port }: { dataDir?: string; port: number }) {
  const pg = await PGlite.create(dataDir);
  const server = new PGLiteSocketServer({ db: pg, port, host: "127.0.0.1", maxConnections: 32 });
  await server.start();
  return {
    url: localDatabaseUrl(port),
    stop: async () => {
      await server.stop();
      await pg.close();
    },
  };
}

if (import.meta.main) {
  const { url, stop } = await startLocalDatabase({ dataDir: ".pglite", port: 5432 });
  console.log(`Local database ready. Put this in .env.local:\n\nDATABASE_URL=${url}\n\nPress Ctrl+C to stop.`);
  for (const signal of ["SIGINT", "SIGTERM"] as const) {
    process.on(signal, () => void stop().finally(() => process.exit(0)));
  }
}
