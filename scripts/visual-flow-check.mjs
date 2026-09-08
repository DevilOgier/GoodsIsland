import { chromium, expect } from '@playwright/test';
import { PrismaClient } from '@prisma/client';
import { randomUUID, randomBytes, createHash } from 'node:crypto';
import { mkdirSync, writeFileSync } from 'node:fs';
const db = new PrismaClient(),
  suffix = randomUUID().slice(0, 7),
  token = randomBytes(32).toString('hex');
const user = await db.user.create({
  data: {
    email: 'visual-' + suffix + '@example.invalid',
    name: '交互测试',
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
const ip = await db.iP.create({ data: { name: '测试IP-' + suffix } }),
  character = await db.character.create({ data: { ipId: ip.id, name: '测试角色-' + suffix } }),
  series = await db.series.create({
    data: { characterId: character.id, name: '测试系列-' + suffix },
  });
const first = await db.product.create({
    data: {
      seriesId: series.id,
      name: character.name + ' · ' + series.name + ' · 徽章',
      productType: 'BADGE',
    },
  }),
  second = await db.product.create({
    data: {
      seriesId: series.id,
      name: character.name + ' · ' + series.name + ' · 立牌',
      productType: 'STANDEE',
    },
  });
let customType;
const browser = await chromium.launch({ channel: 'msedge', headless: true });
const context = await browser.newContext({ viewport: { width: 1440, height: 1100 } });
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
mkdirSync('.local/visual-flow', { recursive: true });
async function go(path) {
  await page.goto('http://localhost:3000' + path);
  await page.locator('.skeleton').first().waitFor({ state: 'hidden' });
}
async function cmd(operation, data) {
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
try {
  await go('/admin');
  await page.getByRole('button', { name: '添加商品', exact: true }).click();
  await page.getByLabel('所属系列').selectOption(series.id);
  await page.getByLabel('新类型名称').fill('色纸-' + suffix);
  await page.getByRole('button', { name: '新增类型', exact: true }).click();
  await expect(page.locator('.auto-name strong')).toHaveText(
    character.name + ' · ' + series.name + ' · 色纸-' + suffix,
  );
  await page.getByLabel('商品图片', { exact: true }).setInputFiles('public/icons/192.png');
  await page.getByRole('button', { name: '保存商品', exact: true }).click();
  await page.getByRole('dialog').waitFor({ state: 'hidden' });
  const custom = await db.product.findFirstOrThrow({
    where: { seriesId: series.id, productType: { notIn: ['BADGE', 'STANDEE'] } },
  });
  customType = custom.productType;
  if (!custom.originalId) throw Error('Create product did not upload image');
  await page
    .getByLabel('上传图片 ' + first.name, { exact: true })
    .setInputFiles('public/icons/512.png');
  await page.getByText('原图已安全保存').waitFor();
  await go('/purchases');
  await page.getByRole('button', { name: '添加', exact: true }).click();
  await page.getByRole('button', { name: '从系列图鉴选择谷子' }).click();
  await page.getByLabel('筛选 IP', { exact: true }).selectOption(ip.id);
  await page.getByLabel('筛选角色', { exact: true }).selectOption(character.id);
  await expect(page.locator('.series-tile')).toHaveCount(1);
  await expect(page.locator('.series-collage .product-art')).toHaveCount(3);
  await page.screenshot({ path: '.local/visual-flow/series-picker-desktop.png', fullPage: true });
  await page.locator('.series-tile').click();
  await expect(page.locator('.picker-product')).toHaveCount(3);
  await page.locator('.picker-product').filter({ hasText: '徽章' }).click();
  await page.locator('input[name=quantity]').fill('3');
  await page.locator('input[name=unitPrice]').fill('10');
  await page.locator('select[name=arrivalStatus]').selectOption('ARRIVED');
  await page.getByRole('button', { name: '确认保存' }).click();
  await page.getByRole('dialog').waitFor({ state: 'hidden' });
  for (const arrivalStatus of ['PENDING', 'SHIPPED'])
    await cmd('purchase.create', {
      productId: second.id,
      quantity: 1,
      unitPrice: '12',
      arrivalStatus,
      purchaseChannel: '测试',
      purchaseDate: '2026-09-09',
    });
  const wanted = await cmd('wanted.create', {
    productId: custom.id,
    wantedQuantity: 5,
    targetPrice: '28.00',
    notes: '只收无伤',
  });
  await cmd('wanted.progress', { id: wanted.id, fulfilledQuantity: 2 });
  const listing = await cmd('listing.create', {
    productId: first.id,
    quantity: 2,
    unitPrice: '35.00',
    notes: '可合邮',
  });
  for (const [label, route, count] of [
    ['在手谷子', 'inventory', 1],
    ['收藏种类', 'inventory', 1],
    ['等待到货', 'purchases', 2],
    ['正在收物', 'wanted', 1],
  ]) {
    await go('/');
    await page.getByRole('link', { name: '查看' + label, exact: true }).click();
    await expect(page).toHaveURL(new RegExp('/' + route + '\\?status='));
    await expect(page.locator('.collection-items.grid .collection-item')).toHaveCount(count);
    await page.getByRole('button', { name: '列表模式', exact: true }).click();
    await expect(page.locator('.collection-items.list .collection-item')).toHaveCount(count);
    await page.getByRole('button', { name: '图卡模式', exact: true }).click();
  }
  await page.getByRole('link', { name: '制作收物图', exact: true }).click();
  await expect(page.getByLabel('海报数量0')).toHaveValue('3');
  await expect(page.locator('.poster-item input[placeholder="可议"]')).toHaveValue('28');
  await expect(page.locator('.poster-item input[placeholder="备注（可选）"]')).toHaveValue(
    '只收无伤',
  );
  await expect(page.getByRole('button', { name: '导出 PNG' })).toBeEnabled();
  for (const [key, label] of [
    ['cute', '奶油手帐'],
    ['simple', '清新画廊'],
    ['retro', '复古票根'],
    ['minimal', '极简留白'],
  ]) {
    await page.getByRole('button', { name: new RegExp(label) }).click();
    await page.getByAltText('海报实时预览').waitFor();
    const download = page.waitForEvent('download');
    await page.getByRole('button', { name: '导出 PNG' }).click();
    await (await download).saveAs('.local/visual-flow/template-' + key + '.png');
  }
  await go('/listings?status=ACTIVE');
  await page.getByRole('link', { name: '制作出物图', exact: true }).click();
  await expect(page.getByLabel('海报数量0')).toHaveValue('2');
  await expect(page.locator('.poster-item input[placeholder="可议"]')).toHaveValue('35');
  if (
    (
      await db.inventory.findUniqueOrThrow({
        where: { userId_productId: { userId: user.id, productId: first.id } },
      })
    ).currentQuantity !== 3
  )
    throw Error('Poster deducted inventory');
  if (
    (await db.saleListing.findUniqueOrThrow({ where: { id: listing.id } })).remainingQuantity !== 2
  )
    throw Error('Poster changed listing');
  for (const width of [375, 390, 430, 768, 1024, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    for (const path of [
      '/inventory?status=stock',
      '/purchases?status=IN_TRANSIT',
      '/wanted?status=ACTIVE',
      '/posters?source=wanted',
    ]) {
      await go(path);
      if (await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1))
        throw Error('Overflow ' + width + ' ' + path);
    }
  }
  await page.setViewportSize({ width: 390, height: 844 });
  await go('/wanted?status=ACTIVE');
  await page.screenshot({ path: '.local/visual-flow/wanted-mobile.png', fullPage: true });
  await go('/purchases');
  await page.getByRole('button', { name: '添加', exact: true }).click();
  await page.getByRole('button', { name: '从系列图鉴选择谷子' }).click();
  await page.getByLabel('筛选 IP', { exact: true }).selectOption(ip.id);
  await page.screenshot({ path: '.local/visual-flow/series-picker-mobile.png', fullPage: true });
  if (await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1))
    throw Error('Picker overflow');
  if (errors.length) throw Error(errors.join('\n'));
  writeFileSync(
    '.local/visual-flow/results.json',
    JSON.stringify(
      {
        ok: true,
        checks: [
          '4 clickable stats',
          'image/list modes',
          'custom type + automatic name',
          'create image upload',
          'admin direct upload',
          'IP/character filtering + series collage',
          'purchase via series/type',
          'wanted/listing poster prefill',
          '4 distinct template exports',
          'no inventory side effects',
          '6 widths',
        ],
        errors,
      },
      null,
      2,
    ),
  );
  console.log('Visual flow: PASS');
} finally {
  await browser.close();
  const inv = await db.inventory.findMany({ where: { userId: user.id } }),
    ids = inv.map((i) => i.id);
  await db.posterItem.deleteMany({ where: { poster: { userId: user.id } } });
  await db.poster.deleteMany({ where: { userId: user.id } });
  await db.inventoryEvent.deleteMany({ where: { inventoryId: { in: ids } } });
  await db.purchase.deleteMany({ where: { userId: user.id } });
  await db.saleListing.deleteMany({ where: { inventoryId: { in: ids } } });
  await db.inventory.deleteMany({ where: { userId: user.id } });
  await db.wanted.deleteMany({ where: { userId: user.id } });
  await db.uploadIntent.deleteMany({ where: { userId: user.id } });
  await db.product.deleteMany({ where: { seriesId: series.id } });
  await db.imageAsset.updateMany({ where: { userId: user.id }, data: { sourceId: null } });
  await db.imageAsset.deleteMany({ where: { userId: user.id } });
  if (!customType) {
    const t = await db.productType.findUnique({ where: { name: '色纸-' + suffix } });
    customType = t?.key;
  }
  if (customType) await db.productType.delete({ where: { key: customType } });
  await db.series.delete({ where: { id: series.id } });
  await db.character.delete({ where: { id: character.id } });
  await db.iP.delete({ where: { id: ip.id } });
  await db.session.deleteMany({ where: { userId: user.id } });
  await db.mutationRequest.deleteMany({ where: { userId: user.id } });
  await db.user.delete({ where: { id: user.id } });
  await db.$disconnect();
}
