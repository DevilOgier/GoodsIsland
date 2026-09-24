import { renderPoster as renderV2, templates as legacyTemplates } from './v2-renderer';
import { legacyTemplateIds, posterTemplateRegistry, posterTemplates } from './registry';
import type { PosterData } from './types';
import { choosePalette, ratios, resolveOptions, validatePoster } from './utils';

export type {
  PosterData,
  PosterDensity,
  PosterItemData,
  PosterPalette,
  PosterPriceStyle,
  PosterRenderOptions,
  PosterTemplate,
  PosterType,
} from './types';
export { ratios } from './utils';
export { posterTemplates } from './registry';

export const templates: Record<
  string,
  { background: string; accent: string; label: string; description: string }
> = {
  ...legacyTemplates,
  ...Object.fromEntries(
    posterTemplates.map((template) => [
      template.id,
      {
        background: template.palettes[0].background,
        accent: template.palettes[0].primary,
        label: template.name,
        description: template.description,
      },
    ]),
  ),
};

export function renderPoster(data: PosterData) {
  if (data.version === 1 || legacyTemplateIds.has(data.template)) {
    return renderV2(data);
  }

  validatePoster(data);
  const template = posterTemplateRegistry.get(data.template);
  const size = ratios[data.ratio];
  if (!template || !size) throw new Error('比例或模板无效');
  const options = resolveOptions(template.defaultOptions, data.config);
  const palette = choosePalette(template.palettes, options.palette);
  return template.render(data, options, palette, size[0], size[1]);
}

export type PosterImageTarget = {
  productId: string;
  displayWidth: number;
  displayHeight: number;
};

const transparentProbeImage =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=';

export function posterImageTargets(data: PosterData): Map<string, PosterImageTarget> {
  const size = ratios[data.ratio];
  if (!size) return new Map();
  const fallbackColumns = Math.max(1, Math.ceil(Math.sqrt(data.items.length)));
  const fallback = {
    displayWidth: size[0] / fallbackColumns,
    displayHeight: size[1] / Math.max(1, Math.ceil(data.items.length / fallbackColumns)),
  };
  if (data.version === 1 || legacyTemplateIds.has(data.template)) {
    return new Map(
      data.items.map((item) => [item.productId, { productId: item.productId, ...fallback }]),
    );
  }

  const probeSvg = renderPoster({
    ...data,
    items: data.items.map((item) => ({ ...item, image: transparentProbeImage })),
  });
  const targets = new Map<string, PosterImageTarget>();
  const layoutScale = Number(probeSvg.match(/data-layout-scale="([\d.]+)"/)?.[1] ?? 1);
  for (const match of probeSvg.matchAll(/<image\b[^>]*data-poster-product-id="([^"]+)"[^>]*>/g)) {
    const tag = match[0];
    const width = Number(tag.match(/\bwidth="([\d.]+)"/)?.[1]);
    const height = Number(tag.match(/\bheight="([\d.]+)"/)?.[1]);
    const productId = decodeURIComponent(match[1]);
    if (!Number.isFinite(width) || !Number.isFinite(height)) continue;
    const current = targets.get(productId);
    targets.set(productId, {
      productId,
      displayWidth: Math.max(current?.displayWidth ?? 0, width * layoutScale),
      displayHeight: Math.max(current?.displayHeight ?? 0, height * layoutScale),
    });
  }
  for (const item of data.items) {
    if (!targets.has(item.productId)) {
      targets.set(item.productId, { productId: item.productId, ...fallback });
    }
  }
  return targets;
}
