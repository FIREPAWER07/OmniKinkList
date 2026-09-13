import { rmSync } from "node:fs";

// Start every run from a freshly migrated and seeded e2e.db.
for (const suffix of ["", "-shm", "-wal", "-journal"]) rmSync(`e2e.db${suffix}`, { force: true });

const env = { ...process.env, DATABASE_URL: "file:e2e.db" };
for (const script of ["db:migrate", "db:seed"]) {
  const result = Bun.spawnSync(["bun", "run", script], { env, stdout: "inherit", stderr: "inherit" });
  if (result.exitCode !== 0) process.exit(result.exitCode);
}
