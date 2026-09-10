import { chromium } from '@playwright/test';
import { PrismaClient } from '@prisma/client';
import { createHash, randomBytes, randomUUID } from 'node:crypto';
import { mkdirSync, writeFileSync } from 'node:fs';

const db = new PrismaClient();
const token = randomBytes(32).toString('hex');
const user = await db.user.create({
  data: {
    email: `shell-${randomUUID()}@example.invalid`,
    name: '岛屿测试员',
    passwordHash: 'disabled',
    role: 'ADMIN',
  },
});
await db.session.create({
  data: {
    userId: user.id,
    tokenHash: createHash('sha256').update(token).digest('hex'),
    expiresAt: new Date(Date.now() + 3_600_000),
  },
});

const browser = await chromium.launch({ channel: 'msedge', headless: true });
const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
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
page.on('pageerror', (error) => errors.push(error.message));
mkdirSync('.local/screenshots', { recursive: true });

try {
  const routes = [
    '/',
    '/products',
    '/inventory',
    '/purchases',
    '/sales',
    '/accounting',
    '/groups',
    '/wanted',
    '/posters',
    '/admin',
    '/me',
  ];
  const widths = [375, 390, 430, 768, 1024, 1440];
  for (const width of widths) {
    await page.setViewportSize({ width, height: width < 841 ? 900 : 1000 });
    for (const route of routes) {
      await page.goto(`http://localhost:3000${route}`, { waitUntil: 'networkidle' });
      await page.locator('.app-shell').waitFor();
      const layout = await page.evaluate(() => ({
        overflow: document.documentElement.scrollWidth > window.innerWidth + 1,
        sidebar: getComputedStyle(document.querySelector('.app-sidebar')).display,
        mobileNav: getComputedStyle(document.querySelector('.app-mobile-nav')).display,
        viewport: document.querySelector('meta[name="viewport"]')?.getAttribute('content') ?? '',
      }));
      if (layout.overflow) throw Error(`Horizontal overflow at ${width}px on ${route}`);
      if (width <= 840 && (layout.sidebar !== 'none' || layout.mobileNav === 'none')) {
        throw Error(`Mobile shell mismatch at ${width}px on ${route}`);
      }
      if (width > 840 && (layout.sidebar === 'none' || layout.mobileNav !== 'none')) {
        throw Error(`Desktop shell mismatch at ${width}px on ${route}`);
      }
      if (
        !layout.viewport.includes('maximum-scale=1') ||
        !layout.viewport.includes('user-scalable=no')
      ) {
        throw Error('Protected viewport settings changed');
      }
    }
  }

  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('http://localhost:3000/', { waitUntil: 'networkidle' });
  await page.getByRole('heading', { name: /你好，岛屿测试员/ }).waitFor();
  const mobileLabels = await page.locator('.app-mobile-nav a').allTextContents();
  if (mobileLabels.join('|') !== '首页|图鉴|收藏柜|心愿|我的') {
    throw Error(`Unexpected mobile navigation: ${mobileLabels.join('|')}`);
  }
  const touchHeights = await page
    .locator('.app-mobile-nav a')
    .evaluateAll((links) => links.map((link) => link.getBoundingClientRect().height));
  if (touchHeights.some((height) => height < 44))
    throw Error('Mobile navigation target is under 44px');
  await page.getByRole('button', { name: '快速记录' }).click();
  const quickSheet = page.getByRole('dialog', { name: '快速记录' });
  await quickSheet.waitFor();
  await quickSheet.getByRole('button', { name: /记录买入/ }).click();
  const mobilePurchaseForm = page.locator('.action-form--purchase');
  await mobilePurchaseForm.waitFor();
  const mobileFormBox = await mobilePurchaseForm.boundingBox();
  if (!mobileFormBox || mobileFormBox.x > 1 || Math.abs(mobileFormBox.width - 390) > 1) {
    throw Error('Purchase form is not full-screen on mobile');
  }
  if ((await mobilePurchaseForm.locator('.channel-options button').count()) !== 7) {
    throw Error('Purchase channel picker is incomplete');
  }
  await page.keyboard.press('Escape');
  await page.screenshot({ path: '.local/screenshots/shell-mobile-390.png', fullPage: true });

  await page.goto('http://localhost:3000/inventory', { waitUntil: 'networkidle' });
  if ((await page.locator('.inventory-overview-stats article').count()) !== 4) {
    throw Error('Inventory overview does not contain four stat cards');
  }
  await page.goto('http://localhost:3000/products', { waitUntil: 'networkidle' });
  const firstSeries = page.locator('.catalog-series-grid > button').first();
  if (await firstSeries.count()) {
    await firstSeries.click();
    await page.getByRole('button', { name: '紧凑模式' }).click();
    await page.locator('.collection-items.compact').waitFor();
    await page.getByRole('button', { name: '列表模式' }).click();
    await page.locator('.collection-items.list').waitFor();
  }
  await page.goto('http://localhost:3000/accounting', { waitUntil: 'networkidle' });
  if (await page.locator('.account-table').isVisible())
    throw Error('Accounting table remains visible on mobile');
  await page.goto('http://localhost:3000/groups', { waitUntil: 'networkidle' });
  if ((await page.locator('.group-overview-stats article').count()) !== 4)
    throw Error('Group overview does not contain four stat cards');
  await page.goto('http://localhost:3000/posters', { waitUntil: 'networkidle' });
  const mobilePreviewBox = await page.locator('.poster-preview-panel').boundingBox();
  const mobileSettingsBox = await page.locator('.poster-settings').boundingBox();
  if (!mobilePreviewBox || !mobileSettingsBox || mobilePreviewBox.y >= mobileSettingsBox.y)
    throw Error('Poster preview is not above controls on mobile');
  if ((await page.locator('.template-card').count()) !== 4)
    throw Error('Poster Studio does not expose four visual templates');

  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto('http://localhost:3000/posters', { waitUntil: 'networkidle' });
  const desktopPreviewBox = await page.locator('.poster-preview-panel').boundingBox();
  const desktopSettingsBox = await page.locator('.poster-settings').boundingBox();
  if (!desktopPreviewBox || !desktopSettingsBox || desktopPreviewBox.x <= desktopSettingsBox.x)
    throw Error('Poster Studio is not a two-column desktop workspace');
  await page.goto('http://localhost:3000/purchases', { waitUntil: 'networkidle' });
  await page.getByRole('button', { name: '添加' }).click();
  const desktopPurchaseForm = page.locator('.action-form--purchase');
  await page.waitForTimeout(300);
  const desktopFormBox = await desktopPurchaseForm.boundingBox();
  if (
    !desktopFormBox ||
    desktopFormBox.width > 481 ||
    Math.abs(desktopFormBox.x + desktopFormBox.width - 1440) > 1
  ) {
    throw Error(
      `Purchase form is not a right-side desktop drawer: ${JSON.stringify(desktopFormBox)}`,
    );
  }
  await desktopPurchaseForm.getByRole('button', { name: '关闭' }).click();
  await page.goto('http://localhost:3000/products', { waitUntil: 'networkidle' });
  const product = await db.product.findFirst();
  if (product) {
    await page.getByLabel('全局搜索').fill(product.name);
    await page.locator('.app-search-results a').first().waitFor();
  }
  await page.screenshot({ path: '.local/screenshots/shell-desktop-1440.png', fullPage: true });

  const manifest = await page.evaluate(async () => {
    const href = document.querySelector('link[rel="manifest"]')?.getAttribute('href');
    return href ? fetch(href).then((response) => response.json()) : null;
  });
  if (!manifest || manifest.display !== 'standalone')
    throw Error('PWA manifest is missing or changed');
  if (errors.length) throw Error(errors.join('\n'));
  const result = {
    ok: true,
    widths,
    routes,
    checks: [
      'responsive shell',
      'no horizontal overflow',
      'five-tab mobile navigation',
      '44px touch targets',
      'quick action sheet',
      'Dashboard greeting',
      'Inventory stats',
      'three Catalog views',
      'transaction drawer and mobile form',
      'purchase channel picker',
      'mobile accounting cards',
      'Group overview cards',
      'Poster mobile preview order',
      'Poster desktop columns and templates',
      'global search',
      'viewport lock',
      'PWA manifest',
    ],
    errors,
  };
  writeFileSync('.local/shell-check.json', JSON.stringify(result, null, 2));
  console.log('Shell browser checks: PASS (6 viewports, 11 routes, interactions, PWA)');
} finally {
  await browser.close();
  await db.session.deleteMany({ where: { userId: user.id } });
  await db.user.delete({ where: { id: user.id } });
  await db.$disconnect();
}
