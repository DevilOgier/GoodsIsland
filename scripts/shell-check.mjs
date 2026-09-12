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
const shellProduct = await db.product.findFirst();
if (shellProduct) {
  await db.purchase.create({
    data: {
      userId: user.id,
      productId: shellProduct.id,
      quantity: 1,
      unitPrice: '10',
      productAmount: '10',
      domesticShipping: '0',
      internationalShipping: '0',
      otherFee: '0',
      actualCost: '10',
      purchaseChannel: '测试',
      purchaseDate: new Date('2026-09-11'),
      arrivalStatus: 'PENDING',
      notes: '',
    },
  });
  await db.sale.create({
    data: {
      userId: user.id,
      productId: shellProduct.id,
      quantity: 1,
      unitPrice: '12',
      totalAmount: '12',
      allocatedActualCost: '10',
      saleChannel: '测试',
      saleDate: new Date('2026-09-11'),
      notes: '',
    },
  });
  await db.wanted.createMany({
    data: [
      {
        userId: user.id,
        productId: shellProduct.id,
        wantedQuantity: 2,
        fulfilledQuantity: 0,
        targetPrice: '15',
        priority: 'NORMAL',
        status: 'WANTED',
        notes: '界面测试',
      },
      {
        userId: user.id,
        productId: shellProduct.id,
        wantedQuantity: 1,
        fulfilledQuantity: 1,
        targetPrice: '15',
        priority: 'NORMAL',
        status: 'FULFILLED',
        notes: '应当隐藏',
      },
    ],
  });
}

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
  const dashboardDestinations = await page
    .locator('.stats .stat-link')
    .evaluateAll((links) => links.map((link) => link.getAttribute('href')));
  if (
    dashboardDestinations[0] !== '/inventory?status=stock' ||
    dashboardDestinations[1] !== '/accounting'
  )
    throw Error(`Dashboard stat destinations are incorrect: ${dashboardDestinations.join('|')}`);
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
  if (
    await mobilePurchaseForm.evaluate(
      (form) =>
        form.scrollWidth > form.clientWidth + 1 ||
        document.documentElement.scrollWidth > innerWidth + 1,
    )
  ) {
    throw Error('Purchase form can move horizontally on mobile');
  }
  await page.keyboard.press('Escape');
  await page.screenshot({ path: '.local/screenshots/shell-mobile-390.png', fullPage: true });

  await page.goto('http://localhost:3000/inventory', { waitUntil: 'networkidle' });
  if (
    (await page.getByRole('button', { name: /周边类型/ }).getAttribute('aria-pressed')) !== 'true'
  )
    throw Error('Inventory should default to merchandise type view');
  if ((await page.locator('.inventory-overview-stats > a').count()) !== 4) {
    throw Error('Inventory overview does not contain four stat cards');
  }
  await page.getByRole('link', { name: /等待到货/ }).click();
  await page.waitForURL('**/inventory?status=IN_TRANSIT');
  if (
    !(await page.getByText(/等待到货 ×/).count()) &&
    !(await page.locator('.catalog-type-list > button').count()) &&
    !(await page.locator('.ui-empty-state').count())
  )
    throw Error('Inventory awaiting-arrival view did not apply its item filter');
  await page.goto('http://localhost:3000/products', { waitUntil: 'networkidle' });
  if (
    (await page.getByRole('button', { name: /周边类型/ }).getAttribute('aria-pressed')) !== 'true'
  )
    throw Error('Catalog should default to merchandise type view');
  if (shellProduct) {
    const catalogSearch = page.getByLabel('搜索谷子');
    await catalogSearch.fill(shellProduct.name);
    await page.waitForURL((url) => url.searchParams.get('q') === shellProduct.name);
    await page.reload({ waitUntil: 'networkidle' });
    if ((await page.getByLabel('搜索谷子').inputValue()) !== shellProduct.name)
      throw Error('Catalog URL search filter was not restored after reload');
    await page.getByLabel('搜索谷子').fill('');
    await page.waitForURL((url) => !url.searchParams.has('q'));
  }
  await page.getByRole('button', { name: /周边系列/ }).click();
  const seriesHeights = await page
    .locator('.catalog-series-grid > button')
    .evaluateAll((cards) => cards.map((card) => Math.round(card.getBoundingClientRect().height)));
  if (seriesHeights.length > 1 && Math.max(...seriesHeights) - Math.min(...seriesHeights) > 1)
    throw Error(`Series cards have inconsistent heights: ${seriesHeights.join(',')}`);
  const seriesAlignments = await page
    .locator('.catalog-series-grid > button > span')
    .evaluateAll((labels) => labels.map((label) => getComputedStyle(label).textAlign));
  if (seriesAlignments.some((alignment) => alignment !== 'left'))
    throw Error(
      `Series card labels are not consistently left aligned: ${seriesAlignments.join(',')}`,
    );
  const firstSeries = page.locator('.catalog-series-grid > button').first();
  if (await firstSeries.count()) {
    await firstSeries.click();
    if ((await page.locator('.view-switch button').count()) !== 2)
      throw Error('Catalog should expose only album and list views');
    await page.getByRole('button', { name: '列表模式' }).click();
    await page.locator('.collection-items.list').waitFor();
  }
  await page.goto('http://localhost:3000/accounting', { waitUntil: 'networkidle' });
  if (await page.locator('.account-table').isVisible())
    throw Error('Accounting table remains visible on mobile');
  await page.goto('http://localhost:3000/groups', { waitUntil: 'networkidle' });
  if ((await page.locator('.group-overview-stats > a').count()) !== 4)
    throw Error('Group overview does not contain four stat cards');
  if (await page.locator('.group-card .product-art').count())
    throw Error('Group cards should not contain product imagery');
  await page.getByRole('link', { name: /待付款/ }).click();
  await page.waitForURL('**/groups?view=unpaid');
  await page.locator('.group-task-panel').waitFor();
  await page.goto('http://localhost:3000/posters', { waitUntil: 'networkidle' });
  const mobilePreviewBox = await page.locator('.poster-preview-panel').boundingBox();
  const mobileSettingsBox = await page.locator('.poster-settings').boundingBox();
  if (!mobilePreviewBox || !mobileSettingsBox || mobilePreviewBox.y <= mobileSettingsBox.y)
    throw Error('Poster preview is not below controls on mobile');
  if ((await page.locator('.template-card').count()) !== 4)
    throw Error('Poster Studio does not expose four visual templates');

  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto('http://localhost:3000/posters', { waitUntil: 'networkidle' });
  const desktopPreviewBox = await page.locator('.poster-preview-panel').boundingBox();
  const desktopSettingsBox = await page.locator('.poster-settings').boundingBox();
  if (!desktopPreviewBox || !desktopSettingsBox || desktopPreviewBox.x <= desktopSettingsBox.x)
    throw Error('Poster Studio is not a two-column desktop workspace');
  await page.goto('http://localhost:3000/purchases', { waitUntil: 'networkidle' });
  if (
    (await page.getByRole('button', { name: '列表模式' }).getAttribute('aria-pressed')) !== 'true'
  )
    throw Error('Purchase records should default to list mode');
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
  await page.goto('http://localhost:3000/sales', { waitUntil: 'networkidle' });
  if (!(await page.locator('.record-list .record').count()))
    throw Error('Sale records should render as a list');
  await page.goto('http://localhost:3000/wanted', { waitUntil: 'networkidle' });
  if (shellProduct) {
    if ((await page.locator('.collection-item').count()) !== 1)
      throw Error('Fulfilled wanted items should be hidden');
    await page.locator('.gallery-open-name').click();
    await page.locator('.action-form--wantedEdit').waitFor();
    await page.getByRole('button', { name: '关闭' }).click();
  }
  await page.goto('http://localhost:3000/products', { waitUntil: 'networkidle' });
  const product = shellProduct;
  if (product) {
    await page.goto(`http://localhost:3000/products/${product.id}`, { waitUntil: 'networkidle' });
    await page.getByText('等待到货', { exact: true }).waitFor();
    if (
      !(await page.locator('.collection-item--no-image').count()) ||
      (await page.locator('.collection-item--no-image .gallery-image').count())
    )
      throw Error('Product detail purchase history should not repeat product imagery');
    await page.goto('http://localhost:3000/products', { waitUntil: 'networkidle' });
    await page.getByLabel('全局搜索').fill(product.name);
    await page.locator('.app-search-results a').first().waitFor();
  }
  await page.goto('http://localhost:3000/admin', { waitUntil: 'networkidle' });
  const adminTabs = await page.locator('.admin-tabs button').allTextContents();
  if (adminTabs.join('|') !== '商品|IP|角色|系列|谷子类型|标签') {
    throw Error(`Unexpected admin navigation: ${adminTabs.join('|')}`);
  }
  await page.getByRole('button', { name: '系列', exact: true }).click();
  if (!(await page.locator('.catalog-taxonomy').isVisible()))
    throw Error('Admin taxonomy panel does not open from its tab');
  await page.screenshot({ path: '.local/screenshots/shell-desktop-1440.png', fullPage: true });

  const manifest = await page.evaluate(async () => {
    const href = document.querySelector('link[rel="manifest"]')?.getAttribute('href');
    return href ? fetch(href).then((response) => response.json()) : null;
  });
  if (!manifest || manifest.display !== 'standalone')
    throw Error('PWA manifest is missing or changed');

  const guest = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const guestPage = await guest.newPage();
  await guestPage.goto('http://localhost:3000/login', { waitUntil: 'networkidle' });
  if (await guestPage.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1))
    throw Error('Login page overflows at 390px');
  await guestPage.getByRole('tab', { name: '注册' }).click();
  await guestPage.getByRole('heading', { name: '创建你的收藏柜' }).waitFor();
  if (!(await guestPage.getByLabel('确认密码').isVisible()))
    throw Error('Registration fields are not available to a new user');
  await guestPage.setViewportSize({ width: 1440, height: 1000 });
  await guestPage.reload({ waitUntil: 'networkidle' });
  if (!(await guestPage.locator('.login-art').isVisible()))
    throw Error('Desktop login brand panel is missing');
  await guest.close();
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
      'dashboard stat destinations',
      'Dashboard greeting',
      'Inventory stats',
      'Inventory in-transit detail link',
      'album and list Catalog views',
      'transaction drawer and mobile form',
      'purchase channel picker',
      'mobile purchase horizontal lock',
      'uniform Series cards',
      'mobile accounting cards',
      'Group overview cards',
      'Group task detail links',
      'Poster mobile workflow order',
      'Poster desktop columns and templates',
      'global search',
      'six-section Admin navigation',
      'mobile registration flow',
      'responsive login page',
      'viewport lock',
      'PWA manifest',
    ],
    errors,
  };
  writeFileSync('.local/shell-check.json', JSON.stringify(result, null, 2));
  console.log('Shell browser checks: PASS (6 viewports, 11 routes, interactions, PWA)');
} finally {
  await browser.close();
  await db.wanted.deleteMany({ where: { userId: user.id } });
  await db.sale.deleteMany({ where: { userId: user.id } });
  await db.purchase.deleteMany({ where: { userId: user.id } });
  await db.session.deleteMany({ where: { userId: user.id } });
  await db.user.delete({ where: { id: user.id } });
  await db.$disconnect();
}
