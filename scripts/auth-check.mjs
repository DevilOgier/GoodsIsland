import { chromium, expect } from '@playwright/test';
import { PrismaClient } from '@prisma/client';
import { randomUUID } from 'node:crypto';
import { mkdirSync } from 'node:fs';

const db = new PrismaClient();
const email = `signup-${randomUUID()}@example.invalid`;
const password = 'signup-password-2026';
const browser = await chromium.launch({ channel: 'msedge', headless: true });
const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
const page = await context.newPage();
const errors = [];
page.on('pageerror', (error) => errors.push(error.message));

try {
  await page.goto('http://localhost:3000/login');
  await page.getByRole('tab', { name: '注册', exact: true }).click();
  await expect(page.getByRole('heading', { name: '创建你的收藏柜' })).toBeVisible();
  mkdirSync('.local/screenshots', { recursive: true });
  await page.screenshot({ path: '.local/screenshots/signup-mobile.png', fullPage: true });
  await page.getByLabel('收藏家昵称').fill('自助注册测试');
  await page.getByLabel('邮箱', { exact: true }).fill(email);
  await page.getByLabel('密码', { exact: true }).fill(password);
  await page.getByLabel('确认密码', { exact: true }).fill('different-password');
  await page.getByRole('button', { name: '创建收藏柜' }).click();
  await expect(page.locator('p.error[role="alert"]')).toContainText('两次输入的密码不一致');
  if (await db.user.findUnique({ where: { email } })) throw Error('Mismatch created a user');

  await page.getByLabel('确认密码', { exact: true }).fill(password);
  await page.getByRole('button', { name: '创建收藏柜' }).click();
  await page.waitForURL('http://localhost:3000/');
  const user = await db.user.findUniqueOrThrow({ where: { email } });
  if (user.role !== 'USER') throw Error('Public signup received an elevated role');
  if ((await db.session.count({ where: { userId: user.id } })) !== 1)
    throw Error('Public signup did not create a session');

  await page.evaluate(async () => {
    await fetch('/api/auth', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'logout' }),
    });
  });
  await page.goto('http://localhost:3000/login');
  await expect(page.getByRole('tab', { name: '注册', exact: true })).toBeVisible();
  const adminOnly = await page.request.post('http://localhost:3000/api/auth', {
    headers: { Origin: 'http://localhost:3000' },
    data: { action: 'register', email: `admin-${email}`, password, name: '无权限' },
  });
  if (adminOnly.status() !== 401) throw Error('Admin account creation became public');
  if (errors.length) throw Error(errors.join('\n'));
  console.log('Auth browser: PASS (mobile signup, auto-login, role isolation, logout entry)');
} finally {
  const user = await db.user.findUnique({ where: { email } });
  if (user) {
    await db.session.deleteMany({ where: { userId: user.id } });
    await db.mutationRequest.deleteMany({ where: { userId: user.id } });
    await db.user.delete({ where: { id: user.id } });
  }
  await browser.close();
  await db.$disconnect();
}
