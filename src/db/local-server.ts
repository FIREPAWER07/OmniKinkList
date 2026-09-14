/**
 * A local Postgres for development and end-to-end tests, backed by PGlite, so nothing has to be
 * installed. Production uses Supabase instead.
 *
 *   bun run db:local    serves the database kept in `.pglite` on port 5432
 *
 * PGlite runs a single Postgres backend, so all connections share one session. Postgres keeps state
 * across the messages of an exchange (the unnamed statement of a Parse, Bind, Execute, Sync pipeline)
 * and across a transaction, so the server lets one connection at a time use the database, from the
 * first message of an exchange until Postgres reports it idle again. Clients in separate processes,
 * like the workers of `next build`, take turns instead of mixing up each other's queries. A client
 * gains nothing from a second connection, so `localDatabaseUrl` keeps `?max=1`.
 */
import { createServer, type AddressInfo, type Socket } from "node:net";
import { Mutex, PGlite } from "@electric-sql/pglite";

export const localDatabaseUrl = (port: number) => `postgres://postgres:postgres@127.0.0.1:${port}/postgres?max=1`;

// Codes sent in place of the protocol version, before the startup message.
const SSL_REQUEST = 80877103;
const GSSENC_REQUEST = 80877104;
const CANCEL_REQUEST = 80877102;

const TERMINATE = "X".charCodeAt(0);
const READY_FOR_QUERY = "Z".charCodeAt(0);
const IDLE = "I".charCodeAt(0);

function frontendMessage(type: string, body = "") {
  const message = Buffer.alloc(5 + Buffer.byteLength(body));
  message.write(type);
  message.writeInt32BE(message.length - 1, 1);
  message.write(body, 5);
  return message;
}

const SYNC = frontendMessage("S");
const ROLLBACK = frontendMessage("Q", "ROLLBACK\0");

/** Runs frontend messages and returns the backend's replies. */
async function exchange(pg: PGlite, messages: Uint8Array) {
  const replies: Buffer[] = [];
  // PGlite passes views into its own memory, so copy them.
  await pg.runExclusive(() => pg.execProtocolRawStream(messages, { onRawData: (data) => replies.push(Buffer.from(data)) }));
  return Buffer.concat(replies);
}

/** Whether the replies end with ReadyForQuery outside a transaction, which ends an exchange. */
function endsIdle(replies: Buffer) {
  let last = 0;
  for (let offset = 0; offset < replies.length; offset += 1 + replies.readInt32BE(offset + 1)) last = offset;
  return replies[last] === READY_FOR_QUERY && replies[last + 5] === IDLE;
}

function serve(pg: PGlite, turn: Mutex, socket: Socket) {
  let buffered = Buffer.alloc(0);
  let started = false;
  // Set while this connection has the database to itself.
  let release: (() => void) | undefined;
  // The connection's work runs in order, ending with the cleanup after it closes.
  let work = Promise.resolve();
  const enqueue = (task: () => Promise<void>) => {
    work = work.then(task).catch((error) => {
      console.error("Local database connection failed:", error);
      socket.destroy();
    });
  };

  async function run(messages: Uint8Array) {
    if (socket.destroyed) return;
    const wasIdle = !release;
    release ??= await turn.acquire();
    const replies = await exchange(pg, messages);
    socket.write(replies);
    // Messages without a reply, like Flush, leave the exchange where it was.
    if (replies.length > 0 ? endsIdle(replies) : wasIdle) {
      release();
      release = undefined;
    }
  }

  async function handleBuffered() {
    // Until the startup message, messages have no type byte: [length][code].
    while (!started) {
      if (buffered.length < 8) return;
      const length = buffered.readInt32BE(0);
      const code = buffered.readInt32BE(4);
      if (code === SSL_REQUEST || code === GSSENC_REQUEST) {
        buffered = buffered.subarray(8);
        socket.write("N");
        continue;
      }
      if (code === CANCEL_REQUEST || length < 8) {
        // There is no separate backend to interrupt.
        socket.destroy();
        return;
      }
      if (buffered.length < length) return;
      const startup = buffered.subarray(0, length);
      buffered = buffered.subarray(length);
      started = true;
      await run(startup);
    }

    // After it, messages are [type][length], and the complete ones run together.
    let end = 0;
    let terminate = false;
    while (end + 5 <= buffered.length) {
      if (buffered[end] === TERMINATE) {
        terminate = true;
        break;
      }
      const length = buffered.readInt32BE(end + 1);
      if (length < 4) {
        socket.destroy();
        return;
      }
      if (end + 1 + length > buffered.length) break;
      end += 1 + length;
    }
    const messages = buffered.subarray(0, end);
    buffered = terminate ? Buffer.alloc(0) : buffered.subarray(end);
    if (messages.length > 0) await run(messages);
    if (terminate) socket.end();
  }

  socket.setNoDelay(true);
  socket.on("data", (data) => {
    buffered = Buffer.concat([buffered, data]);
    enqueue(handleBuffered);
  });
  // "close" follows, and cleans up.
  socket.on("error", () => {});
  socket.on("close", () =>
    enqueue(async () => {
      if (!release) return;
      try {
        // Finish what the client left in progress and roll back its transaction.
        if (!endsIdle(await exchange(pg, SYNC))) await exchange(pg, ROLLBACK);
      } finally {
        release();
        release = undefined;
      }
    }),
  );
}

/** Starts the server. `dataDir` undefined keeps everything in memory; `port` 0 picks a free port. */
export async function startLocalDatabase({ dataDir, port }: { dataDir?: string; port: number }) {
  const pg = await PGlite.create(dataDir);
  const turn = new Mutex();
  const sockets = new Set<Socket>();
  const server = createServer((socket) => {
    sockets.add(socket);
    socket.on("close", () => sockets.delete(socket));
    serve(pg, turn, socket);
  });
  await new Promise<void>((resolve, reject) => {
    server.once("error", reject);
    server.listen(port, "127.0.0.1", resolve);
  });
  return {
    url: localDatabaseUrl((server.address() as AddressInfo).port),
    stop: async () => {
      const closed = new Promise((resolve) => server.close(resolve));
      for (const socket of sockets) socket.destroy();
      await closed;
      // Wait for connections that were mid-exchange to clean up.
      await turn.runExclusive(() => pg.close());
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
