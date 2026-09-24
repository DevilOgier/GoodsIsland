import { image, wrapText, priceLabel } from '../utils';
import { fontRoles } from '../fonts';
import type { PosterItemData, PosterData, PosterRenderOptions, PosterPalette } from '../types';
import {
  ink,
  green,
  muted,
  pink,
  paper,
  t,
  rect,
  rule,
  leaves,
  daisy,
  bow,
  scallop,
  name,
  twig,
  fit,
  finishStationery,
} from './stationery-primitives';
const song = "'Goods Island Serif', 'Goods Island Chinese Hand', serif";
function ginghamCard(
  item: PosterItemData,
  i: number,
  x: number,
  y: number,
  w: number,
  h: number,
  data: PosterData,
  options: PosterRenderOptions,
) {
  const price = options.priceStyle === 'PRICE_HIDDEN' ? '' : priceLabel(data, item);
  const quantity = '×' + item.quantity;
  const horizontal = w / h > 1.65 || h < 260;
  let b =
    '<g data-layout="gingham-card">' +
    rect(x + 5, y + 8, w, h, '#b2ab93', 'none', 18) +
    scallop(x, y, w, h) +
    rect(x + 18, y + 18, w - 36, h - 36, 'url(#paper-grain)', 'none', 14);
  b +=
    rect(x + 20, y - 7, 44, 31, i % 2 ? '#a5bbc0' : '#9bab88', '#fffbed', 11) +
    t(x + 42, y + 16, String(i + 1).padStart(2, '0'), 18, '#fffbed', song, 'middle');
  if (horizontal) {
    const iw = Math.min(h - 46, w * 0.4);
    b += image(item, x + 25, y + 23, iw, h - 46, paper);
    const tx = x + iw + 48,
      tw = w - iw - 70;
    b += name(tx, y + 52, item.name, tw, Math.min(22, tw / 9), fontRoles.handwriting);
    b += rule(tx, y + h - 82, tw);
    b += rect(tx, y + h - 65, Math.min(160, tw * 0.65), 40, '#f1d8cb', 'none', 8);
    b += t(
      tx + 12,
      y + h - 35,
      price,
      fit(price, Math.min(160, tw * 0.65) - 20, options.priceStyle === 'PRICE_NORMAL' ? 25 : 30),
      pink,
      song,
    );
    b += t(x + w - 27, y + h - 36, quantity, fit(quantity, tw * 0.3, 22), green, song, 'end');
  } else {
    const sz = w < 300 ? 20 : 26;
    const reserveNote = h > 440 && options.showNote && !!item.note;
    const ih = Math.min(h * (h < 440 ? 0.4 : 0.54), h - (reserveNote ? 205 : 145) - sz * 1.9);
    b += image(item, x + 35, y + 26, w - 70, ih - 8, paper);
    b += leaves(x + w - 31, y + ih + 26, 0.34);
    if (h > 440)
      b +=
        '<path d="M' +
        (x + 34) +
        ' ' +
        (y + ih + 31) +
        'l' +
        (w - 68) +
        ' -3 -6 43 -' +
        (w - 80) +
        ' 3Z" fill="#e8dbc2" opacity=".72"/>';
    b += name(x + w / 2, y + ih + 58, item.name, w - 66, sz, fontRoles.handwriting, true);
    if (h > 440 && options.showNote)
      b += t(
        x + w / 2,
        y + h - 107,
        wrapText(item.note, (w - 72) / 19, 1)[0] || '',
        19,
        muted,
        fontRoles.handwriting,
        'middle',
      );
    if (h > 440) {
      b += bow(x + 30, y + h - 73, 0.4, '#a68a63');
      b += daisy(x + w - 36, y + ih - 26, 0.28);
      b +=
        '<g transform="rotate(-10 ' +
        (x + 43) +
        ' ' +
        (y + ih * 0.7) +
        ')">' +
        t(x + 27, y + ih * 0.7, 'Good', 17, muted, fontRoles.latinHandwriting) +
        t(x + 20, y + ih * 0.7 + 36, 'things', 17, muted, fontRoles.latinHandwriting) +
        '</g>';
    }
    const pw = Math.min(230, w * 0.61);
    b +=
      '<path d="M' +
      (x + 38) +
      ' ' +
      (y + h - 73) +
      'h' +
      (pw - 24) +
      'l14 12v28l-14 12H' +
      (x + 38) +
      'l-14-12v-28Z" fill="#e5c2b1" stroke="#c6a087"/>';
    b +=
      '<path d="M' +
      (x + 43) +
      ' ' +
      (y + h - 67) +
      'h' +
      (pw - 33) +
      'l10 9v22l-10 9H' +
      (x + 43) +
      'l-10-9v-22Z" fill="none" stroke="#fff4db" stroke-dasharray="5 4"/>';
    b += t(
      x + 26 + pw / 2,
      y + h - 34,
      price,
      fit(price, pw - 18, options.priceStyle === 'PRICE_NORMAL' ? 27 : h > 440 ? 39 : 32),
      '#99635d',
      song,
      'middle',
    );
    b += t(
      x + w - 28,
      y + h - 35,
      quantity,
      fit(quantity, w * 0.25, h > 440 ? 29 : 24),
      green,
      song,
      'end',
    );
  }
  return b + '</g>';
}
function flowers(x: number, y: number, s = 1) {
  return (
    '<g transform="translate(' +
    x +
    ' ' +
    y +
    ') scale(' +
    s +
    ')">' +
    twig(-8, 57, -38) +
    twig(16, 36, 42, 0.85) +
    twig(-30, -2, -70, 0.65) +
    daisy(-20, -6, 1) +
    daisy(32, 33, 0.78) +
    daisy(-48, 47, 0.72) +
    daisy(28, -45, 0.6) +
    '</g>'
  );
}
function picnicScene(W: number, H: number) {
  const dx = W - 1440,
    dy = H - 1080;
  let b =
    '<defs><pattern id="cloth" width="82" height="82" patternUnits="userSpaceOnUse" patternTransform="rotate(-1)"><rect width="82" height="82" fill="#f0f1e5"/><rect width="41" height="82" fill="#9ebbbe" opacity=".61"/><rect width="82" height="41" fill="#9ebbbe" opacity=".61"/><path d="M0 2H82M2 0V82M0 43H82M43 0V82" stroke="#fbfcf1" opacity=".8" stroke-width="3"/></pattern><pattern id="weave" width="7" height="7" patternUnits="userSpaceOnUse"><path d="M0 1H7M1 0V7" stroke="#fff" stroke-width=".7" opacity=".5"/><path d="M0 5H7M5 0V7" stroke="#54777a" stroke-width=".5" opacity=".24"/></pattern><pattern id="paper-grain" width="61" height="53" patternUnits="userSpaceOnUse"><path d="M5 4l3-1M28 18l2 3M40 39l4-2M12 44l2 1" stroke="#b4a984" opacity=".28" stroke-width=".8"/><circle cx="35" cy="9" r=".8" fill="#c5b794"/></pattern><pattern id="wicker" width="25" height="22" patternUnits="userSpaceOnUse" patternTransform="rotate(-26)"><rect width="25" height="22" fill="#a57c50"/><path d="M0 5H25M0 13H25" stroke="#d5b087" stroke-width="5"/><path d="M7 0V22" stroke="#775839" stroke-width="2" opacity=".6"/></pattern><linearGradient id="leaf-tone" x2="1" y2="1"><stop stop-color="#a9b98d"/><stop offset=".5" stop-color="#869569"/><stop offset="1" stop-color="#596e4e"/></linearGradient><radialGradient id="tea"><stop stop-color="#faf0bf"/><stop offset="1" stop-color="#d9bb74"/></radialGradient></defs>';
  b += rect(0, 0, W, H, 'url(#cloth)') + rect(0, 0, W, H, 'url(#weave)');
  b +=
    '<g transform="translate(' +
    dx +
    ' ' +
    dy +
    ')"><g transform="rotate(-19 1330 960)">' +
    rect(1160, 758, 355, 460, '#f1e6d2', '#cdbfa6');
  for (let i = 0; i < 9; i++) b += rect(1160 + i * 43, 758, 16, 460, '#d5bbaa');
  for (let i = 0; i < 11; i++)
    b +=
      '<path d="M1160 ' +
      (758 + i * 43) +
      'h355" stroke="#d5bbaa" stroke-width="15" opacity=".65"/>';
  b += rect(1180, 781, 315, 414, 'url(#weave)') + '</g></g>';
  b +=
    '<path d="M0 0H369Q383 90 298 163Q190 241 0 287Z" fill="url(#wicker)" stroke="#8c6845" stroke-width="4"/>';
  for (let k = 0; k < 4; k++)
    b +=
      '<path d="M-6 ' +
      (268 - k * 9) +
      'Q181 ' +
      (223 - k * 9) +
      ' 309 ' +
      (146 - k * 9) +
      'Q366 90 368 0" fill="none" stroke="' +
      (k % 2 ? '#aa8255' : '#dfba8e') +
      '" stroke-width="7"/>';
  b += flowers(110, 40, 1.48) + bow(217, 75, 1.1, '#87a5ab');
  b +=
    '<g transform="rotate(-13 194 189)">' +
    rect(116, 123, 145, 157, '#e9dec4', '#c6b89a') +
    rect(120, 127, 137, 149, 'url(#paper-grain)') +
    t(185, 164, '喜欢的', 22, ink, fontRoles.handwriting, 'middle') +
    t(185, 203, '东西', 22, ink, fontRoles.handwriting, 'middle') +
    t(185, 242, '总会相遇 ♡', 19, ink, fontRoles.handwriting, 'middle') +
    '</g>';
  b += '<g transform="translate(' + dx + ' 0)">';
  for (let i = 0; i < 42; i++) {
    const a = (i * Math.PI) / 21,
      x = 1440 + Math.cos(a) * 182,
      y = 64 + Math.sin(a) * 182;
    b +=
      '<ellipse cx="' +
      x +
      '" cy="' +
      y +
      '" rx="13" ry="22" transform="rotate(' +
      (i * 360) / 42 +
      ' ' +
      x +
      ' ' +
      y +
      ')" fill="none" stroke="#fffdf0" stroke-width="3"/>';
  }
  for (let i = 0; i < 4; i++)
    b +=
      '<circle cx="1440" cy="64" r="' +
      (167 - i * 7) +
      '" fill="none" stroke="#fffdf0" stroke-width="2" stroke-dasharray="4 4"/>';
  b +=
    '<circle cx="1440" cy="64" r="140" fill="url(#tea)" stroke="#fff7d3" stroke-width="8"/><circle cx="1406" cy="66" r="76" fill="#f8d866" stroke="#fff4ba" stroke-width="8"/>';
  for (let i = 0; i < 9; i++) {
    const a = (i * Math.PI * 2) / 9;
    b +=
      '<path d="M1406 66L' +
      (1406 + Math.cos(a) * 69) +
      ' ' +
      (66 + Math.sin(a) * 69) +
      '" stroke="#fff9d4" stroke-width="4"/>';
  }
  b += '<circle cx="1406" cy="66" r="9" fill="#fff8d1"/>' + twig(1440, 35, 35, 0.6);
  b +=
    '<g transform="rotate(11 1327 364)">' +
    rect(1244, 288, 168, 155, '#f9efdc', '#d8c8a9') +
    rect(1244, 288, 168, 155, 'url(#paper-grain)') +
    t(1328, 340, '收藏', 23, ink, fontRoles.handwriting, 'middle') +
    t(1328, 381, '让日常更甜', 22, ink, fontRoles.handwriting, 'middle') +
    t(1328, 415, '♡', 23, green, song, 'middle') +
    rect(1343, 270, 13, 45, '#b48d5f', '#8d6944', 2) +
    '</g>';
  b +=
    '<g transform="rotate(-9 1180 170)">' +
    t(1150, 136, 'Good', 29, '#6b898b', fontRoles.latinHandwriting) +
    t(1163, 171, 'Goods', 29, '#6b898b', fontRoles.latinHandwriting) +
    t(1134, 210, 'Better Days', 27, '#6b898b', fontRoles.latinHandwriting) +
    t(1190, 244, '♡', 26, '#6b898b', song) +
    '</g>';
  b += '</g><g transform="translate(0 ' + dy + ')">';
  b +=
    '<circle cx="-36" cy="988" r="211" fill="#fcf5e3" stroke="#d8d6c7" stroke-width="4"/><circle cx="-36" cy="988" r="193" fill="none" stroke="#748e9c" stroke-width="10"/><circle cx="-36" cy="988" r="175" fill="none" stroke="#748e9c" stroke-width="3"/><path d="M-40 843L110 881 154 1080H-40Z" fill="#f7edda" stroke="#e0d6bf"/>';
  for (let i = 0; i < 3; i++) {
    const cx = 5 - i * 30,
      cy = 970 + i * 65;
    b +=
      '<ellipse cx="' +
      cx +
      '" cy="' +
      cy +
      '" rx="76" ry="48" fill="#cda269" stroke="#b58a55" stroke-width="3" transform="rotate(22 ' +
      cx +
      ' ' +
      cy +
      ')"/>';
    for (let j = 0; j < 18; j++)
      b +=
        '<ellipse cx="' +
        (cx - 55 + (j % 6) * 20) +
        '" cy="' +
        (cy - 26 + Math.floor(j / 6) * 23) +
        '" rx="3" ry="2" fill="#96713e"/>';
  }
  b +=
    flowers(300, 1046, 1.06) +
    '</g>' +
    flowers(21, 475, 0.95) +
    '<g transform="translate(' +
    dx +
    ' ' +
    dy +
    ')">' +
    leaves(1378, 1100, 2.2, '#8c996f') +
    leaves(1448, 996, 2, '#8c996f');
  for (let i = 0; i < 9; i++)
    b += daisy(1368 + (i % 3) * 28, 960 - Math.floor(i / 3) * 49, 0.22 + (i % 3) * 0.08);
  b +=
    '<g transform="rotate(-19 1330 977)">' +
    t(1270, 957, 'Same', 25, muted, fontRoles.latinHandwriting) +
    t(1250, 987, 'Fandom Life', 24, muted, fontRoles.latinHandwriting) +
    t(1265, 1018, 'Sweeter Days', 24, muted, fontRoles.latinHandwriting) +
    '</g>';
  return b + '</g>';
}
export function renderGingham(
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
  let b = picnicScene(W, H) + '<g transform="translate(' + dx / 2 + ' 0)">';
  b +=
    '<g transform="rotate(-1.5 734 177)">' +
    scallop(382, 63, 699, 210) +
    bow(731, 58, 0.84, '#86a4a8');
  b += t(732, 158, data.title, fit(data.title, 600, 65), ink, fontRoles.handwriting, 'middle', 700);
  b += t(
    732,
    220,
    data.type === 'WANTED' ? '— 想把这些喜欢收进来 ♡ —' : '— 把喜欢轻轻摆上桌 ♡ —',
    27,
    green,
    fontRoles.handwriting,
    'middle',
  );
  b +=
    daisy(420, 170, 0.29) +
    leaves(423, 213, 0.36) +
    daisy(1048, 162, 0.29) +
    leaves(1048, 205, 0.36) +
    '</g>';
  b += '</g>';
  const n = items.length,
    slots: number[][] = [];
  if (n === 1) slots.push([375 + dx / 2, 332, 713, 608 + dy, -2]);
  else if (n === 2 && H / W > 1.2) {
    const ch = (H - 450) / 2;
    slots.push([W * 0.14, 335, W * 0.72, ch, -1.8], [W * 0.14, 365 + ch, W * 0.72, ch, 1.8]);
  } else if (n === 2)
    slots.push(
      [172, 345, 515 + dx / 2, 585 + dy, -3],
      [734 + dx / 2, 364, 515 + dx / 2, 585 + dy, 3],
    );
  else if (n === 3)
    slots.push(
      [173, 333, 502 + dx * 0.42, 622 + dy, -2.8],
      [722 + dx * 0.42, 348, 550 + dx * 0.58, 274 + dy / 2, 2.3],
      [717 + dx * 0.42, 665 + dy / 2, 550 + dx * 0.58, 274 + dy / 2, -1.8],
    );
  else {
    const cols = H / W > 1.2 ? 2 : n <= 4 ? 2 : n <= 6 ? 3 : 4,
      rows = Math.ceil(n / cols),
      gap = n <= 4 ? 48 : 27;
    const w = (1148 + dx - (cols - 1) * gap) / cols,
      h = (640 + dy - (rows - 1) * 38) / rows;
    for (let i = 0; i < n; i++)
      slots.push([
        146 + (i % cols) * (w + gap),
        322 + Math.floor(i / cols) * (h + 38) + (i % 2 ? 12 : -3),
        w,
        h,
        [-1.6, 1.7, 0.8, -1.2][i % 4],
      ]);
  }
  items.forEach((p, i) => {
    const [x, y, w, h, angle] = slots[i];
    b +=
      '<g transform="rotate(' +
      angle +
      ' ' +
      (x + w / 2) +
      ' ' +
      (y + h / 2) +
      ')">' +
      ginghamCard(p, i, x, y, w, h, data, options) +
      '</g>';
  });
  b +=
    '<g transform="translate(' +
    dx / 2 +
    ' ' +
    dy +
    ')">' +
    t(734, 1025, '•  收藏喜欢  ·  拼凑更好的日常  •', 20, green, fontRoles.handwriting, 'middle');
  b +=
    rule(510, 1051, 117, '#8a9c8a') +
    t(734, 1056, 'ANIME GOODS MARKETPLACE', 11, green, song, 'middle') +
    rule(842, 1051, 117, '#8a9c8a');
  return finishStationery(b + '</g>', data, options, palette, width, height, W, H, unit);
}
