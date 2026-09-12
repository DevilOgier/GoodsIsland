import { fontRoles } from './fonts';
import type {
  PosterData,
  PosterDensity,
  PosterItemData,
  PosterPalette,
  PosterPriceStyle,
  PosterRenderOptions,
} from './types';

export const ratios: Record<string, [number, number]> = {
  '1:1': [1080, 1080],
  '4:3': [1440, 1080],
  '3:4': [1080, 1440],
  '16:9': [1920, 1080],
  '9:16': [1080, 1920],
};

export function escapeText(value: string) {
  return value.replace(
    /[&<>"']/g,
    (character) =>
      ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;' })[character]!,
  );
}

function visualLength(value: string) {
  return [...value].reduce(
    (length, character) => length + (character.codePointAt(0)! > 255 ? 1 : 0.58),
    0,
  );
}

export function wrapText(value: string, maxUnits: number, maxLines = 2) {
  if (!value) return [];
  const result: string[] = [];
  let line = '';
  for (const character of value) {
    if (visualLength(line + character) > maxUnits && line) {
      result.push(line);
      line = character;
      if (result.length === maxLines) break;
    } else {
      line += character;
    }
  }
  if (result.length < maxLines && line) result.push(line);
  const consumed = result.join('').length;
  if (consumed < value.length && result.length) {
    const last = result.length - 1;
    let truncated = result[last];
    while (truncated && visualLength(truncated + '…') > maxUnits)
      truncated = truncated.slice(0, -1);
    result[last] = truncated + '…';
  }
  return result;
}

export function text(
  x: number,
  y: number,
  value: string,
  options: {
    size?: number;
    fill?: string;
    family?: string;
    weight?: number | string;
    anchor?: 'start' | 'middle' | 'end';
    letterSpacing?: number;
    style?: string;
    opacity?: number;
  } = {},
) {
  const {
    size = 20,
    fill = '#30352e',
    family = fontRoles.sans,
    weight,
    anchor,
    letterSpacing,
    style,
    opacity,
  } = options;
  return `<text x="${x}" y="${y}" font-family="${escapeText(family)}" font-size="${size}" fill="${fill}"${weight ? ` font-weight="${weight}"` : ''}${anchor ? ` text-anchor="${anchor}"` : ''}${letterSpacing !== undefined ? ` letter-spacing="${letterSpacing}"` : ''}${style ? ` font-style="${style}"` : ''}${opacity !== undefined ? ` opacity="${opacity}"` : ''}>${escapeText(value)}</text>`;
}

export function wrappedText(
  x: number,
  y: number,
  value: string,
  maxUnits: number,
  lineHeight: number,
  maxLines: number,
  options: Parameters<typeof text>[3] = {},
) {
  return wrapText(value, maxUnits, maxLines)
    .map((line, index) => text(x, y + index * lineHeight, line, options))
    .join('');
}

export function image(
  item: PosterItemData,
  x: number,
  y: number,
  width: number,
  height: number,
  fallback: string,
  options: { clipId?: string; fit?: 'meet' | 'slice'; radius?: number } = {},
) {
  if (item.image && /^data:image\/(png|jpeg|webp|gif);base64,/.test(item.image)) {
    const clip = options.clipId ? ` clip-path="url(#${options.clipId})"` : '';
    return `<image href="${item.image}" x="${x}" y="${y}" width="${width}" height="${height}" preserveAspectRatio="xMidYMid ${options.fit ?? 'meet'}"${clip}/>`;
  }
  const radius = options.radius ?? 0;
  return (
    `<rect x="${x}" y="${y}" width="${width}" height="${height}" rx="${radius}" fill="${fallback}"/>` +
    text(x + width / 2, y + height / 2, '图片准备中', {
      size: Math.max(13, Math.min(20, width / 12)),
      fill: '#85857e',
      anchor: 'middle',
    })
  );
}

export function resolveOptions(
  defaults: PosterRenderOptions,
  config?: Partial<PosterRenderOptions>,
): PosterRenderOptions {
  const density: PosterDensity = ['IMAGE_FIRST', 'BALANCED', 'INFO_FIRST'].includes(
    config?.density ?? '',
  )
    ? (config!.density as PosterDensity)
    : defaults.density;
  const priceStyle: PosterPriceStyle = ['PRICE_PROMINENT', 'PRICE_NORMAL', 'PRICE_HIDDEN'].includes(
    config?.priceStyle ?? '',
  )
    ? (config!.priceStyle as PosterPriceStyle)
    : defaults.priceStyle;
  return {
    palette: config?.palette || defaults.palette,
    density,
    priceStyle,
    showNote: config?.showNote ?? defaults.showNote,
  };
}

export function validatePoster(data: PosterData) {
  if (!ratios[data.ratio]) throw new Error('比例无效');
  if (!data.items.length || data.items.length > 12) throw new Error('请选择 1 至 12 件商品');
  for (const item of data.items) {
    if (!Number.isSafeInteger(item.quantity) || item.quantity < 1) {
      throw new Error('数量必须为正整数');
    }
    if (item.price && !/^\d+(\.\d{1,2})?$/.test(item.price)) {
      throw new Error('价格格式不正确');
    }
  }
}

export function posterSvg(
  width: number,
  height: number,
  background: string,
  defs: string,
  body: string,
  metadata: { template: string; palette: string },
) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" data-template="${metadata.template}" data-palette="${metadata.palette}"><defs>${defs}</defs><rect width="100%" height="100%" fill="${background}"/>${body}</svg>`;
}

export function priceLabel(data: PosterData, item: PosterItemData) {
  if (!item.price) return data.type === 'WANTED' ? '价格可议' : '欢迎询价';
  return data.type === 'WANTED' ? `心理价 ¥${item.price}` : `¥${item.price}`;
}

export function priceSize(style: PosterPriceStyle, normal: number, prominent: number) {
  return style === 'PRICE_PROMINENT' ? prominent : normal;
}

export function densityRatio(density: PosterDensity) {
  return density === 'IMAGE_FIRST' ? 0.68 : density === 'INFO_FIRST' ? 0.45 : 0.57;
}

export function choosePalette(palettes: PosterPalette[], id: string) {
  return palettes.find((palette) => palette.id === id) ?? palettes[0];
}

export function gridColumns(count: number, width: number, height: number) {
  const landscape = width / height > 1.25;
  if (count === 1) return 1;
  if (landscape) return count <= 3 ? count : count <= 8 ? 4 : 4;
  if (count <= 2) return count;
  return count <= 6 ? 2 : 3;
}
