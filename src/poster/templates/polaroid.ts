import { fontRoles } from '../fonts';
import type { PosterTemplate } from '../types';
import {
  densityRatio,
  image,
  posterSvg,
  priceLabel,
  priceSize,
  text,
  wrappedText,
  gridColumns,
} from '../utils';

export const polaroidTemplate: PosterTemplate = {
  id: 'polaroid',
  name: '奶油手账',
  description: '拍立得拼贴 · 奶油收藏感',
  recommendedItems: '1–8 件',
  typography: {
    display: fontRoles.handwriting,
    title: fontRoles.sans,
    body: fontRoles.sans,
    numeric: fontRoles.sans,
    handwriting: fontRoles.handwriting,
  },
  palettes: [
    {
      id: 'cream',
      label: '奶油',
      background: '#f8f1e7',
      surface: '#fffdf8',
      primary: '#6f805d',
      secondary: '#e8b7c7',
      text: '#3c4038',
      muted: '#867f75',
      price: '#a65875',
    },
    {
      id: 'sage',
      label: '鼠尾草',
      background: '#e9eee3',
      surface: '#fffef9',
      primary: '#5f7451',
      secondary: '#d9b4bf',
      text: '#35402f',
      muted: '#77806f',
      price: '#9b5670',
    },
    {
      id: 'blush',
      label: '淡粉',
      background: '#f5e7ec',
      surface: '#fffdfa',
      primary: '#758463',
      secondary: '#d99ab1',
      text: '#463a40',
      muted: '#8a747d',
      price: '#a94f72',
    },
  ],
  defaultOptions: {
    palette: 'cream',
    density: 'BALANCED',
    priceStyle: 'PRICE_PROMINENT',
    showNote: true,
  },
  render(data, options, palette, width, height) {
    const margin = Math.round(width * 0.045);
    const header = Math.max(132, Math.round(height * 0.13));
    const footer = 38;
    const gap = Math.max(14, Math.round(width * 0.018));
    const availableWidth = width - margin * 2;
    const availableHeight = height - header - footer - margin;
    const columns = gridColumns(data.items.length, width, height);
    const rows = Math.ceil(data.items.length / columns);
    const cardWidth = (availableWidth - gap * (columns - 1)) / columns;
    const cardHeight = (availableHeight - gap * (rows - 1)) / rows;
    const imageHeight = Math.max(
      58,
      Math.min(cardHeight * densityRatio(options.density), cardHeight - 104),
    );

    let cards = '';
    data.items.forEach((item, index) => {
      const column = index % columns;
      const row = Math.floor(index / columns);
      const x = margin + column * (cardWidth + gap);
      const y = header + row * (cardHeight + gap);
      const rotation = data.items.length <= 6 ? (index % 3) - 1 : 0;
      const padding = Math.max(10, Math.min(20, cardWidth * 0.055));
      const innerWidth = cardWidth - padding * 2;
      const titleSize = Math.max(15, Math.min(25, cardWidth / 12));
      const priceFont = priceSize(
        options.priceStyle,
        Math.max(17, titleSize),
        Math.max(22, Math.min(34, cardWidth / 8)),
      );
      const quantityWidth = Math.max(50, cardWidth * 0.18);
      const priceY = imageHeight + padding + titleSize * 2.6;
      const noteY = cardHeight - padding - 5;
      const clipId = `polaroid-image-${index}`;

      cards += `<g data-layout="polaroid-v3" transform="translate(${x} ${y}) rotate(${rotation} ${cardWidth / 2} ${cardHeight / 2})">`;
      cards += `<rect x="5" y="7" width="${cardWidth}" height="${cardHeight}" rx="8" fill="#554d43" opacity=".10"/>`;
      cards += `<rect width="${cardWidth}" height="${cardHeight}" rx="8" fill="${palette.surface}"/>`;
      cards += `<clipPath id="${clipId}"><rect x="${padding}" y="${padding}" width="${innerWidth}" height="${imageHeight}" rx="5"/></clipPath>`;
      cards += image(item, padding, padding, innerWidth, imageHeight, palette.background, {
        clipId,
        fit: 'meet',
        radius: 5,
      });
      cards += wrappedText(
        padding,
        imageHeight + padding + titleSize + 8,
        item.name,
        Math.max(7, innerWidth / titleSize),
        titleSize + 5,
        2,
        { size: titleSize, fill: palette.text, weight: 700 },
      );
      cards += `<rect x="${padding}" y="${priceY - priceFont + 3}" width="${Math.max(90, innerWidth - quantityWidth - 10)}" height="${priceFont + 16}" rx="${(priceFont + 16) / 2}" fill="${palette.secondary}" opacity=".45"/>`;
      if (options.priceStyle !== 'PRICE_HIDDEN') {
        cards += text(padding + 12, priceY + 2, priceLabel(data, item), {
          size: priceFont,
          fill: palette.price,
          weight: 800,
          family: fontRoles.sans,
        });
      }
      cards += `<rect x="${cardWidth - padding - quantityWidth}" y="${priceY - 24}" width="${quantityWidth}" height="35" rx="5" fill="${palette.primary}" opacity=".92"/>`;
      cards += text(cardWidth - padding - quantityWidth / 2, priceY, `×${item.quantity}`, {
        size: Math.max(16, titleSize - 1),
        fill: '#ffffff',
        weight: 700,
        anchor: 'middle',
      });
      if (options.showNote && item.note && noteY > priceY + 18) {
        cards += text(
          padding,
          noteY,
          item.note.length > 22 ? item.note.slice(0, 21) + '…' : item.note,
          {
            size: Math.max(12, titleSize - 6),
            fill: palette.muted,
          },
        );
      }
      cards += `<rect x="${cardWidth / 2 - 38}" y="-8" width="76" height="21" fill="${index % 2 ? palette.secondary : palette.primary}" opacity=".30" transform="rotate(${index % 2 ? -5 : 4} ${cardWidth / 2} 2)"/>`;
      cards += '</g>';
    });

    const typeLabel = data.type === 'WANTED' ? 'MY WANTED COLLECTION' : 'MY LITTLE GOODS SALE';
    const defs = `<pattern id="paper-dot" width="18" height="18" patternUnits="userSpaceOnUse"><circle cx="2" cy="2" r="1" fill="${palette.primary}" opacity=".06"/></pattern>`;
    const heading =
      text(margin, Math.max(40, header * 0.36), typeLabel, {
        size: Math.max(12, width * 0.012),
        fill: palette.primary,
        letterSpacing: 3,
        weight: 700,
      }) +
      text(margin, Math.max(92, header * 0.72), data.title, {
        size: Math.max(32, Math.min(50, width * 0.043)),
        fill: palette.text,
        weight: 800,
      }) +
      `<path d="M ${width - margin - 84} ${header * 0.35} q18 -24 36 0 q18 -24 36 0" fill="none" stroke="${palette.secondary}" stroke-width="5" stroke-linecap="round"/>`;

    return posterSvg(
      width,
      height,
      palette.background,
      defs,
      `<rect width="100%" height="100%" fill="url(#paper-dot)"/>${heading}${cards}${text(margin, height - 16, '把喜欢的，都收藏起来吧。', { size: 12, fill: palette.muted })}`,
      { template: 'polaroid', palette: palette.id },
    );
  },
};
