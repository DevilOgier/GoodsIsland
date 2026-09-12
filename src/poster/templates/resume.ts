import { fontRoles } from '../fonts';
import type { PosterTemplate } from '../types';
import { image, posterSvg, priceLabel, priceSize, text, wrappedText } from '../utils';

export const resumeTemplate: PosterTemplate = {
  id: 'resume',
  name: '收藏简历',
  description: '档案排版 · 信息清晰',
  recommendedItems: '5–12 件',
  typography: {
    display: fontRoles.serif,
    title: fontRoles.sans,
    body: fontRoles.sans,
    numeric: fontRoles.mono,
    handwriting: fontRoles.sans,
  },
  palettes: [
    {
      id: 'paper',
      label: '冷米白',
      background: '#f2f1ed',
      surface: '#fbfbf8',
      primary: '#4f655c',
      secondary: '#cfd7d2',
      text: '#242b28',
      muted: '#707a75',
      price: '#324d43',
    },
    {
      id: 'slate',
      label: '浅灰蓝',
      background: '#e8edf0',
      surface: '#f9fbfc',
      primary: '#506978',
      secondary: '#c8d4db',
      text: '#26343c',
      muted: '#6e7e87',
      price: '#365b70',
    },
    {
      id: 'mono',
      label: '黑白',
      background: '#eeeeeb',
      surface: '#ffffff',
      primary: '#343936',
      secondary: '#d5d7d5',
      text: '#202321',
      muted: '#707471',
      price: '#202321',
    },
  ],
  defaultOptions: {
    palette: 'paper',
    density: 'INFO_FIRST',
    priceStyle: 'PRICE_NORMAL',
    showNote: true,
  },
  render(data, options, palette, width, height) {
    const margin = Math.round(width * 0.055);
    const header = Math.max(180, Math.round(height * 0.18));
    const footer = 45;
    const columns = width > height * 1.15 || data.items.length > 7 ? 2 : 1;
    const columnGap = 36;
    const rows = Math.ceil(data.items.length / columns);
    const contentWidth = width - margin * 2;
    const columnWidth = (contentWidth - columnGap * (columns - 1)) / columns;
    const rowHeight = (height - header - footer - 34) / rows;
    const imageSize = Math.max(48, Math.min(92, rowHeight - 20, columnWidth * 0.16));
    let entries = '';

    data.items.forEach((item, index) => {
      const column = index % columns;
      const row = Math.floor(index / columns);
      const x = margin + column * (columnWidth + columnGap);
      const y = header + 34 + row * rowHeight;
      const infoX = x + imageSize + 20;
      const infoWidth = columnWidth - imageSize - 20;
      const titleSize = Math.max(15, Math.min(23, columnWidth / 22));
      const priceY = y + Math.min(rowHeight - 22, Math.max(69, rowHeight * 0.68));
      const clipId = `resume-image-${index}`;

      entries += `<g data-layout="resume-entry">`;
      entries += `<clipPath id="${clipId}"><rect x="${x}" y="${y + 9}" width="${imageSize}" height="${imageSize}" rx="3"/></clipPath>`;
      entries += `<rect x="${x}" y="${y + 9}" width="${imageSize}" height="${imageSize}" rx="3" fill="${palette.background}" stroke="${palette.secondary}"/>`;
      entries += image(item, x, y + 9, imageSize, imageSize, palette.background, {
        clipId,
        fit: 'meet',
      });
      entries += text(infoX, y + 15, `ITEM ${String(index + 1).padStart(2, '0')}`, {
        size: 11,
        fill: palette.primary,
        family: fontRoles.mono,
        weight: 700,
        letterSpacing: 1.6,
      });
      entries += wrappedText(
        infoX,
        y + 43,
        item.name,
        Math.max(10, infoWidth / titleSize),
        titleSize + 5,
        2,
        { size: titleSize, fill: palette.text, weight: 700 },
      );
      entries += text(infoX, priceY, 'QTY', {
        size: 10,
        fill: palette.muted,
        family: fontRoles.mono,
        letterSpacing: 1.4,
      });
      entries += text(infoX + 42, priceY, String(item.quantity).padStart(2, '0'), {
        size: 17,
        fill: palette.text,
        family: fontRoles.mono,
        weight: 700,
      });
      if (options.priceStyle !== 'PRICE_HIDDEN') {
        entries += text(infoX + 92, priceY, data.type === 'WANTED' ? 'BUDGET' : 'PRICE', {
          size: 10,
          fill: palette.muted,
          family: fontRoles.mono,
          letterSpacing: 1.2,
        });
        entries += text(x + columnWidth, priceY, priceLabel(data, item), {
          size: priceSize(options.priceStyle, 17, 23),
          fill: palette.price,
          family: fontRoles.mono,
          anchor: 'end',
          weight: 800,
        });
      }
      if (options.showNote && item.note && rowHeight > 142) {
        entries += text(
          infoX,
          Math.min(y + rowHeight - 13, priceY + 25),
          item.note.length > 28 ? item.note.slice(0, 27) + '…' : item.note,
          { size: 12, fill: palette.muted },
        );
      }
      entries += `<path d="M ${x} ${y + rowHeight - 1} H ${x + columnWidth}" stroke="${palette.secondary}"/>`;
      entries += '</g>';
    });

    const wanted = data.type === 'WANTED';
    const headerBlock =
      text(margin, 57, 'COLLECTION PROFILE', {
        size: Math.max(14, width * 0.015),
        fill: palette.primary,
        family: fontRoles.mono,
        weight: 700,
        letterSpacing: 3,
      }) +
      text(margin, 111, data.title, {
        size: Math.max(34, Math.min(51, width * 0.044)),
        fill: palette.text,
        weight: 800,
      }) +
      text(margin, 151, wanted ? 'WANTED ITEMS' : 'AVAILABLE ITEMS', {
        size: 14,
        fill: palette.primary,
        family: fontRoles.mono,
        weight: 700,
        letterSpacing: 2.4,
      }) +
      `<g transform="translate(${width - margin - 250} 46)"><rect width="250" height="92" fill="${palette.surface}" stroke="${palette.secondary}"/>${text(18, 25, 'STATUS', { size: 10, fill: palette.muted, family: fontRoles.mono, letterSpacing: 1.5 })}${text(18, 56, 'OPEN', { size: 20, fill: palette.primary, family: fontRoles.mono, weight: 800 })}${text(232, 25, 'ITEMS', { size: 10, fill: palette.muted, family: fontRoles.mono, anchor: 'end', letterSpacing: 1.5 })}${text(232, 58, String(data.items.length).padStart(2, '0'), { size: 25, fill: palette.text, family: fontRoles.mono, anchor: 'end', weight: 800 })}</g>`;
    const defs = `<pattern id="resume-grid" width="28" height="28" patternUnits="userSpaceOnUse"><path d="M28 0H0V28" fill="none" stroke="${palette.primary}" stroke-width=".5" opacity=".055"/></pattern>`;

    return posterSvg(
      width,
      height,
      palette.background,
      defs,
      `<rect width="100%" height="100%" fill="url(#resume-grid)"/><rect x="${margin / 2}" y="${margin / 2}" width="${width - margin}" height="${height - margin}" fill="${palette.surface}" opacity=".72"/>${headerBlock}<path d="M ${margin} ${header - 1} H ${width - margin}" stroke="${palette.primary}" stroke-width="3"/>${entries}${text(margin, height - 16, `GOODS ISLAND / ${wanted ? 'WANTED PROFILE' : 'SALE PROFILE'}`, { size: 10, fill: palette.muted, family: fontRoles.mono, letterSpacing: 1.5 })}`,
      { template: 'resume', palette: palette.id },
    );
  },
};
