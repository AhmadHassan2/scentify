import "server-only";
import { randomBytes, randomUUID, scrypt as scryptCb, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";
import { mutateLocalDb, readLocalDb } from "@/lib/database/user-store/local-store";

/**
 * Demo-mode authentication (no Supabase): real email/password accounts with
 * scrypt-hashed passwords and opaque session tokens, stored in the local
 * demo database. Development convenience only.
 */

const scrypt = promisify(scryptCb) as (pw: string, salt: string, len: number) => Promise<Buffer>;
export const LOCAL_SESSION_COOKIE = "scentiq_session";
const SESSION_DAYS = 30;

export interface LocalAuthUser {
  id: string;
  email: string;
  displayName: string;
}

async function hash(password: string, salt: string) {
  return (await scrypt(password, salt, 64)).toString("hex");
}

export async function localRegister(email: string, password: string, displayName: string) {
  const normalized = email.trim().toLowerCase();
  const salt = randomBytes(16).toString("hex");
  const passwordHash = await hash(password, salt);
  return mutateLocalDb((db) => {
    if (Object.values(db.users).some((u) => u.email === normalized)) {
      return { error: "An account with this email already exists." as const };
    }
    const id = randomUUID();
    db.users[id] = { id, email: normalized, displayName, passwordHash, salt, createdAt: new Date().toISOString() };
    return { user: { id, email: normalized, displayName } };
  });
}

export async function localLogin(email: string, password: string): Promise<LocalAuthUser | null> {
  const normalized = email.trim().toLowerCase();
  const db = await readLocalDb();
  const user = Object.values(db.users).find((u) => u.email === normalized);
  // Hash even when the user doesn't exist to keep timing uniform.
  const candidate = Buffer.from(await hash(password, user?.salt ?? "0".repeat(32)), "hex");
  if (!user) return null;
  const stored = Buffer.from(user.passwordHash, "hex");
  if (stored.length !== candidate.length || !timingSafeEqual(stored, candidate)) return null;
  return { id: user.id, email: user.email, displayName: user.displayName };
}

export async function createLocalSession(userId: string): Promise<{ token: string; expires: Date }> {
  const token = randomBytes(32).toString("base64url");
  const expires = new Date(Date.now() + SESSION_DAYS * 86_400_000);
  await mutateLocalDb((db) => {
    const now = new Date().toISOString();
    for (const [t, s] of Object.entries(db.sessions)) if (s.expiresAt < now) delete db.sessions[t];
    db.sessions[token] = { userId, expiresAt: expires.toISOString() };
  });
  return { token, expires };
}

export async function getLocalSessionUser(token: string | undefined): Promise<LocalAuthUser | null> {
  if (!token) return null;
  const db = await readLocalDb();
  const session = db.sessions[token];
  if (!session || session.expiresAt < new Date().toISOString()) return null;
  const user = db.users[session.userId];
  return user ? { id: user.id, email: user.email, displayName: user.displayName } : null;
}

export async function destroyLocalSession(token: string | undefined) {
  if (!token) return;
  await mutateLocalDb((db) => {
    delete db.sessions[token];
  });
}
