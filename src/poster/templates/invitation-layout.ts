import { fontRoles } from '../fonts';
import type { PosterData, PosterPalette, PosterRenderOptions } from '../types';
import { image, posterSvg, text, wrapText, visualLength } from '../utils';
import { invitationArtwork } from './invitation-art';

const serif = "'Goods Island Serif', 'Goods Island Song', serif";
type Box = { x: number; y: number; w: number; h: number; horizontal?: boolean };

export function invitationPlacements(count: number, w: number, h: number): Box[] {
  const x = w * 0.16,
    top = h * 0.255,
    aw = w * 0.68,
    ah = h * 0.61;
  const gap = w * 0.04;
  if (count === 1)
    return [
      { x: w >= h ? x : w * 0.23, y: top, w: w >= h ? aw : w * 0.54, h: ah, horizontal: w >= h },
    ];
  if (count === 2)
    return [0, 1].map((i) => ({ x: x + (i * (aw + gap)) / 2, y: top, w: (aw - gap) / 2, h: ah }));
  if (count === 3 && w >= h)
    return [
      { x: x + aw * 0.285, y: top, w: aw * 0.43, h: ah },
      { x, y: top + ah * 0.2, w: aw * 0.245, h: ah * 0.72 },
      { x: x + aw * 0.755, y: top + ah * 0.2, w: aw * 0.245, h: ah * 0.72 },
    ];
  if (count === 3)
    return [
      { x: x + aw * 0.2, y: top, w: aw * 0.6, h: ah * 0.5 },
      { x, y: top + ah * 0.54, w: aw * 0.47, h: ah * 0.46 },
      { x: x + aw * 0.53, y: top + ah * 0.54, w: aw * 0.47, h: ah * 0.46 },
    ];
  const rows = Math.ceil(count / 2);
  const rowGap = ah * 0.035;
  return Array.from({ length: count }, (_, i) => ({
    x: x + ((i % 2) * (aw + gap)) / 2,
    y: top + (Math.floor(i / 2) * (ah + rowGap)) / rows,
    w: (aw - gap) / 2,
    h: (ah - (rows - 1) * rowGap) / rows,
    horizontal: count >= 5 || w > h * 1.15,
  }));
}

function arch(x: number, y: number, w: number, h: number) {
  const crown = Math.min(h * 0.32, w * 0.45),
    cut = Math.min(20, w * 0.05);
  return (
    'M' +
    x +
    ' ' +
    (y + h - cut) +
    'V' +
    (y + crown) +
    'C' +
    x +
    ' ' +
    (y - crown * 0.33) +
    ' ' +
    (x + w) +
    ' ' +
    (y - crown * 0.33) +
    ' ' +
    (x + w) +
    ' ' +
    (y + crown) +
    'V' +
    (y + h - cut) +
    'Q' +
    (x + w - cut * 0.25) +
    ' ' +
    (y + h - cut * 0.25) +
    ' ' +
    (x + w - cut) +
    ' ' +
    (y + h) +
    'H' +
    (x + cut) +
    'Q' +
    (x + cut * 0.25) +
    ' ' +
    (y + h - cut * 0.25) +
    ' ' +
    x +
    ' ' +
    (y + h - cut) +
    'Z'
  );
}
function ornament(x: number, y: number, size: number, color: string) {
  return (
    '<g transform="translate(' +
    x +
    ' ' +
    y +
    ') scale(' +
    size +
    ')" fill="none" stroke="' +
    color +
    '" stroke-width="1.5"><path d="M-60 0Q-33 12-20-3Q-10-13 0 0Q10-13 20-3Q33 12 60 0M0 0C-23-16-22-35-10-24Q-15-9 0 0C23-16 22-35 10-24Q15-9 0 0M0 0V-30M0 0Q-8 15 0 18Q8 15 0 0"/><path d="M0-36Q-7-28 0-21Q7-28 0-36Z" fill="' +
    color +
    '"/></g>'
  );
}

export function renderInvitation(
  data: PosterData,
  options: PosterRenderOptions,
  p: PosterPalette,
  width: number,
  height: number,
) {
  const wanted = data.type === 'WANTED';
  const unit = Math.min(width, height) / 1080;
  const boxes = invitationPlacements(data.items.length, width, height);
  const t = (
    x: number,
    y: number,
    value: string,
    size: number,
    fill = p.text,
    anchor: 'start' | 'middle' | 'end' = 'middle',
  ) => text(x, y, value, { size, fill, anchor, family: serif });
  let body =
    '<rect x="28" y="28" width="' +
    (width - 56) +
    '" height="' +
    (height - 56) +
    '" fill="none" stroke="' +
    p.primary +
    '"/><rect x="39" y="39" width="' +
    (width - 78) +
    '" height="' +
    (height - 78) +
    '" fill="none" stroke="' +
    p.secondary +
    '"/>';
  const titleSize = Math.min(76 * unit, (width * 0.61) / Math.max(1, visualLength(data.title)));
  body += t(
    width / 2,
    height * 0.075,
    wanted ? 'COLLECTION INVITATION' : 'GOODS FOR ADOPTION',
    15 * unit,
    p.primary,
  );
  body += text(width / 2, height * 0.153, data.title, {
    size: titleSize,
    fill: p.text,
    family: serif,
    weight: 700,
    anchor: 'middle',
  });
  body += t(
    width / 2,
    height * 0.194,
    wanted ? '诚邀这些谷子，来到我的收藏柜' : '为这些喜欢，寻找下一位收藏家',
    20 * unit,
    p.muted,
  );
  body +=
    '<g transform="translate(' +
    width / 2 +
    ' ' +
    height * 0.225 +
    ') scale(' +
    unit +
    ')" fill="' +
    p.price +
    '" opacity=".6"><path d="M-4 0C-48-40-62-7-35 2Q-19 6-4 0M4 0C48-40 62-7 35 2Q19 6 4 0M-4 0-32 35-16 29-11 38 5 0M4 0 32 35 16 29 11 38-5 0"/><ellipse rx="8" ry="5"/></g>';
  data.items.forEach((item, i) => {
    const b = boxes[i],
      horizontal = !!b.horizontal;
    const small = b.h < height * 0.28;
    const padding = Math.min(20 * unit, b.w * 0.05, b.h * 0.05);
    const noteReserve =
      options.showNote && item.note && !small && data.items.length >= 3 ? 38 * unit : 0;
    const infoH =
      Math.min(b.h * (!horizontal && data.items.length >= 3 ? 0.47 : 0.37), 205 * unit) +
      noteReserve;
    const hero = data.items.length === 1 && horizontal;
    const iw = horizontal ? b.w * (hero ? 0.6 : 0.38) : b.w - padding * 2;
    const ih = horizontal ? b.h - padding * 2 : b.h - infoH - padding * 2;
    const ix = b.x + padding,
      iy = b.y + padding;
    const tx = horizontal ? ix + iw + padding : b.x + padding;
    const tw = horizontal ? b.w - iw - padding * 3 : b.w - padding * 2;
    const ty = horizontal ? b.y + b.h * (hero ? 0.36 : 0.16) : iy + ih + padding;
    const title = Math.min(horizontal ? 25 : 28, tw / (horizontal ? 9 : 13)) * unit;
    const size = Math.max(9, Math.min(title, b.h * 0.1));
    const line = size * 1.6;
    const lines = wrapText(item.name, tw / size, 2);
    body += '<g data-layout="invitation-entry" data-item-index="' + i + '">';
    if (horizontal) {
      body +=
        '<path d="M' +
        b.x +
        ' ' +
        (b.y + b.h) +
        'H' +
        (b.x + b.w) +
        '" stroke="' +
        p.secondary +
        '"/>';
      body +=
        '<path d="' +
        arch(ix - 4, iy - 4, iw + 8, ih + 8) +
        '" fill="' +
        p.surface +
        '" stroke="' +
        p.secondary +
        '"/>';
    } else {
      body +=
        '<path d="' +
        arch(b.x, b.y, b.w, b.h) +
        '" fill="' +
        p.surface +
        '" fill-opacity=".65" stroke="' +
        p.primary +
        '"/><path d="' +
        arch(b.x + 7 * unit, b.y + 7 * unit, b.w - 14 * unit, b.h - 14 * unit) +
        '" fill="none" stroke="' +
        p.secondary +
        '"/>';
      body += ornament(b.x + b.w / 2, b.y - 5 * unit, Math.min(0.75 * unit, b.w / 550), p.primary);
      body += ornament(
        b.x + b.w / 2,
        b.y + b.h + 10 * unit,
        Math.min(0.48 * unit, b.w / 800),
        p.primary,
      );
    }
    const clipId = 'invitation-image-' + i;
    body += '<clipPath id="' + clipId + '"><path d="' + arch(ix, iy, iw, ih) + '"/></clipPath>';
    body += image(item, ix, iy, iw, ih, p.background, { clipId });
    // Compact entries use one explicit value row instead of stacking tiny field labels.
    // Reserve two name lines even for short names so all values share the same baseline.
    if (horizontal && b.h < 150 * unit) {
      const nameSize = Math.min(18 * unit, b.h * 0.17, tw / 11);
      const nameTop = b.y + padding + nameSize;
      const nameLine = nameSize * 1.6;
      wrapText(item.name, tw / nameSize, 2).forEach((value, j) => {
        body += t(tx, nameTop + j * nameLine, value, nameSize, p.text, 'start');
      });
      const valueY = b.y + b.h - padding - 5 * unit;
      const quantity = '×' + item.quantity;
      const valueSize = Math.min(24 * unit, b.h * 0.23);
      body += '<g data-field="quantity">';
      body += t(
        tx,
        valueY,
        quantity,
        Math.min(valueSize, (tw * 0.3) / visualLength(quantity)),
        p.text,
        'start',
      );
      body += '</g>';
      if (options.priceStyle !== 'PRICE_HIDDEN') {
        const value = item.price
          ? (wanted ? '心理价 ¥' : '¥') + item.price
          : wanted
            ? '欢迎带价'
            : '欢迎询价';
        body += '<g data-field="price">';
        body += t(
          tx + tw,
          valueY,
          value,
          Math.min(valueSize, (tw * 0.64) / visualLength(value)),
          p.price,
          'end',
        );
        body += '</g>';
      }
      body += '</g>';
      return;
    }
    lines.forEach((value, j) => {
      body += t(tx + tw / 2, ty + size + j * line, value, size);
    });
    const ruleY = ty + size + (lines.length - 1) * line + Math.max(8, size * 0.6);
    body += '<path d="M' + tx + ' ' + ruleY + 'H' + (tx + tw) + '" stroke="' + p.secondary + '"/>';
    const labelSize = Math.max(7, Math.min(11 * unit, tw * 0.035));
    const priceY = ruleY + labelSize + 6 * unit + Math.min(42 * unit, b.h * 0.15) + 8 * unit;
    body += t(tx + tw * 0.23, ruleY + labelSize + 6 * unit, 'QUANTITY', labelSize, p.muted);
    body += t(
      tx + tw * 0.23,
      priceY,
      String(item.quantity).padStart(2, '0'),
      Math.min(
        30 * unit,
        b.h * 0.11,
        (tw * 0.43) / visualLength(String(item.quantity).padStart(2, '0')),
      ),
    );
    if (options.priceStyle !== 'PRICE_HIDDEN') {
      body += t(
        tx + tw * 0.73,
        ruleY + labelSize + 6 * unit,
        wanted ? '心理价 / BUDGET' : 'PRICE / 单价',
        labelSize,
        p.muted,
      );
      const value = item.price ? '¥' + item.price : wanted ? '欢迎带价' : '欢迎询价';
      const priceFont = Math.min(
        (options.priceStyle === 'PRICE_NORMAL' ? 29 : 42) * unit,
        b.h * 0.15,
        (tw * 0.45) / Math.max(1, visualLength(value)),
      );
      body += t(tx + tw * 0.73, priceY, value, priceFont, p.price);
    }
    if (options.showNote && item.note && !small) {
      const noteY = Math.min(b.y + b.h - padding, priceY + 29 * unit);
      body += t(
        tx + tw / 2,
        noteY,
        wrapText(item.note, tw / (13 * unit), 1)[0],
        13 * unit,
        p.muted,
      );
    }
    body += '</g>';
  });
  // Side ornaments occupy the reserved 16% margins and do not cover product copy.
  body += invitationArtwork(width, height, p);
  body += text(width * 0.86, height * 0.16, 'Good things', {
    size: 25 * unit,
    fill: p.muted,
    family: fontRoles.latinHandwriting,
    anchor: 'middle',
  });
  body += text(width * 0.86, height * 0.19, 'find a new home', {
    size: 21 * unit,
    fill: p.muted,
    family: fontRoles.latinHandwriting,
    anchor: 'middle',
  });
  body += t(width / 2, height * 0.947, 'GOOD GOODS · SAME LOVE · A NEW STORY', 11 * unit, p.muted);
  return posterSvg(width, height, p.background, '', body, {
    template: 'invitation',
    palette: p.id,
  });
}
