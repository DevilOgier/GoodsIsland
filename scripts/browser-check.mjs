import { chromium } from '@playwright/test';
import { PrismaClient } from '@prisma/client';
import { randomUUID, randomBytes, createHash } from 'node:crypto';
import { mkdirSync, writeFileSync } from 'node:fs';
import sharp from 'sharp';
const db = new PrismaClient();
const token = randomBytes(32).toString('hex');
const user = await db.user.create({
  data: {
    email: 'browser-' + randomUUID() + '@example.invalid',
    name: '测试收藏家',
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
const browser = await chromium.launch({ channel: 'msedge', headless: true });
const context = await browser.newContext({
  viewport: { width: 1440, height: 1100 },
  deviceScaleFactor: 1,
});
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
mkdirSync('.local/screenshots', { recursive: true });
let fixtureProduct;
try {
  await page.goto('http://localhost:3000');
  await page
    .getByRole('heading', { name: '把每一份喜欢， 好好收藏。' })
    .waitFor()
    .catch(() => page.getByText('收藏柜的一角').waitFor());
  await page.screenshot({ path: '.local/screenshots/dashboard-1440.png', fullPage: true });
  await page.goto('http://localhost:3000/products');
  await page.getByRole('heading', { name: '发现下一份心动' }).waitFor();
  const first = await db.product.findFirstOrThrow();
  const series = first.seriesId;
  fixtureProduct = await db.product.create({
    data: { seriesId: series, name: '浏览器验证商品', productType: 'BADGE' },
  });
  await page.reload();
  await page.getByRole('link', { name: '浏览器验证商品', exact: true }).click();
  await page.getByRole('button', { name: '记录买入', exact: true }).click();
  await page.locator('input[name=quantity]').fill('3');
  await page.locator('input[name=unitPrice]').fill('10');
  await page.locator('select[name=arrivalStatus]').selectOption('ARRIVED');
  await page.getByRole('button', { name: '确认保存' }).click();
  await page.getByRole('dialog').waitFor({ state: 'hidden' });
  await page.getByRole('button', { name: '补运费', exact: true }).click();
  await page.locator('input[name=internationalShipping]').fill('6');
  await page.locator('input[name=reason]').fill('浏览器补费验证');
  await page.getByRole('button', { name: '确认保存' }).click();
  await page.getByRole('dialog').waitFor({ state: 'hidden' });
  const purchase = await db.purchase.findFirstOrThrow({ where: { userId: user.id } });
  if (purchase.actualCost.toFixed(2) !== '36.00') throw Error('Browser fees failed');
  await sharp({ create: { width: 160, height: 160, channels: 4, background: '#9cab87' } })
    .png()
    .toFile('.local/upload-test.png');
  await page.locator('input[type=file]').setInputFiles('.local/upload-test.png');
  await page.getByText('原图已安全保存').waitFor({ timeout: 15000 });
  const checksum = (
    await db.imageAsset.findFirstOrThrow({ where: { userId: user.id, kind: 'ORIGINAL' } })
  ).checksum;
  await page.getByRole('button', { name: '保真高清（模拟）' }).click();
  await page.getByRole('button', { name: '使用高清图', exact: true }).waitFor({ timeout: 20000 });
  await Promise.all([
    page.waitForResponse((r) => r.url().endsWith('/api/images') && r.request().method() === 'POST'),
    page.getByRole('button', { name: '使用原图', exact: true }).click(),
  ]);
  const updated = await db.product.findUniqueOrThrow({
    where: { id: fixtureProduct.id },
    include: { original: true, enhanced: true },
  });
  if (
    updated.selectedSource !== 'ORIGINAL' ||
    updated.original.checksum !== checksum ||
    !updated.enhanced.isMock
  )
    throw Error('Image original/enhanced invariant failed');
  const failedJob = await db.imageJob.create({
    data: {
      userId: user.id,
      productId: fixtureProduct.id,
      originalId: updated.originalId,
      imageVersion: updated.imageVersion,
      provider: 'test-failing-provider',
    },
  });
  for (let attempt = 0; attempt < 30; attempt++) {
    const j = await db.imageJob.findUniqueOrThrow({ where: { id: failedJob.id } });
    if (j.status === 'FAILED') break;
    await new Promise((r) => setTimeout(r, 500));
  }
  if ((await db.imageJob.findUniqueOrThrow({ where: { id: failedJob.id } })).status !== 'FAILED')
    throw Error('Failure state not persisted');
  const afterFailure = await db.product.findUniqueOrThrow({ where: { id: fixtureProduct.id } });
  if (
    afterFailure.originalId !== updated.originalId ||
    afterFailure.enhancedId !== updated.enhancedId
  )
    throw Error('Failure damaged previous images');
  await page.goto('http://localhost:3000/posters');
  await page.getByLabel('添加海报商品').selectOption(fixtureProduct.id);
  await page.getByAltText('海报实时预览').waitFor();
  const download = page.waitForEvent('download');
  await page.getByRole('button', { name: '导出 PNG' }).click();
  await (await download).saveAs('.local/screenshots/poster-export.png');
  await page.getByRole('button', { name: '保存到作品集' }).click();
  await page.getByText('海报已保存到作品集').waitFor();
  const pages = [
    '/products',
    '/inventory',
    '/groups',
    '/posters',
    '/products/' + fixtureProduct.id,
  ];
  for (const width of [375, 390, 430, 768, 1024, 1440]) {
    await page.setViewportSize({ width, height: 1000 });
    for (const route of pages) {
      await page.goto('http://localhost:3000' + route);
      await page
        .locator('.skeleton')
        .waitFor({ state: 'hidden' })
        .catch(() => {});
      await page.waitForTimeout(150);
      const overflow = await page.evaluate(
        () => document.documentElement.scrollWidth > innerWidth + 1,
      );
      if (overflow) throw Error('Overflow ' + width + ' ' + route);
    }
    await page.goto('http://localhost:3000/products');
    await page.getByRole('heading', { name: '发现下一份心动' }).waitFor();
    await page.screenshot({
      path: '.local/screenshots/products-' + width + '.png',
      fullPage: true,
    });
  }
  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByRole('button', { name: '筛选', exact: true }).click();
  await page.getByRole('heading', { name: '筛选收藏' }).waitFor();
  await page.screenshot({ path: '.local/screenshots/filter-390.png', fullPage: true });
  await page.getByRole('button', { name: '查看结果' }).click();
  await page.goto('http://localhost:3000');
  await page.evaluate(() => navigator.serviceWorker.ready);
  await page.reload();
  await context.setOffline(true);
  await page.goto('http://localhost:3000/inventory');
  await page.getByText('收藏柜在这里等你。').waitFor();
  await context.setOffline(false);
  if (errors.length) throw Error(errors.join('\n'));
  writeFileSync(
    '.local/browser-results.json',
    JSON.stringify(
      {
        ok: true,
        widths: [375, 390, 430, 768, 1024, 1440],
        checks: [
          'purchase form',
          'late shipping form',
          'S3 upload',
          'Mock enhancement',
          'failed enhancement preserves original and prior enhanced',
          'original selection',
          'PNG export',
          'poster save',
          'responsive',
          'filter sheet',
          'PWA offline',
        ],
        errors,
      },
      null,
      2,
    ),
  );
  console.log('Browser checks: PASS (6 viewports, transactions, images, poster, PWA)');
} finally {
  await browser.close();
  const inv = await db.inventory.findMany({ where: { userId: user.id } });
  const ids = inv.map((i) => i.id);
  await db.posterItem.deleteMany({ where: { poster: { userId: user.id } } });
  await db.poster.deleteMany({ where: { userId: user.id } });
  await db.saleCostAdjustment.deleteMany({ where: { sale: { userId: user.id } } });
  await db.costRevision.deleteMany({ where: { inventoryId: { in: ids } } });
  await db.feeAdjustment.deleteMany({ where: { purchase: { userId: user.id } } });
  await db.inventoryEvent.deleteMany({ where: { inventoryId: { in: ids } } });
  await db.sale.deleteMany({ where: { userId: user.id } });
  await db.saleListing.deleteMany({ where: { inventoryId: { in: ids } } });
  await db.purchase.deleteMany({ where: { userId: user.id } });
  await db.inventory.deleteMany({ where: { userId: user.id } });
  await db.imageJob.deleteMany({ where: { userId: user.id } });
  await db.uploadIntent.deleteMany({ where: { userId: user.id } });
  if (fixtureProduct) await db.product.delete({ where: { id: fixtureProduct.id } });
  await db.imageAsset.updateMany({ where: { userId: user.id }, data: { sourceId: null } });
  await db.imageAsset.deleteMany({ where: { userId: user.id } });
  await db.mutationRequest.deleteMany({ where: { userId: user.id } });
  await db.session.deleteMany({ where: { userId: user.id } });
  await db.user.delete({ where: { id: user.id } });
  await db.$disconnect();
}
