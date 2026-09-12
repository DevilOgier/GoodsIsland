import { renderPoster as legacyRender } from './legacy-renderer';
export type PosterItemData = {
  productId: string;
  name: string;
  quantity: number;
  price: string;
  note: string;
  image?: string;
  previewAssetId?: string;
  exportAssetId?: string;
};
export type PosterData = {
  title: string;
  type: 'SALE' | 'WANTED';
  ratio: string;
  template: string;
  items: PosterItemData[];
  version?: number;
};
export const templates: Record<
  string,
  { background: string; accent: string; label: string; description: string }
> = {
  cute: {
    background: '#f6eaf0',
    accent: '#a76c89',
    label: '奶油手帐',
    description: '拍立得拼贴 · 纸胶带 · 手写标签',
  },
  simple: {
    background: '#eaf0e9',
    accent: '#657954',
    label: '清新画廊',
    description: '首图主视觉 · 其余商品分栏陈列',
  },
  retro: {
    background: '#f0e5d2',
    accent: '#98754a',
    label: '复古票根',
    description: '横向票券 · 齿孔虚线 · 编号存根',
  },
  minimal: {
    background: '#f5f5f3',
    accent: '#454b47',
    label: '极简留白',
    description: '图文目录 · 细线分隔 · 编号索引',
  },
};
export const ratios: Record<string, [number, number]> = {
  '1:1': [1, 1],
  '4:3': [4, 3],
  '3:4': [3, 4],
  '16:9': [16, 9],
  '9:16': [9, 16],
};
const escape = (s: string) =>
  s.replace(
    /[&<>"']/g,
    (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;' })[c]!,
  );
function wrap(s: string, width: number, font: number) {
  const limit = width / font;
  const result: string[] = [];
  let line = '',
    length = 0;
  for (const ch of s) {
    const delta = ch.charCodeAt(0) > 255 ? 1 : 0.6;
    if (length + delta > limit && line) {
      result.push(line);
      line = '';
      length = 0;
    }
    line += ch;
    length += delta;
  }
  if (line) result.push(line);
  return result;
}
const text = (x: number, y: number, value: string, size = 20, color = '#30352e', extra = '') =>
  '<text x="' +
  x +
  '" y="' +
  y +
  '" font-size="' +
  size +
  '" fill="' +
  color +
  '" ' +
  extra +
  '>' +
  escape(value) +
  '</text>';
function picture(item: PosterItemData, x: number, y: number, w: number, h: number, bg: string) {
  if (item.image && /^data:image\/(png|jpeg|webp);base64,/.test(item.image))
    return (
      '<image href="' +
      item.image +
      '" x="' +
      x +
      '" y="' +
      y +
      '" width="' +
      w +
      '" height="' +
      h +
      '" preserveAspectRatio="xMidYMid meet"/>'
    );
  return (
    '<rect x="' +
    x +
    '" y="' +
    y +
    '" width="' +
    w +
    '" height="' +
    h +
    '" fill="' +
    bg +
    '"/>' +
    text(x + w / 2, y + h / 2, '暂无商品图', 18, '#888', 'text-anchor="middle"')
  );
}
function info(
  item: PosterItemData,
  x: number,
  y: number,
  w: number,
  h: number,
  accent: string,
  font = 22,
) {
  const names = wrap(item.name, w, font),
    notes = wrap(item.note, w, 16);
  const needed = names.length * (font + 7) + notes.length * 22 + 62;
  if (needed > h) throw Error('商品名称或备注较长，当前模板放不下；请减少商品或改用竖版');
  let out = '';
  names.forEach((line, i) => {
    out += text(x, y + font + i * (font + 7), line, font);
  });
  let baseline = y + names.length * (font + 7) + 34;
  out += text(
    x,
    baseline,
    item.price ? '¥' + item.price : '价格可议',
    25,
    accent,
    'font-weight="bold"',
  );
  out += text(x + w, baseline, '× ' + item.quantity, 20, accent, 'text-anchor="end"');
  baseline += 25;
  notes.forEach((line, i) => {
    out += text(x, baseline + i * 22, line, 16, '#777');
  });
  return out;
}
export function renderPoster(data: PosterData) {
  if (data.version === 1) return legacyRender(data);
  const ratio = ratios[data.ratio],
    t = templates[data.template];
  if (!ratio || !t) throw Error('比例或模板无效');
  if (!data.items.length || data.items.length > 12) throw Error('请选择1至12件商品');
  for (const item of data.items) {
    if (!Number.isSafeInteger(item.quantity) || item.quantity < 1) throw Error('数量必须为正整数');
    if (item.price && !/^\d+(\.\d{1,2})?$/.test(item.price)) throw Error('价格格式不正确');
  }
  const W = 1200,
    H = Math.round((W * ratio[1]) / ratio[0]),
    x = 48,
    y = 174,
    w = W - 96,
    h = H - 222,
    gap = 24,
    n = data.items.length;
  let body = '';
  function card(
    item: PosterItemData,
    cx: number,
    cy: number,
    cw: number,
    ch: number,
    index: number,
    polaroid: boolean,
  ) {
    const font = cw > 500 ? 27 : 20;
    const reserved =
      wrap(item.name, cw - 36, font).length * (font + 7) +
      wrap(item.note, cw - 36, 16).length * 22 +
      80;
    const ih = ch - reserved - 32;
    if (ih < 65) throw Error('当前模板空间不足，请减少商品或选择竖版');
    body +=
      '<g data-layout="' +
      (polaroid ? 'polaroid' : 'gallery-card') +
      '" transform="translate(' +
      cx +
      ',' +
      cy +
      ')"><rect x="3" y="5" width="' +
      cw +
      '" height="' +
      ch +
      '" fill="#000" opacity=".04"/><rect width="' +
      cw +
      '" height="' +
      ch +
      '" fill="white" rx="' +
      (polaroid ? 3 : 0) +
      '"/>';
    body +=
      picture(item, 18, 18, cw - 36, ih, t.background) +
      info(item, 18, ih + 30, cw - 36, reserved, t.accent, font);
    if (polaroid)
      body +=
        '<rect x="' +
        (cw / 2 - 39) +
        '" y="-8" width="78" height="22" fill="' +
        t.accent +
        '" opacity=".23" transform="rotate(' +
        (index % 2 ? -5 : 5) +
        ' ' +
        cw / 2 +
        ' 3)"/>';
    body += '</g>';
  }
  if (data.template === 'cute') {
    const cols = Math.min(n, data.ratio === '16:9' ? 3 : data.ratio === '9:16' ? 2 : 3),
      rows = Math.ceil(n / cols),
      cw = (w - (cols - 1) * gap) / cols,
      ch = (h - (rows - 1) * gap) / rows;
    data.items.forEach((item, i) =>
      card(
        item,
        x + (i % cols) * (cw + gap),
        y + Math.floor(i / cols) * (ch + gap),
        cw,
        ch,
        i,
        true,
      ),
    );
  } else if (data.template === 'simple') {
    const heroH = n === 1 ? h : Math.min(h * 0.42, 420),
      hero = data.items[0],
      iw = w * 0.57;
    body +=
      '<g data-layout="gallery-hero">' +
      picture(hero, x, y, iw, heroH, t.background) +
      text(x + iw + 30, y + 26, '01 / FEATURED', 13, t.accent, 'letter-spacing="3"') +
      info(hero, x + iw + 30, y + 58, w - iw - 30, heroH - 58, t.accent, 27) +
      '</g>';
    if (n > 1) {
      const cols = Math.min(n - 1, data.ratio === '9:16' ? 2 : 3),
        rows = Math.ceil((n - 1) / cols),
        cw = (w - (cols - 1) * gap) / cols,
        ch = (h - heroH - gap - (rows - 1) * gap) / rows;
      data.items
        .slice(1)
        .forEach((item, i) =>
          card(
            item,
            x + (i % cols) * (cw + gap),
            y + heroH + gap + Math.floor(i / cols) * (ch + gap),
            cw,
            ch,
            i,
            false,
          ),
        );
    }
  } else {
    const ticket = data.template === 'retro',
      cols = n > 4 ? 2 : 1,
      rows = Math.ceil(n / cols),
      cw = (w - (cols - 1) * gap) / cols,
      ch = (h - (rows - 1) * gap) / rows;
    data.items.forEach((item, i) => {
      if (ch < 155) throw Error('当前目录容纳不下这些商品，请减少商品或选择竖版');
      const cx = x + (i % cols) * (cw + gap),
        cy = y + Math.floor(i / cols) * (ch + gap),
        pad = ticket ? 20 : 12,
        iw = cw * (ticket ? 0.42 : 0.32),
        stub = ticket ? 46 : 0;
      body +=
        '<g data-layout="' +
        (ticket ? 'ticket' : 'editorial-row') +
        '" transform="translate(' +
        cx +
        ',' +
        cy +
        ')">';
      if (ticket) {
        body +=
          '<rect width="' +
          cw +
          '" height="' +
          ch +
          '" fill="#fffbef"/><path d="M ' +
          (cw - stub) +
          ' 0 V ' +
          ch +
          '" stroke="' +
          t.accent +
          '" stroke-dasharray="5 7"/><circle cx="0" cy="' +
          ch / 2 +
          '" r="10" fill="' +
          t.background +
          '"/><circle cx="' +
          cw +
          '" cy="' +
          ch / 2 +
          '" r="10" fill="' +
          t.background +
          '"/>' +
          text(
            cw - 16,
            ch / 2,
            String(i + 1).padStart(2, '0'),
            18,
            t.accent,
            'text-anchor="middle"',
          );
      } else
        body +=
          '<path d="M 0 ' +
          (ch - 1) +
          ' H ' +
          cw +
          '" stroke="#c7cdc4"/>' +
          text(0, 20, String(i + 1).padStart(2, '0'), 13, t.accent);
      body +=
        picture(item, pad, pad, iw - pad * 2, ch - pad * 2, t.background) +
        info(
          item,
          iw + 20,
          pad,
          cw - iw - pad - 20 - stub,
          ch - pad * 2,
          t.accent,
          cw > 800 ? 26 : 19,
        ) +
        '</g>';
    });
  }
  const titleX = data.template === 'cute' ? W / 2 : 48,
    anchor = data.template === 'cute' ? 'text-anchor="middle"' : '';
  let heading =
    text(
      titleX,
      62,
      data.type === 'SALE' ? 'PASS ON THE LITTLE JOYS' : 'LOOKING FOR LITTLE JOYS',
      13,
      t.accent,
      anchor + ' letter-spacing="3"',
    ) + text(titleX, 121, data.title, 38, '#30352e', anchor + ' font-weight="bold"');
  if (data.template === 'retro')
    heading += '<path d="M 48 144 H 1152" stroke="' + t.accent + '" stroke-dasharray="8 6"/>';
  if (data.template === 'minimal')
    heading +=
      '<path d="M 48 145 H 1152" stroke="#454b47"/>' +
      text(1152, 62, 'NO. ' + String(n).padStart(2, '0'), 14, t.accent, 'text-anchor="end"');
  return (
    '<svg xmlns="http://www.w3.org/2000/svg" width="' +
    W +
    '" height="' +
    H +
    '" viewBox="0 0 ' +
    W +
    ' ' +
    H +
    '"><rect width="100%" height="100%" fill="' +
    t.background +
    '"/><g font-family="Microsoft YaHei, Noto Sans SC, sans-serif">' +
    heading +
    body +
    text(48, H - 19, '收藏有迹，喜欢无价。', 12, t.accent) +
    '</g></svg>'
  );
}
