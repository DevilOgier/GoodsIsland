import { randomBytes, scryptSync, timingSafeEqual, createHash } from 'node:crypto';
import { cookies } from 'next/headers';
import { db } from './db';
import { DomainError } from '@/domain/errors';
export function hashPassword(password: string) {
  const salt = randomBytes(16).toString('hex');
  return salt + ':' + scryptSync(password, salt, 64).toString('hex');
}
export function verifyPassword(password: string, encoded: string) {
  const [salt, hash] = encoded.split(':');
  if (!salt || !hash) return false;
  const expected = Buffer.from(hash, 'hex');
  const actual = scryptSync(password, salt, 64);
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}
export const hashToken = (token: string) => createHash('sha256').update(token).digest('hex');
const ACTIVE_SESSION_COOKIE = 'guzi-session';
const ACCOUNT_COOKIE_PREFIX = 'guzi-account-';
const SESSION_MAX_AGE = 7 * 86400;

export type RememberedAccount = {
  id: string;
  name: string;
  email: string;
  role: string;
};

const sessionCookieOptions = {
  httpOnly: true,
  sameSite: 'lax' as const,
  secure: process.env.COOKIE_SECURE === 'true',
  path: '/',
  maxAge: SESSION_MAX_AGE,
};

const accountCookieName = (userId: string) => ACCOUNT_COOKIE_PREFIX + userId;

async function validSession(token: string) {
  const session = await db.session.findUnique({
    where: { tokenHash: hashToken(token) },
    include: { user: true },
  });
  return session && session.expiresAt > new Date() ? session : null;
}

export async function currentUser() {
  const token = (await cookies()).get(ACTIVE_SESSION_COOKIE)?.value;
  if (!token) return null;
  return (await validSession(token))?.user ?? null;
}
export async function requireUser(admin = false) {
  const user = await currentUser();
  if (!user) throw new DomainError('请先登录', 401);
  if (admin && user.role !== 'ADMIN') throw new DomainError('仅管理员可以维护图鉴', 403);
  return user;
}
export async function createSession(userId: string) {
  const token = randomBytes(32).toString('hex');
  await db.session.create({
    data: { userId, tokenHash: hashToken(token), expiresAt: new Date(Date.now() + 7 * 86400000) },
  });
  const cookieStore = await cookies();
  cookieStore.set(ACTIVE_SESSION_COOKIE, token, sessionCookieOptions);
  cookieStore.set(accountCookieName(userId), token, sessionCookieOptions);
}

export async function rememberedAccounts(): Promise<RememberedAccount[]> {
  const cookieStore = await cookies();
  const saved = cookieStore
    .getAll()
    .filter((cookie) => cookie.name.startsWith(ACCOUNT_COOKIE_PREFIX))
    .map((cookie) => ({
      userId: cookie.name.slice(ACCOUNT_COOKIE_PREFIX.length),
      tokenHash: hashToken(cookie.value),
    }));
  if (!saved.length) return [];
  const sessions = await db.session.findMany({
    where: {
      tokenHash: { in: saved.map((entry) => entry.tokenHash) },
      expiresAt: { gt: new Date() },
    },
    include: { user: true },
  });
  const byHash = new Map(sessions.map((session) => [session.tokenHash, session]));
  return saved.flatMap((entry) => {
    const session = byHash.get(entry.tokenHash);
    if (!session || session.userId !== entry.userId) return [];
    return [
      {
        id: session.user.id,
        name: session.user.name,
        email: session.user.email,
        role: session.user.role,
      },
    ];
  });
}

export async function switchSession(userId: string) {
  const cookieStore = await cookies();
  const token = cookieStore.get(accountCookieName(userId))?.value;
  if (!token) throw new DomainError('这个账号的登录状态已失效，请重新登录', 401);
  const session = await validSession(token);
  if (!session || session.userId !== userId)
    throw new DomainError('这个账号的登录状态已失效，请重新登录', 401);
  cookieStore.set(ACTIVE_SESSION_COOKIE, token, sessionCookieOptions);
  return session.user;
}

export async function leaveActiveSession() {
  const cookieStore = await cookies();
  const token = cookieStore.get(ACTIVE_SESSION_COOKIE)?.value;
  if (token) {
    const session = await validSession(token);
    if (session) cookieStore.set(accountCookieName(session.userId), token, sessionCookieOptions);
  }
  cookieStore.delete(ACTIVE_SESSION_COOKIE);
}

export async function forgetSession(userId: string) {
  const cookieStore = await cookies();
  const accountName = accountCookieName(userId);
  const token = cookieStore.get(accountName)?.value;
  const activeToken = cookieStore.get(ACTIVE_SESSION_COOKIE)?.value;
  const tokens = [...new Set([token, activeToken].filter((value): value is string => Boolean(value)))];
  if (tokens.length)
    await db.session.deleteMany({
      where: { tokenHash: { in: tokens.map(hashToken) }, userId },
    });
  cookieStore.delete(ACTIVE_SESSION_COOKIE);
  cookieStore.delete(accountName);
}
