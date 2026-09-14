import { describe, expect, test } from "bun:test";
import { decryptJson, encryptJson, paddedSize, WrongPassphraseError } from "./crypto";

const newKey = () => crypto.subtle.generateKey({ name: "AES-GCM", length: 256 }, false, ["encrypt", "decrypt"]);
const byteLength = (base64: string) => Buffer.from(base64, "base64").length;
const GCM_TAG = 16;

function snapshot(answerCount: number, note = "") {
  const answers: Record<string, string> = {};
  const notes: Record<string, string> = {};
  for (let i = 0; i < answerCount; i++) {
    answers[`o${i * 7}`] = ["limit", "dislike", "maybe", "indifferent", "like", "favorite"][(i * 2654435761) % 6];
    if (note) notes[`o${i * 7}`] = `${note} ${i}`;
  }
  return { profiles: { active: "me", profiles: [{ id: "me", name: "", updatedAt: 1 }], deleted: {}, updatedAt: 1 }, data: { me: { omni: { answers, notes } } } };
}

describe("vault encryption", () => {
  test("round-trips data", async () => {
    const key = await newKey();
    const value = snapshot(300, "private note");
    const { ciphertext, iv } = await encryptJson(key, value);
    expect(await decryptJson<typeof value>(key, ciphertext, iv)).toEqual(value);
  });

  test("an empty vault and a fully answered one have the same size", async () => {
    const key = await newKey();
    const empty = await encryptJson(key, snapshot(0));
    const full = await encryptJson(key, snapshot(850));
    expect(byteLength(empty.ciphertext)).toBe(32 * 1024 + GCM_TAG);
    expect(byteLength(full.ciphertext)).toBe(byteLength(empty.ciphertext));
  });

  test("larger vaults move to the next bucket", async () => {
    const key = await newKey();
    const { ciphertext } = await encryptJson(key, { blob: Buffer.from(crypto.getRandomValues(new Uint8Array(40 * 1024))).toString("base64") });
    expect(byteLength(ciphertext)).toBe(64 * 1024 + GCM_TAG);
  });

  test("reads vaults saved before padding", async () => {
    const key = await newKey();
    const value = snapshot(20);
    const gzip = new Uint8Array(await new Response(new Blob([JSON.stringify(value)]).stream().pipeThrough(new CompressionStream("gzip"))).arrayBuffer());
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const legacy = new Uint8Array(await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, gzip));
    expect(await decryptJson<typeof value>(key, Buffer.from(legacy).toString("base64"), Buffer.from(iv).toString("base64"))).toEqual(value);
  });

  test("a different key is reported as a wrong passphrase", async () => {
    const { ciphertext, iv } = await encryptJson(await newKey(), snapshot(5));
    await expect(decryptJson(await newKey(), ciphertext, iv)).rejects.toBeInstanceOf(WrongPassphraseError);
  });

  test("bucket sizes", () => {
    const kib = 1024;
    expect(paddedSize(1)).toBe(32 * kib);
    expect(paddedSize(32 * kib)).toBe(32 * kib);
    expect(paddedSize(32 * kib + 1)).toBe(64 * kib);
    expect(paddedSize(300 * kib)).toBe(512 * kib);
    expect(paddedSize(512 * kib + 1)).toBe(576 * kib);
    expect(paddedSize(700 * kib)).toBe(704 * kib);
  });
});
