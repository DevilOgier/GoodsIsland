import { fontRoles } from '../fonts';
import type {
  PosterData,
  PosterDensity,
  PosterItemData,
  PosterPalette,
  PosterPriceStyle,
  PosterRenderOptions,
  PosterTemplate,
} from '../types';
import { image, measureTextWidth, posterSvg, priceLabel, text, wrapText } from '../utils';

type Placement = {
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  safeInsets?: { right?: number; bottom?: number };
};
const clamp = (min: number, value: number, max: number) => Math.max(min, Math.min(value, max));

function placements(count: number, width: number, height: number, top: number, bottom: number) {
  const margin = width * 0.055;
  const areaWidth = width - margin * 2;
  const areaHeight = height - top - bottom;
  const landscape = width / height > 1.24;
  const result: Placement[] = [];
  if (count === 1) {
    const cardWidth = landscape ? areaWidth * 0.5 : areaWidth * 0.76;
    result.push({
      x: margin + (areaWidth - cardWidth) / 2,
      y: top + areaHeight * 0.02,
      width: cardWidth,
      height: areaHeight * 0.94,
      rotation: -2.2,
    });
  } else if (count === 2) {
    const cardWidth = landscape ? areaWidth * 0.46 : areaWidth * 0.49;
    result.push(
      {
        x: margin + areaWidth * 0.02,
        y: top + areaHeight * 0.01,
        width: cardWidth,
        height: areaHeight * 0.9,
        rotation: -3.8,
        safeInsets: { right: cardWidth * 0.18 },
      },
      {
        x: margin + areaWidth * (landscape ? 0.51 : 0.48),
        y: top + areaHeight * 0.09,
        width: cardWidth,
        height: areaHeight * 0.87,
        rotation: 3.1,
      },
    );
  } else if (count === 3) {
    if (landscape) {
      result.push(
        {
          x: margin,
          y: top,
          width: areaWidth * 0.49,
          height: areaHeight * 0.94,
          rotation: -2.8,
          safeInsets: { right: areaWidth * 0.049 },
        },
        {
          x: margin + areaWidth * 0.52,
          y: top + areaHeight * 0.01,
          width: areaWidth * 0.43,
          height: areaHeight * 0.45,
          rotation: 2.4,
        },
        {
          x: margin + areaWidth * 0.5,
          y: top + areaHeight * 0.49,
          width: areaWidth * 0.45,
          height: areaHeight * 0.46,
          rotation: -1.6,
        },
      );
    } else {
      result.push(
        {
          x: margin + areaWidth * 0.12,
          y: top,
          width: areaWidth * 0.76,
          height: areaHeight * 0.49,
          rotation: -2.2,
          safeInsets: { bottom: areaHeight * 0.06 },
        },
        {
          x: margin,
          y: top + areaHeight * 0.51,
          width: areaWidth * 0.48,
          height: areaHeight * 0.46,
          rotation: 2.2,
          safeInsets: { right: areaWidth * 0.035 },
        },
        {
          x: margin + areaWidth * 0.5,
          y: top + areaHeight * 0.5,
          width: areaWidth * 0.48,
          height: areaHeight * 0.47,
          rotation: -1.5,
        },
      );
    }
  } else {
    const columns = landscape ? (count <= 4 ? 2 : count <= 6 ? 3 : 4) : count <= 6 ? 2 : 3;
    const rows = Math.ceil(count / columns);
    const gapX = areaWidth * 0.027;
    const gapY = areaHeight * 0.035;
    const cardWidth = (areaWidth - gapX * (columns - 1)) / columns;
    const cardHeight = (areaHeight - gapY * (rows - 1)) / rows;
    const rotations = [-2.4, 1.7, -1.1, 2.5, 1.1, -2, 1.5, -1.3, 2.1, -1.8, 1, -1];
    for (let index = 0; index < count; index++) {
      const row = Math.floor(index / columns);
      const column = index % columns;
      const countInRow = Math.min(columns, count - row * columns);
      const rowOffset =
        countInRow < columns ? ((columns - countInRow) * (cardWidth + gapX)) / 2 : 0;
      result.push({
        x: margin + rowOffset + column * (cardWidth + gapX),
        y: top + row * (cardHeight + gapY) + (column % 2 ? areaHeight * 0.01 : 0),
        width: cardWidth,
        height: cardHeight * 0.97,
        rotation: rotations[index],
      });
    }
  }
  return result;
}

function scrapbookDefs(palette: PosterPalette) {
  return `<pattern id="paper-fibres" width="24" height="24" patternUnits="userSpaceOnUse"><path d="M0 7H24M4 17H19" stroke="${palette.muted}" stroke-width=".7" opacity=".07"/><circle cx="3" cy="3" r=".8" fill="${palette.primary}" opacity=".08"/></pattern><pattern id="gingham" width="56" height="56" patternUnits="userSpaceOnUse"><rect width="28" height="56" fill="${palette.primary}" opacity=".1"/><rect width="56" height="28" fill="${palette.primary}" opacity=".1"/><rect width="28" height="28" fill="${palette.primary}" opacity=".08"/></pattern><filter id="paper-shadow" x="-20%" y="-20%" width="140%" height="150%"><feDropShadow dx="0" dy="8" stdDeviation="8" flood-color="#4f4538" flood-opacity=".2"/></filter>`;
}

function background(width: number, height: number, palette: PosterPalette) {
  return `<rect width="100%" height="100%" fill="url(#paper-fibres)"/><path d="M-35 ${height * 0.2} L${width * 0.43} ${height * 0.15} L${width * 0.47} ${height * 0.88} L-20 ${height * 0.92}Z" fill="${palette.primary}" opacity=".13"/><path d="M${width * 0.04} ${height * 0.3} L${width * 0.48} ${height * 0.27} L${width * 0.46} ${height * 0.72} L${width * 0.08} ${height * 0.76}Z" fill="url(#gingham)" transform="rotate(2 ${width * 0.25} ${height * 0.5})"/><path d="M${width * 0.62} ${height * 0.22}H${width * 1.02}V${height * 0.87}H${width * 0.57}Z" fill="${palette.surface}" opacity=".42"/><g stroke="${palette.primary}" opacity=".14">${Array.from({ length: 12 }, (_, index) => `<path d="M${width * 0.59} ${height * (0.31 + index * 0.045)}H${width}"/>`).join('')}</g>`;
}

function ornaments(width: number, height: number, palette: PosterPalette, count: number) {
  const scale = Math.min(width, height) / 1080;
  const flower = `<g transform="translate(${width * 0.9} ${height * 0.72}) rotate(9) scale(${scale})" fill="none" stroke="${palette.primary}" stroke-width="4" stroke-linecap="round" opacity=".78"><path d="M0 210C44 151 48 90 101 16M45 132C20 122 4 105-8 81M61 92c32-7 54-25 66-51M88 38C72 19 70 2 74-15"/><path d="M-8 81c20-8 37-3 48 15-20 6-37 1-48-15Zm69 11c22-8 43-2 56 16-23 7-42 1-56-16Z" fill="${palette.primary}" opacity=".25"/><g fill="${palette.surface}" stroke="${palette.secondary}"><circle cx="101" cy="16" r="14"/><circle cx="91" cy="5" r="10"/><circle cx="112" cy="1" r="10"/><circle cx="117" cy="21" r="10"/></g></g>`;
  const stamp = `<g transform="translate(${width * 0.075} ${height * 0.77}) rotate(-13)"><circle r="${62 * scale}" fill="${palette.surface}" opacity=".72" stroke="${palette.primary}" stroke-width="3"/><circle r="${52 * scale}" fill="none" stroke="${palette.primary}" stroke-width="1" stroke-dasharray="5 4"/>${text(0, -5 * scale, 'COLLECT', { size: 14 * scale, fill: palette.primary, family: fontRoles.handwriting, weight: 700, anchor: 'middle', letterSpacing: 2 })}${text(0, 17 * scale, 'WITH LOVE', { size: 10 * scale, fill: palette.primary, family: fontRoles.handwriting, anchor: 'middle', letterSpacing: 1.5 })}</g>`;
  const cherries = `<g transform="translate(${width * 0.87} ${height * 0.88}) rotate(8) scale(${scale})"><path d="M35 55C37 27 53 13 72 10M35 55C23 32 10 24-5 29" fill="none" stroke="${palette.primary}" stroke-width="4"/><circle cx="20" cy="78" r="21" fill="${palette.price}" opacity=".88"/><circle cx="57" cy="80" r="21" fill="${palette.secondary}"/><path d="M70 10c11-8 20-6 25 1-9 8-18 9-25-1Z" fill="${palette.primary}"/></g>`;
  return `${flower}${stamp}${count > 1 ? cherries : ''}`;
}

function titleBlock(data: PosterData, width: number, height: number, palette: PosterPalette) {
  const compact = height / width < 0.7;
  const titleSize = clamp(36, width * (compact ? 0.042 : 0.052), 78);
  const x = width * 0.5;
  const title = data.title || (data.type === 'WANTED' ? '收一些心动收藏' : '出一些心动收藏');
  const typeLabel =
    data.type === 'WANTED' ? 'LOOKING FOR LITTLE JOYS' : 'GOODS FOR A BRIGHTER TOMORROW';
  return `<g transform="rotate(-1 ${x} ${height * 0.08})"><path d="M${x - width * 0.27} ${height * 0.025} L${x + width * 0.27} ${height * 0.02} L${x + width * 0.29} ${height * 0.145} L${x - width * 0.29} ${height * 0.15}Z" fill="${palette.surface}" opacity=".92" filter="url(#paper-shadow)"/><rect x="${x - width * 0.035}" y="${height * 0.01}" width="${width * 0.07}" height="${height * 0.027}" fill="${palette.primary}" opacity=".24" transform="rotate(3 ${x} ${height * 0.02})"/>${text(x, height * 0.052, typeLabel, { size: clamp(10, width * 0.009, 16), fill: palette.primary, family: fontRoles.handwriting, weight: 700, anchor: 'middle', letterSpacing: 3 })}${text(x, height * 0.117, title, { size: titleSize, fill: palette.text, family: fontRoles.handwriting, weight: 700, anchor: 'middle' })}<path d="M${x - width * 0.17} ${height * 0.132} Q${x} ${height * 0.115} ${x + width * 0.18} ${height * 0.134}" fill="none" stroke="${palette.secondary}" stroke-width="6" stroke-linecap="round" opacity=".72"/></g>`;
}

function priceFont(style: PosterPriceStyle, cardWidth: number, cardHeight: number) {
  const base = Math.min(cardWidth / 8.2, cardHeight / 8.5);
  return clamp(17, style === 'PRICE_PROMINENT' ? base : base * 0.74, 52);
}
function imageRatio(density: PosterDensity, compact: boolean) {
  if (compact) return density === 'INFO_FIRST' ? 0.43 : density === 'IMAGE_FIRST' ? 0.58 : 0.51;
  return density === 'INFO_FIRST' ? 0.46 : density === 'IMAGE_FIRST' ? 0.65 : 0.57;
}

function renderCard(
  data: PosterData,
  options: PosterRenderOptions,
  palette: PosterPalette,
  item: PosterItemData,
  placement: Placement,
  index: number,
) {
  const { x, y, width, height, rotation } = placement;
  const padding = clamp(14, width * 0.06, 30);
  const compact = height < 310 || width < 300;
  const imageHeight = clamp(
    54,
    (height - padding * 2) * imageRatio(options.density, compact),
    height - (compact ? 92 : 140),
  );
  const innerWidth = width - padding * 2;
  const safeRight = clamp(0, placement.safeInsets?.right ?? 0, innerWidth * 0.3);
  const safeBottom = clamp(0, placement.safeInsets?.bottom ?? 0, height * 0.2);
  const safeInnerWidth = innerWidth - safeRight;
  const titleSize = clamp(compact ? 13 : 16, Math.min(width / 13, height / 17), 30);
  const titleLines = wrapText(item.name, Math.max(7, safeInnerWidth / titleSize), compact ? 1 : 2);
  const titleStart = padding + imageHeight + titleSize * 1.48;
  const hasNote = Boolean(options.showNote && item.note && !compact);
  const minimumTradeY = titleStart + titleLines.length * titleSize * 1.22 + titleSize * 1.2;
  const bottomAlignedTradeY = height - safeBottom - (hasNote ? padding + 31 : padding * 1.35);
  const tradeY = Math.min(height - padding, Math.max(minimumTradeY, bottomAlignedTradeY));
  const price = priceLabel(data, item);
  let amountSize = priceFont(options.priceStyle, width, height);
  const quantityText = `×${item.quantity}`;
  const quantitySize = clamp(14, titleSize * 0.92, 28);
  const quantityPadding = clamp(10, width * 0.035, 18);
  const quantityWidth = clamp(
    46,
    measureTextWidth(quantityText, quantitySize) + quantityPadding * 2,
    Math.min(124, safeInnerWidth * 0.38),
  );
  const quantityRight = padding + safeInnerWidth;
  const quantityLeft = quantityRight - quantityWidth;
  const priceRight = quantityLeft - clamp(10, width * 0.025, 18);
  const priceAvailable = Math.max(42, priceRight - padding);
  const measuredPrice = measureTextWidth(price, amountSize);
  if (measuredPrice > priceAvailable) {
    amountSize = Math.max(12, amountSize * (priceAvailable / measuredPrice));
  }
  const clipId = `polaroid-image-${index}`;
  const tape = index % 3 === 1 ? palette.secondary : palette.primary;
  const note = item.note.length > 20 ? `${item.note.slice(0, 19)}…` : item.note;
  let output = `<g data-layout="polaroid-v3" data-composition="scrapbook" data-item-count="${data.items.length}" transform="translate(${x} ${y}) rotate(${rotation} ${width / 2} ${height / 2})">`;
  output += `<path d="M-8 12 L${width - 12} -10 L${width + 7} ${height - 7} L10 ${height + 10}Z" fill="${index % 2 ? palette.primary : palette.secondary}" opacity=".16"/>`;
  output += `<rect x="3" y="7" width="${width}" height="${height}" rx="5" fill="#4d4338" opacity=".12" filter="url(#paper-shadow)"/><rect width="${width}" height="${height}" rx="5" fill="${palette.surface}"/>`;
  output += `<clipPath id="${clipId}"><rect x="${padding}" y="${padding}" width="${innerWidth}" height="${imageHeight}" rx="3"/></clipPath>`;
  output += image(item, padding, padding, innerWidth, imageHeight, palette.background, {
    clipId,
    fit: 'meet',
    radius: 3,
  });
  titleLines.forEach((line, lineIndex) => {
    output += text(padding, titleStart + lineIndex * titleSize * 1.2, line, {
      size: titleSize,
      fill: palette.text,
      family: fontRoles.handwriting,
      weight: 700,
    });
  });
  if (options.priceStyle !== 'PRICE_HIDDEN') {
    output += text(padding, tradeY, price, {
      size: amountSize,
      fill: palette.price,
      family: fontRoles.handwriting,
      weight: 800,
    });
    const underlineRight = Math.min(priceRight, padding + safeInnerWidth * 0.56);
    output += `<path d="M${padding} ${tradeY + 7} Q${(padding + underlineRight) / 2} ${tradeY + 1} ${underlineRight} ${tradeY + 7}" fill="none" stroke="${palette.secondary}" stroke-width="${clamp(3, amountSize * 0.13, 7)}" stroke-linecap="round" opacity=".75"/>`;
  }
  output += `<g data-quantity-label="${quantityText}" data-quantity-left="${quantityLeft}" data-quantity-right="${quantityRight}" data-quantity-width="${quantityWidth}" data-price-right="${priceRight}" data-safe-right="${safeRight}" data-card-width="${width}"><path d="M${quantityLeft - 5} ${tradeY - titleSize * 0.95} L${quantityRight + 3} ${tradeY - titleSize * 1.05} L${quantityRight - 2} ${tradeY + 8} L${quantityLeft} ${tradeY + 4}Z" fill="${palette.primary}" opacity=".82"/>`;
  output += text(quantityLeft + quantityWidth / 2, tradeY - titleSize * 0.08, quantityText, {
    size: quantitySize,
    fill: '#fffdf8',
    family: fontRoles.handwriting,
    weight: 700,
    anchor: 'middle',
  });
  output += '</g>';
  if (hasNote && height - tradeY > 35)
    output += text(padding, height - padding * 0.65, note, {
      size: clamp(11, titleSize * 0.58, 16),
      fill: palette.muted,
      family: fontRoles.handwriting,
    });
  output += `<rect x="${width / 2 - width * 0.11}" y="${-padding * 0.46}" width="${width * 0.22}" height="${clamp(18, padding * 1.15, 34)}" fill="${tape}" opacity=".34" transform="rotate(${index % 2 ? -5 : 4} ${width / 2} 0)"/>`;
  if (!compact)
    output += text(width - padding * 1.35, padding + imageHeight + 22, index % 2 ? '♡' : '✽', {
      size: clamp(18, titleSize, 30),
      fill: palette.secondary,
      family: fontRoles.handwriting,
      anchor: 'middle',
    });
  return output + '</g>';
}

export const polaroidTemplate: PosterTemplate = {
  id: 'polaroid',
  name: '奶油手账',
  description: '拍立得拼贴 · 奶油收藏感',
  recommendedItems: '1–8 件',
  typography: {
    display: fontRoles.handwriting,
    title: fontRoles.handwriting,
    body: fontRoles.sans,
    numeric: fontRoles.handwriting,
    handwriting: fontRoles.handwriting,
  },
  previewFonts: ['chineseHandwriting', 'sans'],
  exportFonts: ['chineseHandwriting', 'sans'],
  palettes: [
    {
      id: 'cream',
      label: '奶油',
      background: '#f2ebdf',
      surface: '#fffdf7',
      primary: '#66785d',
      secondary: '#dca4af',
      text: '#344137',
      muted: '#777267',
      price: '#b65d70',
    },
    {
      id: 'sage',
      label: '鼠尾草',
      background: '#e8eddf',
      surface: '#fffef8',
      primary: '#59704f',
      secondary: '#d7a8b3',
      text: '#30402e',
      muted: '#727b6d',
      price: '#9f5268',
    },
    {
      id: 'blush',
      label: '淡粉',
      background: '#f4e6e9',
      surface: '#fffdf8',
      primary: '#718064',
      secondary: '#d992a2',
      text: '#463a40',
      muted: '#837379',
      price: '#a84e69',
    },
  ],
  defaultOptions: {
    palette: 'cream',
    density: 'BALANCED',
    priceStyle: 'PRICE_PROMINENT',
    showNote: true,
  },
  render(data, options, palette, width, height) {
    const compactRatio = height / width < 0.7;
    const top = height * (compactRatio ? 0.18 : 0.19);
    const bottom = height * 0.055;
    const layout = placements(data.items.length, width, height, top, bottom);
    const cards = data.items
      .map((item, index) => renderCard(data, options, palette, item, layout[index], index))
      .join('');
    const footer = `${text(width * 0.055, height - 17, 'GOODSISLAND · POLAROID SCRAPBOOK', { size: clamp(9, width * 0.008, 13), fill: palette.muted, family: fontRoles.handwriting, letterSpacing: 1.8 })}${text(width * 0.945, height - 17, `VOL. ${String(data.items.length).padStart(3, '0')}`, { size: clamp(9, width * 0.008, 13), fill: palette.muted, family: fontRoles.handwriting, anchor: 'end', letterSpacing: 1.8 })}`;
    return posterSvg(
      width,
      height,
      palette.background,
      scrapbookDefs(palette),
      `${background(width, height, palette)}${titleBlock(data, width, height, palette)}${cards}${ornaments(width, height, palette, data.items.length)}${footer}`,
      { template: 'polaroid', palette: palette.id },
    );
  },
};
