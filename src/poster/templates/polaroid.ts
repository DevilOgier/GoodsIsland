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
  const p = palette;
  const daisy = (x: number, y: number, s: number, angle = 0) =>
    `<g transform="translate(${x} ${y}) rotate(${angle}) scale(${s})">${Array.from({ length: 8 }, (_, i) => `<ellipse cy="-12" rx="5.7" ry="11" fill="${p.surface}" stroke="#d9cbb2" stroke-width=".6" transform="rotate(${i * 45})"/>`).join('')}<circle r="6" fill="#c7aa73"/><circle cx="-1" cy="-1" r="3.5" fill="#e9d293"/></g>`;
  const sprig = (x: number, y: number, s: number, angle: number) =>
    `<g transform="translate(${x} ${y}) rotate(${angle}) scale(${s})" stroke="${p.primary}" stroke-width="2.3" stroke-linecap="round"><path d="M0 130Q8 50 45-25M12 78L-15 30M27 32L60 10" fill="none"/><g fill="${p.primary}" stroke-width="1"><path d="M9 90Q-28 85-24 57Q0 59 9 90Z"/><path d="M17 61Q47 67 57 38Q33 33 17 61Z"/><path d="M29 28Q1 20 8-6Q32 0 29 28Z"/><path d="M39 1Q61 4 68-20Q46-21 39 1Z"/></g><g stroke="${p.surface}" opacity=".35" stroke-width="1"><path d="M9 90L-20 61M17 61L52 42M29 28L12-2M39 1L63-17"/></g></g>`;
  const holes = Array.from(
    { length: 17 },
    (_, i) => `<circle cx="${250 + i * 33}" cy="1017" r="4.4" fill="${p.primary}" opacity=".24"/>`,
  ).join('');
  const ruled = Array.from({ length: 23 }, (_, i) => `<path d="M-15 ${35 + i * 31}H570"/>`).join(
    '',
  );
  return `<defs>
    <pattern id="lab-paper-grain" width="19" height="23" patternUnits="userSpaceOnUse"><path d="M0 4h8m4 11h7M3 21h6" stroke="#8d7963" stroke-width=".65" opacity=".17"/><circle cx="14" cy="6" r=".7" fill="#88755f" opacity=".15"/></pattern>
    <pattern id="lab-grid" width="38" height="38" patternUnits="userSpaceOnUse"><rect width="38" height="38" fill="#f0e7d1"/><rect width="19" height="38" fill="${p.primary}" opacity=".27"/><rect width="38" height="19" fill="${p.primary}" opacity=".27"/></pattern>
    <pattern id="lab-stitch" width="24" height="24" patternUnits="userSpaceOnUse"><path d="M0 0H24V24" fill="none" stroke="${p.primary}" stroke-width=".65" opacity=".17"/></pattern>
  </defs>
  <g data-background="paper-garden-v1" transform="scale(${width / 1080} ${height / 1080})">
  <rect width="1080" height="1080" fill="url(#lab-stitch)"/>
  <path d="M-20 74L47 62 99 78 145 65 202 72 249 53 316 66 359 52 402 69 465 56 526 80 555 265 537 382 557 509 539 640 557 774 534 876 551 985 494 1001 432 986 366 1009 303 989 248 1005 183 991 119 1014 64 1002-20 1017Z" fill="${p.primary}" opacity=".39"/>
  <path d="M-20 94L50 78 104 94 153 83 209 88 252 70 318 83 365 69 410 86 468 73 528 96" fill="none" stroke="${p.surface}" stroke-width="3" opacity=".7"/>
  <path d="M-20 923L99 941 196 917 299 938 397 920 495 940 583 921 677 944 755 931 848 952 942 928 1110 956V1100H-20Z" fill="${p.primary}" opacity=".32"/>
  <g transform="translate(63 160) rotate(-5)">
    <path d="M0 9L399 0 409 676 390 690 6 679Z" fill="url(#lab-grid)"/>
    <path d="M2 15L398 5M9 671L389 682" stroke="${p.surface}" stroke-width="2" opacity=".6"/>
  </g>
  <g transform="translate(633 166) rotate(4)">
    <path d="M0 0L63 4 115 0 176 6 235 1 290 7 355 0 410 4 465 0 554 8 550 801 487 810 422 802 357 815 288 805 221 813 161 803 93 816 20 807-7 787Z" fill="#f8f0e0"/>
    <g stroke="#94a58e" stroke-width="1" opacity=".32">${ruled}</g>
    <path d="M30 0V805" stroke="${p.secondary}" stroke-width="2" opacity=".5"/>
  </g>
  <path d="M874-20L1100-20V277L1061 269 1020 284 989 274 951 286 923 275 891 283Z" fill="${p.secondary}" opacity=".47"/>
  <path d="M803 950L863 934 924 946 981 928 1049 936 1100 923V1100H791Z" fill="${p.secondary}" opacity=".57"/>
  <path d="M243 1001H825V1035H243Z" fill="${p.surface}" opacity=".85"/>${holes}
  <path d="M240 1035Q254 1061 268 1035Q282 1061 296 1035Q310 1061 324 1035Q338 1061 352 1035Q366 1061 380 1035Q394 1061 408 1035Q422 1061 436 1035Q450 1061 464 1035Q478 1061 492 1035Q506 1061 520 1035Q534 1061 548 1035Q562 1061 576 1035Q590 1061 604 1035Q618 1061 632 1035Q646 1061 660 1035Q674 1061 688 1035Q702 1061 716 1035Q730 1061 744 1035Q758 1061 772 1035Q786 1061 800 1035Q814 1061 828 1035" fill="${p.surface}" opacity=".85"/>
  <g transform="translate(53 28) rotate(-10)">
    <path d="M0 5L121 0 128 111 6 117Z" fill="${p.surface}"/>
    <path d="M8 13L113 8 119 103 14 108Z" fill="none" stroke="#b7aa8c" stroke-dasharray="3 3"/>
    ${text(64, 40, 'LITTLE', { size: 13, fill: p.primary, family: fontRoles.handwriting, anchor: 'middle', letterSpacing: 2 })}
    ${text(64, 62, 'TREASURES', { size: 12, fill: p.primary, family: fontRoles.handwriting, anchor: 'middle', letterSpacing: 1 })}
    <path d="M54 84C40 75 48 63 55 73C66 63 73 77 54 84Z" fill="${p.secondary}"/>
    <rect x="35" y="-8" width="52" height="21" fill="${p.secondary}" opacity=".65"/>
  </g>
  <g transform="translate(925 74) rotate(9)">
    <path d="M0 0H93V135H0Z" fill="${p.surface}" stroke="#b7aa8c" stroke-dasharray="3 4"/>
    <rect x="8" y="8" width="77" height="119" fill="${p.secondary}" opacity=".19"/>
    ${text(46, 39, 'FOR YOU', { size: 12, fill: p.primary, family: fontRoles.handwriting, anchor: 'middle', letterSpacing: 1 })}
    <path d="M45 78C-2 26 4 113 45 78C90 25 91 113 45 78M45 78L33 112M45 78L62 112" fill="none" stroke="${p.primary}" stroke-width="2"/>
  </g>
  <path d="M390 1056C460 1011 572 1086 686 1034S845 1002 872 1028" fill="none" stroke="${p.primary}" stroke-width="16" opacity=".56"/>
  <path d="M390 1051C460 1006 572 1081 686 1029S845 997 872 1023" fill="none" stroke="${p.surface}" stroke-width="2" opacity=".5"/>
  ${sprig(27, 935, 1.15, -17)}${sprig(1018, 898, 1.1, 24)}
  ${sprig(11, 77, 0.8, 5)}${sprig(1035, 29, 0.85, 70)}
  ${daisy(30, 975, 1.2, -12)}${daisy(75, 1011, 0.85, 12)}${daisy(20, 1031, 0.7)}
  ${daisy(1009, 1012, 1.15, 8)}${daisy(1054, 985, 0.75)}${daisy(1050, 1045, 0.65)}
  ${daisy(1041, 33, 1.05)}${daisy(996, 16, 0.65, 18)}${daisy(13, 48, 0.75)}
  <rect width="1080" height="1080" fill="url(#lab-paper-grain)" pointer-events="none"/>
  </g>`;
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
