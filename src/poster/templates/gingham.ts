import { fontRoles } from '../fonts';
import type { PosterTemplate } from '../types';
import {
  densityRatio,
  gridColumns,
  image,
  posterSvg,
  priceLabel,
  priceSize,
  text,
  wrappedText,
} from '../utils';

export const ginghamTemplate: PosterTemplate = {
  id: 'gingham',
  name: '田园格纹',
  description: '野餐桌布 · 标签卡',
  recommendedItems: '2–9 件',
  typography: {
    display: fontRoles.serif,
    title: fontRoles.sans,
    body: fontRoles.sans,
    numeric: fontRoles.sans,
    handwriting: fontRoles.handwriting,
  },
  palettes: [
    {
      id: 'sage',
      label: '鼠尾草',
      background: '#dfe9d8',
      surface: '#fffaf0',
      primary: '#69805a',
      secondary: '#a9bea0',
      text: '#35402f',
      muted: '#77816e',
      price: '#a55f62',
    },
    {
      id: 'pink',
      label: '草莓粉',
      background: '#f1dce2',
      surface: '#fffaf2',
      primary: '#ad7182',
      secondary: '#ddb0bd',
      text: '#49383d',
      muted: '#8d747b',
      price: '#a94f65',
    },
    {
      id: 'blue',
      label: '晴空蓝',
      background: '#dce9ed',
      surface: '#fffaf0',
      primary: '#5e7f8a',
      secondary: '#a8c6cf',
      text: '#304047',
      muted: '#708188',
      price: '#a35f58',
    },
    {
      id: 'yellow',
      label: '柠檬黄',
      background: '#f1e7bd',
      surface: '#fffaf1',
      primary: '#97833f',
      secondary: '#d8c979',
      text: '#453f2d',
      muted: '#847b5f',
      price: '#ad6452',
    },
  ],
  defaultOptions: {
    palette: 'sage',
    density: 'BALANCED',
    priceStyle: 'PRICE_PROMINENT',
    showNote: true,
  },
  render(data, options, palette, width, height) {
    const margin = Math.round(width * 0.048);
    const header = Math.max(150, Math.round(height * 0.155));
    const footer = 36;
    const gap = Math.max(16, Math.round(width * 0.018));
    const columns = gridColumns(data.items.length, width, height);
    const rows = Math.ceil(data.items.length / columns);
    const cardWidth = (width - margin * 2 - gap * (columns - 1)) / columns;
    const cardHeight = (height - header - footer - margin - gap * (rows - 1)) / rows;
    const imageHeight = Math.max(
      55,
      Math.min(cardHeight * densityRatio(options.density), cardHeight - 102),
    );
    const check = 44;
    const defs = `
      <pattern id="gingham-small" width="${check}" height="${check}" patternUnits="userSpaceOnUse">
        <rect width="${check}" height="${check}" fill="${palette.background}"/>
        <rect width="${check / 2}" height="${check}" fill="${palette.primary}" opacity=".11"/>
        <rect width="${check}" height="${check / 2}" fill="${palette.primary}" opacity=".11"/>
        <rect width="${check / 2}" height="${check / 2}" fill="${palette.primary}" opacity=".10"/>
      </pattern>
      <filter id="card-shadow"><feDropShadow dx="0" dy="5" stdDeviation="5" flood-color="#554a38" flood-opacity=".14"/></filter>
    `;
    let cards = '';

    data.items.forEach((item, index) => {
      const column = index % columns;
      const row = Math.floor(index / columns);
      const x = margin + column * (cardWidth + gap);
      const y = header + row * (cardHeight + gap);
      const padding = Math.max(10, Math.min(18, cardWidth * 0.05));
      const innerWidth = cardWidth - padding * 2;
      const titleSize = Math.max(15, Math.min(24, cardWidth / 13));
      const clipId = `gingham-image-${index}`;
      const priceY = Math.min(cardHeight - 23, imageHeight + padding + titleSize * 2.65);

      cards += `<g data-layout="gingham-card" transform="translate(${x} ${y})">`;
      cards += `<rect width="${cardWidth}" height="${cardHeight}" rx="14" fill="${palette.surface}" stroke="${palette.primary}" stroke-width="2" stroke-dasharray="6 5" filter="url(#card-shadow)"/>`;
      cards += `<clipPath id="${clipId}"><rect x="${padding}" y="${padding}" width="${innerWidth}" height="${imageHeight}" rx="9"/></clipPath>`;
      cards += image(item, padding, padding, innerWidth, imageHeight, palette.background, {
        clipId,
        fit: 'meet',
        radius: 9,
      });
      cards += wrappedText(
        padding,
        imageHeight + padding + titleSize + 7,
        item.name,
        Math.max(7, innerWidth / titleSize),
        titleSize + 4,
        2,
        { size: titleSize, fill: palette.text, weight: 700 },
      );
      if (options.priceStyle !== 'PRICE_HIDDEN') {
        const pSize = priceSize(options.priceStyle, titleSize, Math.max(23, titleSize + 7));
        const labelWidth = Math.max(96, innerWidth * 0.56);
        cards += `<path d="M ${padding} ${priceY - pSize} h ${labelWidth - 12} l 12 ${(pSize + 16) / 2} l-12 ${(pSize + 16) / 2} h-${labelWidth - 12} z" fill="${palette.secondary}" opacity=".56"/>`;
        cards += text(padding + 12, priceY + 4, priceLabel(data, item), {
          size: pSize,
          fill: palette.price,
          weight: 800,
        });
      }
      cards += text(cardWidth - padding, priceY + 2, `×${item.quantity}`, {
        size: Math.max(16, titleSize),
        fill: palette.primary,
        anchor: 'end',
        weight: 800,
      });
      if (options.showNote && item.note && cardHeight - priceY > 32) {
        cards += text(
          padding,
          cardHeight - 13,
          item.note.length > 21 ? item.note.slice(0, 20) + '…' : item.note,
          { size: Math.max(12, titleSize - 6), fill: palette.muted },
        );
      }
      cards += '</g>';
    });

    const wanted = data.type === 'WANTED';
    const heading =
      text(margin, Math.max(43, header * 0.38), wanted ? "TODAY'S WISHLIST" : 'PICNIC SALE', {
        size: Math.max(14, width * 0.015),
        fill: palette.primary,
        family: fontRoles.serif,
        weight: 700,
        letterSpacing: 3,
      }) +
      text(margin, Math.max(97, header * 0.72), data.title, {
        size: Math.max(33, Math.min(52, width * 0.045)),
        fill: palette.text,
        weight: 800,
      }) +
      `<g transform="translate(${width - margin - 74} ${header * 0.32})"><path d="M35 46 C13 23 20 2 36 22 C51 1 60 24 35 46Z" fill="${palette.secondary}"/><path d="M35 43 q-7 18 -21 27 M35 43 q7 18 21 27" fill="none" stroke="${palette.primary}" stroke-width="3"/></g>`;

    return posterSvg(
      width,
      height,
      palette.background,
      defs,
      `<rect width="100%" height="100%" fill="url(#gingham-small)"/><rect x="${margin / 2}" y="${margin / 2}" width="${width - margin}" height="${height - margin}" rx="24" fill="#fff" opacity=".26"/>${heading}${cards}${text(width - margin, height - 14, wanted ? '今日收物菜单' : '今日出物小铺', { size: 12, fill: palette.primary, anchor: 'end', letterSpacing: 2 })}`,
      { template: 'gingham', palette: palette.id },
    );
  },
};
