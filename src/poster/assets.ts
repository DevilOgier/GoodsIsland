'use client';

import { fontFaceCss, posterFontAssets, type PosterFontRole } from './fonts';

const assetCache = new Map<string, Promise<string>>();
const fontCache = new Map<string, Promise<string>>();
const fontCssCache = new Map<string, Promise<string>>();

async function blobData(cache: Map<string, Promise<string>>, url: string, errorMessage: string) {
  const cached = cache.get(url);
  if (cached) return cached;
  const request = fetch(url)
    .then(async (response) => {
      if (!response.ok) throw new Error(errorMessage);
      const blob = await response.blob();
      return await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result));
        reader.onerror = () => reject(new Error(errorMessage));
        reader.readAsDataURL(blob);
      });
    })
    .catch((error) => {
      cache.delete(url);
      throw error;
    });
  cache.set(url, request);
  return request;
}

export function assetData(id: string) {
  return blobData(assetCache, `/api/images/${id}`, '商品图片加载失败');
}

export function posterFontCss(roles: PosterFontRole[]) {
  const uniqueRoles = [...new Set(roles)].sort();
  const key = uniqueRoles.join('|');
  const cached = fontCssCache.get(key);
  if (cached) return cached;
  const request = Promise.all(
    uniqueRoles.map(
      async (role) =>
        [role, await blobData(fontCache, posterFontAssets[role], '海报字体加载失败')] as const,
    ),
  )
    .then((entries) => fontFaceCss(Object.fromEntries(entries)))
    .catch((error) => {
      fontCssCache.delete(key);
      throw error;
    });
  fontCssCache.set(key, request);
  return request;
}

export function embedPosterFonts(svg: string, css: string) {
  if (!css) return svg;
  return svg.replace('<defs>', `<defs><style>${css}</style>`);
}

export async function mapWithConcurrency<T, R>(
  values: T[],
  limit: number,
  mapper: (value: T, index: number) => Promise<R>,
) {
  const results = new Array<R>(values.length);
  let nextIndex = 0;
  async function worker() {
    while (nextIndex < values.length) {
      const index = nextIndex++;
      results[index] = await mapper(values[index], index);
    }
  }
  await Promise.all(Array.from({ length: Math.min(Math.max(limit, 1), values.length) }, worker));
  return results;
}
