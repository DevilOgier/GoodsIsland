import { NextResponse } from 'next/server';
import { ZodError } from 'zod';
import { Prisma } from '@prisma/client';
import { DomainError } from '@/domain/errors';
export function fail(error: unknown) {
  if (error instanceof ZodError)
    return NextResponse.json({ error: error.issues[0]?.message ?? '输入无效' }, { status: 422 });
  if (error instanceof DomainError)
    return NextResponse.json({ error: error.message }, { status: error.status });
  if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002')
    return NextResponse.json({ error: '记录已存在，请勿重复添加' }, { status: 409 });
  console.error(error instanceof Error ? error.message : 'Unknown server error');
  return NextResponse.json(
    { error: '操作失败，请检查本地数据库与对象存储服务是否运行' },
    { status: 500 },
  );
}
export function originGuard(request: Request) {
  const origin = request.headers.get('origin');
  const expected = new URL(process.env.APP_URL ?? 'http://localhost:3000').origin;
  const allowed = [
    expected,
    ...(process.env.ADDITIONAL_APP_ORIGINS ?? '')
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean),
  ];
  if (!origin || !allowed.includes(origin)) throw new DomainError('请求来源不匹配', 403);
}
