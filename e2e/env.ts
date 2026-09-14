/** The end-to-end database: an in-memory PGlite started by e2e/server.ts, one connection per client. */
export const E2E_DB_PORT = 5433;
export const E2E_DATABASE_URL = `postgres://postgres:postgres@127.0.0.1:${E2E_DB_PORT}/postgres?max=1`;
