import { userSettings } from "@schema";
import { db, eq } from "void/db";

// Workers の PBKDF2 は 100000 回が上限
const ITERATIONS = 100_000;

function toHex(bytes: Uint8Array) {
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
}

function fromHex(hex: string) {
  return new Uint8Array(hex.match(/../g)!.map((pair) => parseInt(pair, 16)));
}

async function derive(password: string, salt: Uint8Array<ArrayBuffer>) {
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(password), "PBKDF2", false, ["deriveBits"]);
  const bits = await crypto.subtle.deriveBits(
    { name: "PBKDF2", hash: "SHA-256", salt, iterations: ITERATIONS },
    key,
    256,
  );
  return toHex(new Uint8Array(bits));
}

async function storedHash(userId: string) {
  const [row] = await db
    .select({ hiddenPassword: userSettings.hiddenPassword })
    .from(userSettings)
    .where(eq(userSettings.userId, userId));
  return row?.hiddenPassword ?? null;
}

export async function hasHiddenPassword(userId: string) {
  return (await storedHash(userId)) !== null;
}

export async function verifyHiddenPassword(userId: string, password: string) {
  const stored = await storedHash(userId);
  if (!stored) return false;
  const [salt, expected] = stored.split(":");
  const actual = await derive(password, fromHex(salt));
  // 一致する文字数で時間が変わらないよう、最後まで比べる
  let diff = actual.length ^ expected.length;
  for (let i = 0; i < actual.length; i++) diff |= actual.charCodeAt(i) ^ expected.charCodeAt(i);
  return diff === 0;
}

export async function setHiddenPassword(userId: string, password: string) {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const hiddenPassword = `${toHex(salt)}:${await derive(password, salt)}`;
  await db
    .insert(userSettings)
    .values({ userId, hiddenPassword })
    .onConflictDoUpdate({ target: userSettings.userId, set: { hiddenPassword } });
}
