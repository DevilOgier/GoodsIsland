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
export async function currentUser() {
  const token = (await cookies()).get('guzi-session')?.value;
  if (!token) return null;
  const session = await db.session.findUnique({
    where: { tokenHash: hashToken(token) },
    include: { user: true },
  });
  return session && session.expiresAt > new Date() ? session.user : null;
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
  (await cookies()).set('guzi-session', token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.COOKIE_SECURE === 'true',
    path: '/',
    maxAge: 7 * 86400,
  });
}
