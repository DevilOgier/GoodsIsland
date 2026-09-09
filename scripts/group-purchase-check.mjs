import { chromium, expect } from '@playwright/test';
import { PrismaClient } from '@prisma/client';
import { randomUUID, randomBytes, createHash } from 'node:crypto';
const db = new PrismaClient(),
  token = randomBytes(32).toString('hex');
const user = await db.user.create({
  data: {
    email: randomUUID() + '@example.invalid',
    name: '拼团浏览器测试',
    passwordHash: 'disabled',
    role: 'ADMIN',
  },
});
await db.session.create({
  data: {
    userId: user.id,
    tokenHash: createHash('sha256').update(token).digest('hex'),
    expiresAt: new Date(Date.now() + 3600000),
  },
});
const series = await db.series.findFirstOrThrow();
const product = await db.product.create({
  data: { seriesId: series.id, name: '拼团交互-' + randomUUID().slice(0, 8), productType: 'BADGE' },
});
const browser = await chromium.launch({ channel: 'msedge', headless: true });
const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
await context.addCookies([
  {
    name: 'guzi-session',
    value: token,
    domain: 'localhost',
    path: '/',
    httpOnly: true,
    sameSite: 'Lax',
  },
]);
const page = await context.newPage();
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));
async function form() {
  await page.goto('http://localhost:3000/purchases');
  await page.getByRole('button', { name: '添加', exact: true }).click();
  await page.getByRole('button', { name: '从系列图鉴选择谷子' }).click();
  await page.getByLabel('搜索系列或商品').fill(product.name);
  await page.locator('.series-tile').click();
  await page.locator('.picker-product').filter({ hasText: product.name }).click();
  await page.getByLabel('购买渠道', { exact: true }).selectOption('拼团');
  await page.getByLabel('数量', { exact: true }).fill('2');
  await page.getByLabel('单价（元）', { exact: true }).fill('12');
  await page.getByLabel('到货状态', { exact: true }).selectOption('ARRIVED');
}
try {
  await form();
  await page.getByLabel('选择拼团', { exact: true }).selectOption('__new');
  await page.getByLabel('新团名称', { exact: true }).fill('表单里创建的团');
  await page.getByLabel('团长 / 主催', { exact: true }).fill('小岛团长');
  await page.getByLabel('拼团备注', { exact: true }).fill('一起合邮');
  if (await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1))
    throw Error('Mobile form overflow');
  await page.getByRole('button', { name: '确认保存' }).click();
  await page.getByRole('dialog').waitFor({ state: 'hidden' });
  const group = await db.groupBuy.findFirstOrThrow({
    where: { userId: user.id },
    include: { items: { include: { purchase: true } } },
  });
  if (group.items.length !== 1 || group.items[0].purchase?.arrivalStatus !== 'ARRIVED')
    throw Error('Group not linked');
  await form();
  await page.getByLabel('选择拼团', { exact: true }).selectOption(group.id);
  await page.getByRole('button', { name: '确认保存' }).click();
  await page.getByRole('dialog').waitFor({ state: 'hidden' });
  if ((await db.groupBuy.count({ where: { userId: user.id } })) !== 1)
    throw Error('Duplicate group');
  if ((await db.groupBuyItem.count({ where: { groupId: group.id } })) !== 2)
    throw Error('Missing group item');
  const item = await db.groupBuyItem.create({
    data: { groupId: group.id, productId: product.id, quantity: 2, unitPrice: '12' },
  });
  await page.goto('http://localhost:3000/groups/' + group.id);
  await page.getByRole('button', { name: '登记购买' }).click();
  await expect(page.getByLabel('购买渠道', { exact: true })).toHaveValue('拼团');
  await expect(page.getByLabel('数量', { exact: true })).toHaveValue('2');
  await page.getByRole('button', { name: '确认保存' }).click();
  await page.getByRole('dialog').waitFor({ state: 'hidden' });
  if (!(await db.purchase.findFirst({ where: { groupBuyItemId: item.id } })))
    throw Error('Existing group item not linked');
  if (errors.length) throw Error(errors.join('\n'));
  console.log(
    'Group purchase browser: PASS (mobile new group, existing group, group tab purchase)',
  );
} finally {
  await browser.close();
  await db.inventoryEvent.deleteMany({ where: { inventory: { userId: user.id } } });
  await db.purchase.deleteMany({ where: { userId: user.id } });
  await db.groupBuyItem.deleteMany({ where: { group: { userId: user.id } } });
  await db.groupBuy.deleteMany({ where: { userId: user.id } });
  await db.inventory.deleteMany({ where: { userId: user.id } });
  await db.mutationRequest.deleteMany({ where: { userId: user.id } });
  await db.product.delete({ where: { id: product.id } });
  await db.session.deleteMany({ where: { userId: user.id } });
  await db.user.delete({ where: { id: user.id } });
  await db.$disconnect();
}
