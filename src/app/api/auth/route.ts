import { cookies } from 'next/headers';
import { db } from '@/infrastructure/db';
import {
  createSession,
  hashPassword,
  hashToken,
  requireUser,
  verifyPassword,
} from '@/infrastructure/auth';
import { ensure } from '@/domain/errors';
import { fail, originGuard } from '@/lib/http';
import { z } from 'zod';
const attempts = new Map<string, { count: number; until: number }>();
export async function POST(request: Request) {
  try {
    originGuard(request);
    const d = z
      .object({
        action: z.enum(['login', 'setup', 'logout', 'register']),
        email: z.email().optional(),
        password: z.string().min(10).max(128).optional(),
        name: z.string().min(1).max(50).optional(),
      })
      .parse(await request.json());
    if (d.action === 'logout') {
      const token = (await cookies()).get('guzi-session')?.value;
      if (token) await db.session.deleteMany({ where: { tokenHash: hashToken(token) } });
      (await cookies()).delete('guzi-session');
      return Response.json({ ok: true });
    }
    ensure(d.email && d.password, '请填写邮箱和至少10位密码');
    const email = d.email.toLowerCase();
    if (d.action === 'register') {
      await requireUser(true);
      ensure(d.name, '请填写收藏家昵称');
      ensure(!(await db.user.findUnique({ where: { email } })), '这个邮箱已经有账号了', 409);
      const user = await db.user.create({
        data: {
          email,
          name: d.name,
          passwordHash: hashPassword(d.password),
          role: 'USER',
        },
      });
      return Response.json({ id: user.id, name: user.name, email: user.email });
    }
    const count = attempts.get(email);
    ensure(
      !count || count.until < Date.now() || count.count < 10,
      '登录尝试过多，请10分钟后再试',
      429,
    );
    attempts.set(email, {
      count: count && count.until > Date.now() ? count.count + 1 : 1,
      until: Date.now() + 600000,
    });
    let user;
    if (d.action === 'setup') {
      user = await db.$transaction(async (tx) => {
        await tx.$executeRaw`SELECT pg_advisory_xact_lock(938123)`;
        ensure((await tx.user.count()) === 0, '管理员已创建，请登录', 409);
        return tx.user.create({
          data: {
            email,
            passwordHash: hashPassword(d.password!),
            name: d.name ?? '收藏家',
            role: 'ADMIN',
          },
        });
      });
    } else {
      user = await db.user.findUnique({ where: { email } });
      ensure(user && verifyPassword(d.password, user.passwordHash), '邮箱或密码不正确', 401);
    }
    attempts.delete(email);
    await createSession(user.id);
    return Response.json({ ok: true });
  } catch (e) {
    return fail(e);
  }
}
