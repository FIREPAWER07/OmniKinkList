import { afterAll, beforeAll, expect, test } from "bun:test";
import postgres from "postgres";
import { startLocalDatabase } from "./local-server";

let database: Awaited<ReturnType<typeof startLocalDatabase>>;

beforeAll(async () => {
  database = await startLocalDatabase({ port: 0 });
});

afterAll(() => database.stop());

/** Clients like the app's: one connection each, no named prepared statements. */
function connect() {
  return postgres(database.url, { prepare: false, onnotice: () => {} });
}

/** A query's rows as a plain array, which is easier to compare. */
async function rows(query: PromiseLike<Iterable<object>>) {
  return [...(await query)];
}

test("connections do not get each other's results", async () => {
  const clients = Array.from({ length: 8 }, connect);
  try {
    await Promise.all(
      clients.map(async (sql, client) => {
        for (let i = 0; i < 20; i++) {
          // Different statement text per client, so a mixed-up Parse or Bind would show.
          expect(await rows(sql.unsafe(`select ${client} as client, $1::int as i`, [i]))).toEqual([{ client, i }]);
        }
      }),
    );
  } finally {
    await Promise.all(clients.map((sql) => sql.end()));
  }
});

test("a failed query does not hold up the others", async () => {
  const [a, b] = [connect(), connect()];
  try {
    const failing = a`select * from missing_table`.catch((error) => error.code);
    expect(await rows(b`select 1 as one`)).toEqual([{ one: 1 }]);
    expect(await failing).toBe("42P01");
    expect(await rows(a`select 2 as two`)).toEqual([{ two: 2 }]);
  } finally {
    await Promise.all([a.end(), b.end()]);
  }
});

test("other connections wait for an open transaction to finish", async () => {
  const [a, b] = [connect(), connect()];
  try {
    await a`create table waits (id int)`;
    let insertFromB: Promise<unknown> = Promise.resolve();
    await a
      .begin(async (tx) => {
        await tx`insert into waits values (1)`;
        insertFromB = b`insert into waits values (2)`;
        await Bun.sleep(50);
        throw new Error("roll back");
      })
      .catch(() => {});
    await insertFromB;
    // Had B's insert run inside A's transaction, the rollback would have taken it too.
    expect(await rows(b`select id from waits`)).toEqual([{ id: 2 }]);
  } finally {
    await Promise.all([a.end(), b.end()]);
  }
});

test("a connection that goes away mid-transaction does not hold up the others", async () => {
  const [a, b] = [connect(), connect()];
  try {
    await a`create table abandoned (id int)`;
    const reserved = await a.reserve();
    await reserved`begin`;
    await reserved`insert into abandoned values (1)`;
    await a.end({ timeout: 0 });
    expect(await rows(b`select count(*)::int as count from abandoned`)).toEqual([{ count: 0 }]);
  } finally {
    await b.end();
  }
});
