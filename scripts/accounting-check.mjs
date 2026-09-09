import { chromium, expect } from '@playwright/test';
import { PrismaClient } from '@prisma/client';
import { randomUUID, randomBytes, createHash } from 'node:crypto';
import { mkdirSync, readFileSync } from 'node:fs';
const db = new PrismaClient(),
  token = randomBytes(32).toString('hex');
const user = await db.user.create({
  data: {
    email: randomUUID() + '@example.invalid',
    name: '记账测试',
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
  data: { seriesId: series.id, name: '记账测试-' + randomUUID().slice(0, 6), productType: 'BADGE' },
});
const browser = await chromium.launch({ channel: 'msedge', headless: true }),
  context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
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
const page = await context.newPage(),
  errors = [];
page.on('pageerror', (e) => errors.push(e.message));
const date = new Intl.DateTimeFormat('sv-SE', { timeZone: 'Asia/Shanghai' }).format(new Date());
async function send(operation, data) {
  return page.evaluate(
    async ({ operation, data }) => {
      const r = await fetch('/api/commands', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Idempotency-Key': crypto.randomUUID() },
        body: JSON.stringify({ operation, data }),
      });
      const j = await r.json();
      if (!r.ok) throw Error(j.error);
      return j;
    },
    { operation, data },
  );
}
async function go(path) {
  await page.goto('http://localhost:3000' + path);
  await page.locator('.skeleton').first().waitFor({ state: 'hidden' });
}
try {
  await go('/');
  const p = await send('purchase.create', {
    productId: product.id,
    quantity: 2,
    unitPrice: '10',
    domesticShipping: '2',
    purchaseChannel: '测试',
    purchaseDate: date,
    arrivalStatus: 'ARRIVED',
  });
  await send('purchase.create', {
    productId: product.id,
    quantity: 1,
    unitPrice: '15',
    purchaseChannel: '测试',
    purchaseDate: date,
    arrivalStatus: 'PENDING',
  });
  await send('sale.create', {
    productId: product.id,
    quantity: 1,
    unitPrice: '20',
    saleChannel: '测试',
    saleDate: date,
  });
  await send('purchase.fees', { purchaseId: p.id, internationalShipping: '6', reason: '测试补费' });
  await go('/accounting');
  const stat = (name) =>
    page
      .locator('.account-stats .mini-panel')
      .filter({ has: page.locator('span').filter({ hasText: new RegExp('^' + name + '$') }) })
      .locator('strong');
  await expect(stat('收入')).toHaveText('¥20.00');
  await expect(stat('支出')).toHaveText('¥43.00');
  await expect(stat('当前在手成本')).toHaveText('¥14.00');
  await expect(stat('花了尚未到手')).toHaveText('¥15.00');
  await expect(stat('累计已入库金额')).toHaveText('¥28.00');
  await expect(stat('累计已售利润')).toHaveText('¥6.00');
  await expect(page.locator('.account-ledger article')).toHaveCount(4);
  await page.getByLabel('记账角色').selectOption(series.characterId);
  await page.getByLabel('记账系列').selectOption(series.id);
  await expect(page.locator('.account-table tbody tr')).toHaveCount(1);
  await page.getByLabel('记账月份').fill('2020-01');
  await expect(stat('支出')).toHaveText('¥0.00');
  await expect(stat('当前在手成本')).toHaveText('¥14.00');
  await page.getByRole('button', { name: '全部月份', exact: true }).click();
  mkdirSync('.local/accounting', { recursive: true });
  const wait = page.waitForEvent('download');
  await page.getByRole('button', { name: '导出当前流水 CSV' }).click();
  await (await wait).saveAs('.local/accounting/ledger.csv');
  const csv = readFileSync('.local/accounting/ledger.csv', 'utf8');
  if (!csv.includes('测试补费') || !csv.includes('6.00')) throw Error('CSV missing fees');
  for (const width of [375, 390, 430, 768, 1024, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    if (await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1))
      throw Error('Overflow ' + width);
  }
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({ path: '.local/accounting/mobile.png', fullPage: true });
  for (const path of ['/inventory', '/purchases', '/products/' + product.id]) {
    await go(path);
    await expect(page.locator('input[type=file]')).toHaveCount(0);
    await expect(page.getByRole('button', { name: /保真高清/ })).toHaveCount(0);
  }
  await go('/admin');
  await expect(page.getByLabel('上传图片 ' + product.name, { exact: true })).toHaveCount(1);
  await db.user.update({ where: { id: user.id }, data: { role: 'USER' } });
  const status = await page.evaluate(
    async (id) =>
      (
        await fetch('/api/images', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'upload', id, mime: 'image/png' }),
        })
      ).status,
    product.id,
  );
  if (status !== 403) throw Error('Non-admin can edit image');
  if (errors.length) throw Error(errors.join('\n'));
  console.log(
    'Accounting browser: PASS (totals, filters, CSV, 6 widths, image entry restrictions and admin authorization)',
  );
} finally {
  await browser.close();
  await db.saleCostAdjustment.deleteMany({ where: { sale: { userId: user.id } } });
  await db.costRevision.deleteMany({ where: { inventory: { userId: user.id } } });
  await db.feeAdjustment.deleteMany({ where: { purchase: { userId: user.id } } });
  await db.inventoryEvent.deleteMany({ where: { inventory: { userId: user.id } } });
  await db.sale.deleteMany({ where: { userId: user.id } });
  await db.purchase.deleteMany({ where: { userId: user.id } });
  await db.inventory.deleteMany({ where: { userId: user.id } });
  await db.mutationRequest.deleteMany({ where: { userId: user.id } });
  await db.product.delete({ where: { id: product.id } });
  await db.session.deleteMany({ where: { userId: user.id } });
  await db.user.delete({ where: { id: user.id } });
  await db.$disconnect();
}
