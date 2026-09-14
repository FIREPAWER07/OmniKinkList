/**
 * End-to-end encryption for synced answers, using only the Web Crypto API.
 * The passphrase never leaves the browser: PBKDF2 (SHA-256) derives an AES-GCM key,
 * and the server only stores the ciphertext, IV, salt, and iteration count.
 *
 * The compressed data is padded before encryption, so the ciphertext size only tells the
 * server which size bucket a vault falls in, not how many answers or notes it holds:
 *
 *   [format = 1][compressed length, uint32 big-endian][gzip bytes][zero padding]
 *
 * Vaults written before padding existed are a bare gzip stream, which starts with 0x1f 0x8b.
 */

export const PBKDF2_ITERATIONS = 600_000;

function toBase64(bytes: Uint8Array) {
  let binary = "";
  for (let i = 0; i < bytes.length; i += 0x8000) binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(binary);
}

function fromBase64(value: string) {
  const binary = atob(value);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

export function randomSalt() {
  return toBase64(crypto.getRandomValues(new Uint8Array(16)));
}

export async function deriveKey(passphrase: string, salt: string, iterations: number): Promise<CryptoKey> {
  const material = await crypto.subtle.importKey("raw", new TextEncoder().encode(passphrase.normalize("NFKC")), "PBKDF2", false, [
    "deriveKey",
  ]);
  return crypto.subtle.deriveKey(
    { name: "PBKDF2", hash: "SHA-256", salt: fromBase64(salt), iterations },
    material,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"],
  );
}

async function pipe(bytes: Uint8Array, stream: CompressionStream | DecompressionStream) {
  const response = new Response(new Blob([bytes as BlobPart]).stream().pipeThrough(stream));
  return new Uint8Array(await response.arrayBuffer());
}

const PADDED_FORMAT = 1;
const HEADER_BYTES = 5;
const KIB = 1024;
const MIN_BUCKET = 32 * KIB;
const MAX_DOUBLING_BUCKET = 512 * KIB;
/** Past the last doubling bucket, grow in fixed steps so large vaults stay under the upload limit. */
const LARGE_STEP = 64 * KIB;

/** Plaintext size for `length` bytes: 32, 64, 128, 256, or 512 KiB, then the next multiple of 64 KiB. */
export function paddedSize(length: number) {
  if (length > MAX_DOUBLING_BUCKET) return Math.ceil(length / LARGE_STEP) * LARGE_STEP;
  let size = MIN_BUCKET;
  while (size < length) size *= 2;
  return size;
}

function pad(compressed: Uint8Array) {
  const padded = new Uint8Array(paddedSize(HEADER_BYTES + compressed.length));
  padded[0] = PADDED_FORMAT;
  new DataView(padded.buffer).setUint32(1, compressed.length);
  padded.set(compressed, HEADER_BYTES);
  return padded;
}

function unpad(plain: Uint8Array) {
  if (plain[0] === 0x1f && plain[1] === 0x8b) return plain;
  if (plain[0] !== PADDED_FORMAT || plain.length < HEADER_BYTES) throw new Error("Unsupported vault format");
  const length = new DataView(plain.buffer, plain.byteOffset).getUint32(1);
  if (length > plain.length - HEADER_BYTES) throw new Error("Damaged vault data");
  return plain.subarray(HEADER_BYTES, HEADER_BYTES + length);
}

export async function encryptJson(key: CryptoKey, value: unknown) {
  const compressed = await pipe(new TextEncoder().encode(JSON.stringify(value)), new CompressionStream("gzip"));
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ciphertext = new Uint8Array(await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, pad(compressed)));
  return { ciphertext: toBase64(ciphertext), iv: toBase64(iv) };
}

export class WrongPassphraseError extends Error {}

export async function decryptJson<T>(key: CryptoKey, ciphertext: string, iv: string): Promise<T> {
  let plain: ArrayBuffer;
  try {
    plain = await crypto.subtle.decrypt({ name: "AES-GCM", iv: fromBase64(iv) }, key, fromBase64(ciphertext));
  } catch {
    throw new WrongPassphraseError("Could not decrypt: wrong passphrase or damaged data");
  }
  const json = await pipe(unpad(new Uint8Array(plain)), new DecompressionStream("gzip"));
  return JSON.parse(new TextDecoder().decode(json)) as T;
}

/* ------------------------------------------------------------------ */
/* Remembering the derived key on this device                          */
/* ------------------------------------------------------------------ */

const DB_NAME = "okl-sync";
const STORE = "keys";

interface StoredKey {
  userId: string;
  key: CryptoKey;
}

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = () => request.result.createObjectStore(STORE, { keyPath: "userId" });
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function withStore<T>(mode: IDBTransactionMode, run: (store: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  const db = await openDb();
  try {
    return await new Promise<T>((resolve, reject) => {
      const request = run(db.transaction(STORE, mode).objectStore(STORE));
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  } finally {
    db.close();
  }
}

/** The key is stored non-extractable, so page scripts can use it but never read its bytes. */
export async function rememberKey(userId: string, key: CryptoKey) {
  await withStore("readwrite", (store) => store.put({ userId, key } satisfies StoredKey));
}

export async function loadKey(userId: string): Promise<CryptoKey | null> {
  try {
    const stored = await withStore<StoredKey | undefined>("readonly", (store) => store.get(userId));
    return stored?.key ?? null;
  } catch {
    return null;
  }
}

export async function forgetKey(userId?: string) {
  try {
    await withStore("readwrite", (store) => (userId ? store.delete(userId) : store.clear()));
  } catch {
    // Nothing stored.
  }
}
