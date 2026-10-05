import type { Product } from '../components/types';
import { compareProductsByReleaseDate } from '../lib/product-order';
import { escapeText, text as svgText, wrapText } from '../poster/utils';
import { fontRoles } from '../poster/fonts';
const text: typeof svgText = (x, y, value, options = {}) =>
  svgText(x, y, value, { ...options, family: fontRoles.handwriting });

export const catalogPageSize = 500;
export function catalogExportPages(products: Product[], type: string, character = '') {
  const selected = products
    .filter((p) => p.productType === type && (!character || p.series.character.id === character))
    .sort(compareProductsByReleaseDate);
  return selected.length ? [selected] : [];
}
export type CatalogExportItem = { name: string; date?: string | null; image?: string };
export function renderCatalogSheet(
  items: CatalogExportItem[],
  title: string,
  page: number,
  pages: number,
  showDate: boolean,
) {
  const width = 1440,
    columns = 7,
    cell = 194,
    imageSize = 166;
  const height = 180 + Math.max(1, Math.ceil(items.length / columns)) * 280 + 66;
  let body = '<rect width="100%" height="100%" fill="#ffffff"/>';
  wrapText(title, 29, 2).forEach((line, i) => {
    body += text(width / 2, 65 + i * 47, line, {
      size: 38,
      weight: 700,
      fill: '#a88e50',
      anchor: 'middle',
    });
  });
  body += text(
    width / 2,
    143,
    '按发售时间倒序 · ' +
      items.length +
      ' 款' +
      (pages > 1 ? ' · 第 ' + page + ' / ' + pages + ' 张' : ''),
    { size: 18, fill: '#8a887f', anchor: 'middle' },
  );
  items.forEach((item, i) => {
    const x = 41 + (i % columns) * cell,
      y = 180 + Math.floor(i / columns) * 280;
    body += '<g data-catalog-item="' + i + '">';
    if (item.image)
      body +=
        '<image href="' +
        escapeText(item.image) +
        '" x="' +
        (x + 14) +
        '" y="' +
        y +
        '" width="' +
        imageSize +
        '" height="' +
        imageSize +
        '" preserveAspectRatio="xMidYMid meet"/>';
    else
      body +=
        '<rect x="' +
        (x + 14) +
        '" y="' +
        y +
        '" width="' +
        imageSize +
        '" height="' +
        imageSize +
        '" rx="8" fill="#f7f6f1"/>' +
        text(x + cell / 2, y + 89, '暂无图片', { size: 19, fill: '#99958a', anchor: 'middle' });
    wrapText(item.name, 8.7, 3).forEach((line, j) => {
      body += text(x + cell / 2, y + 193 + j * 23, line, {
        size: 20,
        fill: '#a88e50',
        weight: 700,
        anchor: 'middle',
      });
    });
    if (showDate && item.date)
      body += text(x + cell / 2, y + 264, item.date.slice(0, 10), {
        size: 16,
        fill: '#8a887f',
        anchor: 'middle',
      });
    body += '</g>';
  });
  body += text(width / 2, height - 22, '谷屿 GoodsIsland · 谷子图鉴', {
    size: 17,
    fill: '#9c998f',
    anchor: 'middle',
  });
  return (
    '<svg xmlns="http://www.w3.org/2000/svg" width="' +
    width +
    '" height="' +
    height +
    '" viewBox="0 0 ' +
    width +
    ' ' +
    height +
    '">' +
    body +
    '</svg>'
  );
}
