import { image, wrapText, priceLabel } from '../utils';
import { fontRoles } from '../fonts';
import type { PosterItemData, PosterData, PosterRenderOptions, PosterPalette } from '../types';
import {
  song,
  ink,
  muted,
  t,
  rect,
  rule,
  leaves,
  name,
  twig,
  fit,
  finishStationery,
} from './stationery-primitives';
function stamp(x: number, y: number, r = 46) {
  return (
    '<g transform="rotate(-16 ' +
    x +
    ' ' +
    y +
    ')" opacity=".66"><circle cx="' +
    x +
    '" cy="' +
    y +
    '" r="' +
    r +
    '" fill="none" stroke="#8d7568" stroke-width="2"/><circle cx="' +
    x +
    '" cy="' +
    y +
    '" r="' +
    (r - 7) +
    '" fill="none" stroke="#8d7568" stroke-dasharray="2 4"/>' +
    t(x, y - 8, 'COLLECT', 12, '#8d7568', song, 'middle') +
    t(x, y + 13, 'WITH LOVE', 10, '#8d7568', song, 'middle') +
    '</g>'
  );
}
function dossierItem(
  p: PosterItemData,
  i: number,
  x: number,
  y: number,
  w: number,
  h: number,
  dense: boolean,
  data: PosterData,
  options: PosterRenderOptions,
) {
  const price = options.priceStyle === 'PRICE_HIDDEN' ? '' : priceLabel(data, p);
  let b = '<g data-layout="resume-entry">';
  if (dense) {
    b += rule(x, y, w) + t(x, y + 27, String(i + 1).padStart(3, '0'), 24, ink, song);
    const is = h - 20,
      ix = x + 62;
    b += rect(ix - 3, y + 9, is + 6, is + 2, '#e7e0d0');
    b += image(p, ix, y + 12, is, h - 24, '#f4f0e4');
    const tx = ix + is + 18,
      tw = w - (tx - x) - 8;
    b += name(tx, y + 29, p.name, tw, 18, song);
    b += t(
      tx,
      y + h - 17,
      '×' + p.quantity,
      fit('×' + p.quantity, tw * 0.3, 20),
      ink,
      fontRoles.mono,
    );
    b += t(x + w - 10, y + h - 17, price, fit(price, tw * 0.64, 24), '#795b4a', song, 'end');
  } else {
    b += rect(x + 5, y + 6, w, h, '#cfc8b6') + rect(x, y, w, h, '#faf7ee', '#bfb9a6');
    b += rect(x + 22, y + 4, 90, 18, '#d3d2bc');
    b += t(x + 20, y + 62, String(i + 1).padStart(2, '0'), 49, ink, song, 'start', 700);
    b +=
      t(x + w - 20, y + 31, 'GOODS / ARCHIVE', 10, muted, song, 'end') +
      t(
        x + w - 20,
        y + 52,
        'COLLECTION  ·  ' + String(i + 1).padStart(3, '0'),
        10,
        muted,
        song,
        'end',
      );
    b += rule(x + 20, y + 76, w - 40);
    const horizontal = h < 350 || w > h * 1.3;
    if (horizontal) {
      const size = h - 108;
      b +=
        rect(x + 21, y + 96, size + 4, size, '#e5dfcf') +
        image(p, x + 26, y + 100, size - 6, size - 8, '#f5f1e6');
      const tx = x + size + 46,
        tw = w - size - 69;
      b +=
        t(tx, y + (h < 260 ? 94 : 102), 'NAME / 品名', 10, muted, song) +
        name(
          tx,
          y + (h < 260 ? 122 : 132),
          p.name,
          tw,
          Math.min(24, tw / 10, h < 260 ? (h - 150) / 3 : 24),
          song,
        );
      if (options.showNote && p.note && h > 400) {
        b += t(tx, y + h * 0.5, 'NOTE / 备注', 10, muted, song);
        b += t(tx, y + h * 0.5 + 30, wrapText(p.note, tw / 18, 1)[0] || '', 18, muted, song);
      }
      b +=
        rule(tx, y + h - 64, tw) +
        t(
          tx,
          y + h - 20,
          'QTY.  ×' + p.quantity,
          fit('QTY.  ×' + p.quantity, tw * 0.5, 16),
          ink,
          fontRoles.mono,
        );
      b += t(
        x + w - 22,
        y + h - 17,
        price,
        fit(price, tw * 0.46, Math.min(29, h * 0.11)),
        '#795b4a',
        song,
        'end',
      );
    } else {
      const ih = Math.min(h * 0.47, h > 500 && options.showNote && p.note ? h - 357 : h);
      b +=
        rect(x + 26, y + 99, w - 52, ih, '#ece7d9') +
        image(p, x + 33, y + 105, w - 66, ih - 12, '#f5f1e6');
      b += t(x + 27, y + ih + 129, 'NAME / 品名', 10, muted, song);
      b += name(x + 27, y + ih + 160, p.name, w - 54, 24, song);
      if (h > 500 && options.showNote) {
        b += rule(x + 26, y + ih + 196, w - 52);
        b += t(x + 27, y + ih + 220, 'NOTE / 备注', 10, muted, song);
        b += t(x + 27, y + ih + 247, wrapText(p.note, (w - 54) / 18, 1)[0] || '', 18, muted, song);
      }
      b += rule(x + 26, y + h - 100, w - 52);
      b +=
        t(
          x + 27,
          y + h - 81,
          data.type === 'WANTED' ? 'BUDGET / 心理价' : 'PRICE / 单价',
          11,
          muted,
          song,
        ) +
        t(
          x + 27,
          y + h - 30,
          price,
          fit(price, w - 158, options.priceStyle === 'PRICE_NORMAL' ? 32 : 38),
          '#795b4a',
          song,
        );
      b += rect(x + w - 110, y + h - 91, 84, 70, 'none', '#d1c9b8');
      b +=
        t(x + w - 68, y + h - 73, 'QTY.', 11, muted, song, 'middle') +
        t(
          x + w - 68,
          y + h - 36,
          '×' + p.quantity,
          fit('×' + p.quantity, 74, 29),
          ink,
          song,
          'middle',
        );
    }
  }
  return b + '</g>';
}
export function renderDossier(
  data: PosterData,
  options: PosterRenderOptions,
  palette: PosterPalette,
  width: number,
  height: number,
) {
  const items = data.items,
    unit = Math.min(width / 1440, height / 1080),
    W = width / unit,
    H = height / unit,
    dx = W - 1440,
    dy = H - 1080;
  let b =
    '<g transform="scale(' +
    W / 1440 +
    ' ' +
    H / 1080 +
    ')">' +
    rect(0, 0, 1440, 1080, '#ddd7c8') +
    '<path d="M28 52L1392 26 1410 1054 45 1067Z" fill="#c6bdab"/><path d="M36 32L1407 44 1398 1040 27 1052Z" fill="#f4f0e5"/>';
  b += '<path d="M54 66H1380V1018H54Z" fill="none" stroke="#c4bdab"/>';

  b +=
    '<defs><pattern id="archive-fibre" width="61" height="47" patternUnits="userSpaceOnUse"><path d="M4 9l5-2M22 34l2 3M47 18l4-1" stroke="#a79c80" opacity=".24" stroke-width=".7"/><circle cx="14" cy="21" r=".8" fill="#c9bda3"/></pattern><linearGradient id="leaf-tone"><stop stop-color="#b0af91"/><stop offset="1" stop-color="#777f66"/></linearGradient></defs>';
  b += rect(39, 46, 1357, 986, 'url(#archive-fibre)');
  b +=
    '<path d="M23 49V1038M31 51V1032" stroke="#93866f" stroke-width="2" stroke-dasharray="6 7"/>';
  for (let y = 275; y < 940; y += 51)
    b +=
      '<circle cx="47" cy="' +
      y +
      '" r="5" fill="#cec3ad"/><path d="M14 ' +
      (y - 5) +
      'q28-17 37 5" fill="none" stroke="#7c7668" stroke-width="2"/>';
  b +=
    '<path d="M1264 44l130 105V44Z" fill="#d9d0bc" stroke="#beb399"/><path d="M1264 44l130 105-10-89Z" fill="#ebe4d4"/>';
  b +=
    '<g opacity=".25">' +
    twig(1390, 724, -19, 1.3) +
    twig(1380, 759, 9, 0.85) +
    twig(1369, 797, -31, 0.65) +
    '</g>';
  b +=
    '<g transform="rotate(-8 327 153)" opacity=".63">' +
    t(245, 139, 'Small things,', 22, muted, fontRoles.latinHandwriting) +
    t(269, 169, 'lasting memories.', 22, muted, fontRoles.latinHandwriting) +
    '</g>';
  b +=
    '<g transform="rotate(5 1085 160)" opacity=".65">' +
    t(997, 151, 'Filed with love', 24, muted, fontRoles.latinHandwriting) +
    rule(1008, 168, 155) +
    '</g>';
  b +=
    '<circle cx="51" cy="972" r="34" fill="#a08170" stroke="#775c4e" stroke-width="3"/><circle cx="51" cy="972" r="26" fill="none" stroke="#d0b49b"/><path d="M38 972q13-27 26 0q-13 27-26 0M51 959q-27 13 0 26q27-13 0-26" fill="none" stroke="#d0b49b"/>';
  b +=
    '<path d="M1395 255v70q0 18-13 18t-13-18v-69q0-13 8-13t8 13v65" fill="none" stroke="#8c8979" stroke-width="3"/>';
  // Delicate paper ruling stays behind the composition.
  for (let y = 82; y < 1010; y += 7)
    b += '<path d="M55 ' + y + 'H1380" stroke="#b4a98e" opacity=".035"/>';
  b += rect(103, 23, 80, 19, '#c8c6ae') + rect(1240, 28, 94, 20, '#c8c6ae');
  b += '</g><g transform="translate(' + dx / 2 + ' 0)">';
  b +=
    t(86, 86, 'ANIME GOODS', 12, muted, song) +
    t(86, 108, 'COLLECTION ARCHIVE', 11, muted, song) +
    t(86, 133, 'VOL. 001 / GOODSISLAND', 10, muted, song);
  b +=
    t(720, 116, data.title, fit(data.title, 610, 67), ink, song, 'middle', 700) +
    t(720, 152, 'Collector Dossier', 25, ink, song, 'middle');
  b += t(720, 180, '把喜欢整理成册  /  为心动留下记录', 13, muted, song, 'middle');
  b +=
    t(
      1347,
      86,
      data.type === 'WANTED' ? 'WANTED ITEMS' : 'PRIVATE COLLECTION',
      11,
      muted,
      song,
      'end',
    ) +
    t(
      1347,
      109,
      data.type === 'WANTED' ? 'COLLECTION WISHLIST' : 'OPEN FOR ADOPTION',
      11,
      muted,
      song,
      'end',
    ) +
    stamp(1304, 167, 41);
  b += rule(84, 210, 1272, '#8b8b73') + rule(84, 215, 1272);
  b += '</g>';
  const n = items.length,
    slots: number[][] = [];
  if (n === 1) slots.push([240 + dx / 2, 252, 960, 676 + dy]);
  else if (n === 2 && H / W > 1.2) {
    const cardHeight = (H - 470) / 2;
    slots.push(
      [W * 0.11, 252, W * 0.78, cardHeight],
      [W * 0.11, 287 + cardHeight, W * 0.78, cardHeight],
    );
  } else if (n === 2)
    slots.push([126, 252, 560 + dx / 2, 676 + dy], [754 + dx / 2, 252, 560 + dx / 2, 676 + dy]);
  else if (n === 3)
    slots.push(
      [126, 252, 574 + dx / 2, 676 + dy],
      [744 + dx / 2, 252, 570 + dx / 2, 318 + dy / 2],
      [744 + dx / 2, 610 + dy / 2, 570 + dx / 2, 318 + dy / 2],
    );
  else if (n <= 6) {
    const rows = Math.ceil(n / 2),
      h = (680 + dy - (rows - 1) * 27) / rows;
    for (let i = 0; i < n; i++)
      slots.push([
        126 + (i % 2) * (628 + dx / 2),
        252 + Math.floor(i / 2) * (h + 27),
        572 + dx / 2,
        h,
      ]);
  } else {
    const rows = Math.ceil(n / 2),
      h = (680 + dy) / rows;
    for (let i = 0; i < n; i++)
      slots.push([113 + (i % 2) * (637 + dx / 2), 257 + Math.floor(i / 2) * h, 586 + dx / 2, h]);
    b += rule(113, 944 + dy, 586 + dx / 2) + rule(750 + dx / 2, 944 + dy, 586 + dx / 2);
  }
  items.forEach((p, i) => {
    b += dossierItem(p, i, ...(slots[i] as [number, number, number, number]), n > 6, data, options);
  });
  // Archive margin annotations, pressed sprig, a registration barcode.
  b +=
    '<g transform="translate(0 ' +
    dy +
    ')">' +
    leaves(58, 887, 0.82, '#a6a48d') +
    leaves(1375 + dx, 922, 0.93, '#a6a48d');
  b +=
    '<g transform="rotate(-90 70 542)">' +
    t(70, 542, 'PERSONAL ARCHIVE / KEEP THE LITTLE THINGS', 10, muted, song, 'middle') +
    '</g>';
  b += rule(85, 972, 1270) + t(94, 1001, 'ARCHIVE / GOODS / LIFE', 11, muted, song);
  b += t(720, 1001, '让每一份喜欢，都有自己的位置。', 15, muted, song, 'middle');
  for (let i = 0; i < 36; i++) b += rect(1210 + i * 3.3, 987, i % 3 === 0 ? 2.3 : 1, 23, '#777766');
  b += t(1360, 1038, 'NO. ' + String(n).padStart(3, '0'), 11, muted, fontRoles.mono, 'end');
  return finishStationery(b + '</g>', data, options, palette, width, height, W, H, unit);
}
