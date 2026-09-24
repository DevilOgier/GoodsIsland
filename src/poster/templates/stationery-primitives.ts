import { text, wrapText, visualLength } from '../utils';
import { fontRoles } from '../fonts';
import type { PosterData, PosterRenderOptions, PosterPalette } from '../types';
export const song = "'Goods Island Serif', 'Goods Island Song', serif";
export const ink = '#46473a',
  green = '#7d8c70',
  muted = '#918976',
  pink = '#b47e78',
  paper = '#fffbed';
export const t = (
  x: number,
  y: number,
  v: string,
  size = 20,
  color = ink,
  family: string = fontRoles.sans,
  anchor: 'start' | 'middle' | 'end' = 'start',
  weight = 400,
) => text(x, y, v, { size, fill: color, family, anchor, weight });
export const rect = (
  x: number,
  y: number,
  w: number,
  h: number,
  fill: string,
  stroke = 'none',
  rx = 0,
) =>
  '<rect x="' +
  x +
  '" y="' +
  y +
  '" width="' +
  w +
  '" height="' +
  h +
  '" rx="' +
  rx +
  '" fill="' +
  fill +
  '" stroke="' +
  stroke +
  '"/>';
export const rule = (x: number, y: number, w: number, color = '#d6cdbb') =>
  '<path d="M' + x + ' ' + y + 'h' + w + '" stroke="' + color + '" fill="none"/>';
export function leaves(x: number, y: number, s = 1, color = green) {
  let b =
    '<g transform="translate(' +
    x +
    ' ' +
    y +
    ') scale(' +
    s +
    ')" fill="' +
    color +
    '" stroke="' +
    color +
    '"><path d="M0 0Q-6-60 8-120" fill="none" stroke-width="2"/>';
  for (let i = 0; i < 5; i++) {
    const yy = -12 - i * 21;
    b +=
      '<path d="M1 ' +
      yy +
      'Q-35 ' +
      (yy - 22) +
      ' -23 ' +
      (yy - 35) +
      'Q-2 ' +
      (yy - 32) +
      ' 1 ' +
      yy +
      'M2 ' +
      (yy - 9) +
      'Q30 ' +
      (yy - 29) +
      ' 26 ' +
      (yy - 43) +
      'Q7 ' +
      (yy - 39) +
      ' 2 ' +
      (yy - 9) +
      '" opacity="' +
      (0.55 + i * 0.075) +
      '"/>';
  }
  return b + '</g>';
}
export function daisy(x: number, y: number, s = 1) {
  let b = '<g transform="translate(' + x + ' ' + y + ') scale(' + s + ')">';
  for (let i = 0; i < 9; i++)
    b +=
      '<ellipse cy="-18" rx="8" ry="16" fill="#fffdf1" stroke="#ded7bb" stroke-width=".8" transform="rotate(' +
      i * 40 +
      ')"/>';
  return b + '<circle r="9" fill="#d8b96a"/><circle r="4" fill="#c5a454"/></g>';
}
export function bow(x: number, y: number, s = 1, color = green) {
  return (
    '<g transform="translate(' +
    x +
    ' ' +
    y +
    ') scale(' +
    s +
    ')" fill="none" stroke="' +
    color +
    '" stroke-width="3"><path d="M0 0C-45-40-56-6-17 0L0 0C45-40 56-6 17 0L0 0M-3 0Q-5 24-22 40M3 0Q5 24 22 40"/><circle r="5" fill="' +
    color +
    '"/></g>'
  );
}
export function scallop(x: number, y: number, w: number, h: number) {
  // The scallop is a real die-cut outline, with a separate sewn inset.
  let p = 'M' + (x + 18) + ' ' + y;
  for (let xx = x + 18; xx < x + w - 18; xx += 18) p += 'q9 -5 18 0';
  p += 'Q' + (x + w + 6) + ' ' + y + ' ' + (x + w) + ' ' + (y + 18);
  for (let yy = y + 18; yy < y + h - 18; yy += 18) p += 'q5 9 0 18';
  p += 'Q' + (x + w) + ' ' + (y + h + 6) + ' ' + (x + w - 18) + ' ' + (y + h);
  for (let xx = x + w - 18; xx > x + 18; xx -= 18) p += 'q-9 5 -18 0';
  p += 'Q' + (x - 6) + ' ' + (y + h) + ' ' + x + ' ' + (y + h - 18);
  for (let yy = y + h - 18; yy > y + 18; yy -= 18) p += 'q-5 -9 0 -18';
  p += 'Q' + x + ' ' + (y - 6) + ' ' + (x + 18) + ' ' + y + 'Z';
  return (
    '<path d="' +
    p +
    '" fill="' +
    paper +
    '" stroke="#d8cdb5" stroke-width="1.4"/><rect x="' +
    (x + 12) +
    '" y="' +
    (y + 12) +
    '" width="' +
    (w - 24) +
    '" height="' +
    (h - 24) +
    '" rx="16" fill="none" stroke="#b5b894" stroke-dasharray="4 5"/>'
  );
}
export function name(
  x: number,
  y: number,
  v: string,
  w: number,
  sz: number,
  family: string = fontRoles.sans,
  center = false,
) {
  return wrapText(v, w / sz, 2)
    .map((line, i) => t(x, y + i * sz * 1.6, line, sz, ink, family, center ? 'middle' : 'start'))
    .join('');
}
export function twig(x: number, y: number, a: number, s = 1) {
  return (
    '<g transform="translate(' +
    x +
    ' ' +
    y +
    ') rotate(' +
    a +
    ') scale(' +
    s +
    ')"><path d="M0 0Q-37-43 0-95Q36-50 0 0Z" fill="url(#leaf-tone)" stroke="#7f8c65"/><path d="M0-4V-88M0-24-14-37M0-43-15-60M0-61-10-76M0-34 14-49M0-56 12-69" stroke="#c9cda9" fill="none" opacity=".65"/></g>'
  );
}
export function fit(value: string, width: number, size: number) {
  return Math.min(size, width / Math.max(1, visualLength(value)));
}
export function finishStationery(
  body: string,
  data: PosterData,
  options: PosterRenderOptions,
  p: PosterPalette,
  width: number,
  height: number,
  W: number,
  H: number,
  unit: number,
) {
  const base = data.template === 'gingham' ? 'sage' : 'paper';
  if (options.palette && options.palette !== base) {
    const colors: Record<string, string> = {
      '#9ebbbe': p.secondary,
      '#f0f1e5': p.background,
      '#f4f0e5': p.background,
      '#ddd7c8': p.secondary,
      '#fffbed': p.surface,
      '#faf7ee': p.surface,
      '#46473a': p.text,
      '#7d8c70': p.primary,
      '#918976': p.muted,
      '#99635d': p.price,
      '#795b4a': p.price,
    };
    body = body.replace(/(fill|stroke)="(#[a-fA-F0-9]+)"/g, (all, key, color) =>
      colors[color] ? key + '="' + colors[color] + '"' : all,
    );
  }
  return (
    '<svg xmlns="http://www.w3.org/2000/svg" width="' +
    width +
    '" height="' +
    height +
    '" viewBox="0 0 ' +
    W +
    ' ' +
    H +
    '" data-template="' +
    data.template +
    '" data-palette="' +
    p.id +
    '" data-layout-scale="' +
    unit +
    '">' +
    body +
    '</svg>'
  );
}
