import { fontRoles } from '../fonts';
import type { PosterTemplate } from '../types';
import { image, posterSvg, priceLabel, priceSize, text, wrappedText } from '../utils';

export const invitationTemplate: PosterTemplate = {
  id: 'invitation',
  name: '婚礼请柬',
  description: '优雅邀请函 · 文字优先',
  recommendedItems: '2–6 件',
  typography: {
    display: fontRoles.serif,
    title: fontRoles.serif,
    body: fontRoles.sans,
    numeric: fontRoles.serif,
    handwriting: fontRoles.serif,
  },
  palettes: [
    {
      id: 'champagne',
      label: '香槟',
      background: '#f7f1e6',
      surface: '#fffaf1',
      primary: '#9b7b55',
      secondary: '#d8c3a8',
      text: '#40372d',
      muted: '#8c7d6e',
      price: '#8d5d45',
    },
    {
      id: 'blush',
      label: '雾粉',
      background: '#f5e9e9',
      surface: '#fffafa',
      primary: '#a87378',
      secondary: '#dfbec1',
      text: '#49383a',
      muted: '#8f7377',
      price: '#96525e',
    },
    {
      id: 'sage',
      label: '鼠尾草',
      background: '#edf0e8',
      surface: '#fffdf6',
      primary: '#728064',
      secondary: '#c4ceba',
      text: '#354031',
      muted: '#74806d',
      price: '#6c5847',
    },
    {
      id: 'mist-blue',
      label: '雾蓝',
      background: '#e9eff2',
      surface: '#fbfdfd',
      primary: '#617986',
      secondary: '#bacbd3',
      text: '#334148',
      muted: '#71838b',
      price: '#775f65',
    },
  ],
  defaultOptions: {
    palette: 'champagne',
    density: 'INFO_FIRST',
    priceStyle: 'PRICE_PROMINENT',
    showNote: true,
  },
  render(data, options, palette, width, height) {
    const margin = Math.round(width * 0.055);
    const header = Math.max(190, Math.round(height * 0.2));
    const footer = 62;
    const columns = width > height * 1.15 || data.items.length > 7 ? 2 : 1;
    const gap = 22;
    const rows = Math.ceil(data.items.length / columns);
    const contentWidth = width - margin * 2 - 54;
    const columnWidth = (contentWidth - gap * (columns - 1)) / columns;
    const rowHeight = (height - header - footer - gap * (rows - 1)) / rows;
    const portrait = Math.max(54, Math.min(104, rowHeight - 20, columnWidth * 0.2));
    let items = '';

    data.items.forEach((item, index) => {
      const column = index % columns;
      const row = Math.floor(index / columns);
      const x = margin + 27 + column * (columnWidth + gap);
      const y = header + row * (rowHeight + gap);
      const centerY = y + rowHeight / 2;
      const clipId = `invitation-portrait-${index}`;
      const infoX = x + portrait + 28;
      const infoWidth = columnWidth - portrait - 32;
      const titleSize = Math.max(17, Math.min(27, columnWidth / 20));
      const number = String(index + 1).padStart(2, '0');

      items += `<g data-layout="invitation-entry">`;
      items += text(x - 14, y + 18, number, {
        size: 13,
        fill: palette.primary,
        anchor: 'end',
        family: fontRoles.serif,
        style: 'italic',
      });
      items += `<clipPath id="${clipId}"><ellipse cx="${x + portrait / 2}" cy="${centerY}" rx="${portrait / 2}" ry="${portrait * 0.43}"/></clipPath>`;
      items += `<ellipse cx="${x + portrait / 2}" cy="${centerY}" rx="${portrait / 2 + 4}" ry="${portrait * 0.43 + 4}" fill="${palette.surface}" stroke="${palette.secondary}" stroke-width="2"/>`;
      items += image(
        item,
        x,
        centerY - portrait * 0.43,
        portrait,
        portrait * 0.86,
        palette.background,
        { clipId, fit: 'slice' },
      );
      items += wrappedText(
        infoX,
        y + Math.max(29, rowHeight * 0.28),
        item.name,
        Math.max(10, infoWidth / titleSize),
        titleSize + 7,
        2,
        { size: titleSize, fill: palette.text, family: fontRoles.serif, weight: 600 },
      );
      const detailsY = y + Math.min(rowHeight - 34, Math.max(78, rowHeight * 0.68));
      items += text(infoX, detailsY, `QUANTITY  ·  ${item.quantity}`, {
        size: Math.max(12, titleSize - 7),
        fill: palette.muted,
        letterSpacing: 1.2,
      });
      if (options.priceStyle !== 'PRICE_HIDDEN') {
        items += text(x + columnWidth, detailsY, priceLabel(data, item), {
          size: priceSize(options.priceStyle, titleSize, titleSize + 7),
          fill: palette.price,
          anchor: 'end',
          family: fontRoles.serif,
          weight: 700,
        });
      }
      if (options.showNote && item.note && rowHeight > 145) {
        items += text(
          infoX,
          Math.min(y + rowHeight - 13, detailsY + 28),
          item.note.length > 24 ? item.note.slice(0, 23) + '…' : item.note,
          { size: Math.max(12, titleSize - 8), fill: palette.muted, style: 'italic' },
        );
      }
      items += `<path d="M ${x} ${y + rowHeight - 1} H ${x + columnWidth}" stroke="${palette.secondary}" stroke-width="1"/>`;
      items += '</g>';
    });

    const wanted = data.type === 'WANTED';
    const titleEnglish = wanted ? 'COLLECTION INVITATION' : 'GOODS FOR ADOPTION';
    const subtitle = wanted ? '诚邀这些谷子，来到我的收藏柜' : '为这些喜欢，寻找下一位收藏家';
    const defs = `<filter id="invitation-paper"><feTurbulence type="fractalNoise" baseFrequency=".9" numOctaves="2" seed="4"/><feColorMatrix values="0 0 0 0 .6 0 0 0 0 .55 0 0 0 0 .48 0 0 0 .035 0"/></filter>`;
    const border = `<rect x="${margin}" y="${margin}" width="${width - margin * 2}" height="${height - margin * 2}" fill="none" stroke="${palette.primary}" stroke-width="2"/><rect x="${margin + 9}" y="${margin + 9}" width="${width - margin * 2 - 18}" height="${height - margin * 2 - 18}" fill="none" stroke="${palette.secondary}"/>`;
    const ornaments = `<path d="M ${margin + 18} ${margin + 74} q30 -40 60 -8 q-21 10 -19 36 q-12 -24 -43 -28 M ${width - margin - 18} ${height - margin - 74} q-30 40 -60 8 q21 -10 19 -36 q12 24 43 28" fill="none" stroke="${palette.primary}" stroke-width="2" opacity=".65"/>`;
    const heading =
      text(width / 2, margin + 47, titleEnglish, {
        size: Math.max(14, width * 0.015),
        fill: palette.primary,
        anchor: 'middle',
        family: fontRoles.serif,
        letterSpacing: 4,
        style: 'italic',
      }) +
      text(width / 2, margin + 102, data.title, {
        size: Math.max(34, Math.min(54, width * 0.047)),
        fill: palette.text,
        anchor: 'middle',
        family: fontRoles.serif,
        weight: 600,
      }) +
      text(width / 2, margin + 137, subtitle, {
        size: Math.max(13, width * 0.014),
        fill: palette.muted,
        anchor: 'middle',
        family: fontRoles.serif,
        letterSpacing: 2,
      });

    return posterSvg(
      width,
      height,
      palette.background,
      defs,
      `<rect width="100%" height="100%" filter="url(#invitation-paper)" opacity=".45"/>${border}${ornaments}${heading}${items}`,
      { template: 'invitation', palette: palette.id },
    );
  },
};
