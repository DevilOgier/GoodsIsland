import { createHash } from 'node:crypto';
import { resolve } from 'node:path';
import sharp from 'sharp';
import { db } from '../infrastructure/db';
import { productInclude } from './query-service';
import { readObject, putObject } from '../infrastructure/storage';
import {
  enqueueCatalog,
  readCatalogRecord,
  saveCatalogResult,
  catalogCycle,
  type CatalogRecipe,
  type CatalogResult,
} from '../infrastructure/catalog-export-store';
import { renderCatalogSheet } from '../catalog/export';
import { ensure } from './errors';
export async function catalogProducts(recipe: CatalogRecipe) {
  return db.product.findMany({
    where: {
      productType: recipe.type,
      ...(recipe.character ? { series: { characterId: recipe.character } } : {}),
      ...(recipe.ids ? { id: { in: recipe.ids } } : {}),
    },
    include: productInclude,
    orderBy: [
      { releaseDate: { sort: 'desc', nulls: 'last' } },
      { createdAt: 'desc' },
      { id: 'desc' },
    ],
  });
}
export function catalogTitle(products: Awaited<ReturnType<typeof catalogProducts>>) {
  const chars = [...new Set(products.map((p) => p.series.character.name))];
  return (
    (chars.length === 1 ? chars[0] : '') + (products[0]?.typeDefinition.name ?? '谷子') + '图鉴'
  );
}
export async function requestCatalog(input: CatalogRecipe) {
  const full = await catalogProducts({ ...input, ids: undefined });
  ensure(full.length > 0, '该类型下没有商品');
  const selected = input.ids ? full.filter((p) => input.ids!.includes(p.id)) : full;
  ensure(selected.length > 0, '没有符合筛选的商品');
  ensure(selected.length <= 500, '该筛选超过 500 款，请按角色或系列缩小范围');
  const characterIds = [...new Set(selected.map((p) => p.series.character.id))];
  const character = input.character || (characterIds.length === 1 ? characterIds[0] : '');
  const scope = character ? full.filter((p) => p.series.character.id === character) : full;
  const recipe: CatalogRecipe = {
    type: input.type,
    character,
    ids: selected.length === scope.length ? undefined : selected.map((p) => p.id).sort(),
    title: input.title.trim() || catalogTitle(selected),
    showDate: input.showDate,
  };
  const key = await enqueueCatalog(recipe);
  return { id: key, ...(await catalogStatus(key)) };
}
export async function catalogStatus(key: string) {
  const recipe = await readCatalogRecord<CatalogRecipe>(key, 'request');
  ensure(recipe, '图鉴不存在', 404);
  const result = await readCatalogRecord<CatalogResult>(key, 'result');
  return result?.generatedAt
    ? {
        status: 'ready',
        generatedAt: result.generatedAt,
        count: result.count,
        title: result.title,
        url: '/api/catalog-export/' + key + '?download=1',
      }
    : result?.error
      ? { status: 'failed', error: result.error }
      : { status: 'queued' };
}
let fontReady: Promise<unknown> | undefined;
export async function renderCatalogPng(svg: string) {
  // Register the bundled OFL font with libvips/fontconfig. This is server-side only.
  fontReady ??= sharp({
    text: {
      text: '图鉴',
      font: 'LXGW WenKai Lite',
      fontfile: resolve('assets/fonts/LXGWWenKaiLite-Regular.ttf'),
      rgba: true,
    },
  })
    .png()
    .toBuffer()
    .catch((error) => {
      fontReady = undefined;
      throw error;
    });
  await fontReady;
  const fontSvg = svg.replace(/font-family="[^"]*"/g, 'font-family="LXGW WenKai Lite"');
  return sharp(Buffer.from(fontSvg), { limitInputPixels: 100000000 }).png().toBuffer();
}
export async function generateCatalog(key: string) {
  const recipe = await readCatalogRecord<CatalogRecipe>(key, 'request');
  if (!recipe) return;
  const previous = await readCatalogRecord<CatalogResult>(key, 'result');
  try {
    const products = await catalogProducts(recipe);
    ensure(products.length > 0 && products.length <= 500, '没有可导出的商品或超过长图上限');
    const fingerprint = createHash('sha256').update(JSON.stringify(products)).digest('hex');
    if (previous?.generatedAt && previous.fingerprint === fingerprint) {
      await saveCatalogResult(key, {
        ...previous,
        error: undefined,
        retryAfter: undefined,
        generatedAt: new Date().toISOString(),
      });
      return;
    }
    const items = [];
    // Sequential decode bounds original-image memory. HTTP requests never run this renderer.
    for (const product of products) {
      const id =
        product.selectedSource === 'ENHANCED' && product.enhancedId
          ? product.enhancedId
          : product.originalId;
      let image: string | undefined;
      if (id) {
        const asset = await db.imageAsset.findUniqueOrThrow({ where: { id } });
        try {
          const bytes = await sharp(await readObject(asset.objectKey))
            .rotate()
            .resize(332, 332, { fit: 'inside', withoutEnlargement: true })
            .png()
            .toBuffer();
          image = 'data:image/png;base64,' + bytes.toString('base64');
        } catch {
          throw Error(product.name + '：图片读取失败');
        }
      }
      items.push({ name: product.name, date: product.releaseDate?.toISOString(), image });
    }
    const png = await renderCatalogPng(
      renderCatalogSheet(items, recipe.title, 1, 1, recipe.showDate),
    );
    ensure(png.length <= 40 * 1024 * 1024, '长图文件过大，请按角色缩小范围');
    await putObject('catalog/' + key, png, 'image/png');
    await saveCatalogResult(key, {
      key,
      title: recipe.title,
      count: products.length,
      fingerprint,
      generatedAt: new Date().toISOString(),
    });
  } catch (error) {
    await saveCatalogResult(key, {
      key,
      title: recipe.title,
      count: previous?.count ?? 0,
      fingerprint: previous?.fingerprint ?? '',
      generatedAt: previous?.generatedAt ?? '',
      error: error instanceof Error ? error.message : '生成失败',
      retryAfter: new Date(Date.now() + 15 * 60000).toISOString(),
    });
  }
}
export async function enqueueDefaultCatalogs() {
  const products = await db.product.findMany({ include: productInclude });
  const groups = new Map<string, typeof products>();
  for (const p of products)
    for (const character of ['', p.series.character.id]) {
      const id = p.productType + ':' + character;
      groups.set(id, [...(groups.get(id) ?? []), p]);
    }
  for (const [key, values] of groups) {
    if (values.length > 500) continue;
    // Character-specific and whole-type recipes share the same deterministic cache.
    const type = values[0].productType;
    const character = key.slice(type.length + 1);
    await enqueueCatalog({ type, character, title: catalogTitle(values), showDate: false });
  }
}
export function catalogNeedsRefresh(result: CatalogResult | null, now = new Date()) {
  if (result?.retryAfter && new Date(result.retryAfter) > now) return false;
  return !result?.generatedAt || catalogCycle(new Date(result.generatedAt)) !== catalogCycle(now);
}
