'use client';
import { fontFaceCss, posterFontFamilies, posterFontSources, type PosterFontRole } from './fonts';

const registered = new Map<string, HTMLStyleElement>();
const ready = new Set<string>();

/** Native URL-backed fonts only: no fetch, ArrayBuffer, FileReader or export preparation. */
export async function preparePreviewFonts(
  roles: PosterFontRole[],
  text: string,
  template = 'unknown',
  onReady?: () => void,
) {
  const sources = posterFontSources(roles, text);
  for (const source of sources) {
    if (registered.has(source.url)) continue;
    const style = document.createElement('style');
    style.dataset.posterPreviewFont = source.url;
    style.textContent = fontFaceCss({ [source.role]: source.url })
      .replace(/font-display:(block|swap)/g, 'font-display:swap')
      .replace('}', source.unicodeRange ? `;unicode-range:${source.unicodeRange}}` : '}');
    document.head.append(style);
    registered.set(source.url, style);
  }
  const complete = Promise.all(
    [...new Set(roles)].map(async (role) => {
      const selected = sources.filter((source) => source.role === role);
      const key = selected.map((source) => source.url).join('|');
      const start = performance.now();
      const cacheHit = ready.has(key);
      try {
        if (!cacheHit)
          await document.fonts.load(`400 32px "${posterFontFamilies[role]}"`, text || '收藏');
        ready.add(key);
      } catch (error) {
        for (const source of selected) {
          registered.get(source.url)?.remove();
          registered.delete(source.url);
        }
        throw error;
      } finally {
        if (process.env.NODE_ENV !== 'production')
          for (const source of selected) {
            const entries = performance.getEntriesByName(
              new URL(source.url, location.href).href,
            ) as PerformanceResourceTiming[];
            const resource = entries.at(-1);
            console.info('[poster-font]', {
              template,
              role,
              font: posterFontFamilies[role],
              url: source.url,
              size: resource?.decodedBodySize ?? null,
              fetch: resource?.duration ?? null,
              decodeBase64: 0,
              documentFontLoad: performance.now() - start,
              cacheHit: cacheHit || (resource ? resource.transferSize === 0 : false),
              total: performance.now() - start,
              path: 'preview',
            });
          }
      }
    }),
  );
  // Slow native loads continue in the background and clear the notice when they finish.
  void complete.then(
    () => onReady?.(),
    () => undefined,
  );
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    await Promise.race([
      complete,
      new Promise<never>((_, reject) => {
        timer = setTimeout(
          () => reject(new Error('字体下载较慢，已先显示系统字体，可以继续编辑。')),
          8000,
        );
      }),
    ]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}
