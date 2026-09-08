export type PosterItemData = {
  productId: string;
  name: string;
  quantity: number;
  price: string;
  note: string;
  image?: string;
};
export type PosterData = {
  title: string;
  type: 'SALE' | 'WANTED';
  ratio: string;
  template: string;
  items: PosterItemData[];
};
export const templates: Record<string, { background: string; accent: string; label: string }> = {
  cute: { background: '#f6eaf0', accent: '#a76c89', label: '奶油手帐' },
  simple: { background: '#eaf0e9', accent: '#657954', label: '清新画廊' },
  retro: { background: '#f0e5d2', accent: '#98754a', label: '复古票根' },
  minimal: { background: '#f5f5f3', accent: '#454b47', label: '极简留白' },
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
function lines(s: string, limit: number) {
  const result: string[] = [];
  let line = '',
    count = 0;
  for (const ch of s) {
    const width = ch.charCodeAt(0) > 255 ? 1 : 0.55;
    if (count + width > limit) {
      result.push(line);
      line = '';
      count = 0;
    }
    line += ch;
    count += width;
  }
  if (line) result.push(line);
  return result;
}
export function renderPoster(data: PosterData) {
  const ratio = ratios[data.ratio];
  if (!ratio) throw Error('不支持的比例');
  const t = templates[data.template];
  if (!t) throw Error('模板不存在');
  if (!data.items.length || data.items.length > 12) throw Error('请选择1至12件商品');
  const width = 1200,
    height = Math.round((width * ratio[1]) / ratio[0]);
  const margin = 48,
    gap = 24;
  const cols = Math.min(
    data.items.length,
    data.ratio === '9:16' ? 2 : data.ratio === '16:9' ? 4 : 3,
  );
  const rows = Math.ceil(data.items.length / cols);
  const cellW = (width - margin * 2 - gap * (cols - 1)) / cols;
  const available = height - 240;
  const cellH = (available - gap * (rows - 1)) / rows;
  if (cellH < 220) throw Error('当前比例放不下这些商品，请减少商品或选择竖版');
  let body = '';
  data.items.forEach((item, i) => {
    if (!Number.isSafeInteger(item.quantity) || item.quantity < 1) throw Error('数量必须为正整数');
    if (item.price && !/^\d+(\.\d{1,2})?$/.test(item.price)) throw Error('价格格式不正确');
    const nameLines = lines(item.name, Math.floor((cellW - 32) / 18));
    const noteLines = lines(item.note, Math.floor((cellW - 32) / 14));
    const textHeight = nameLines.length * 24 + noteLines.length * 19 + 60;
    const imageH = cellH - textHeight - 28;
    if (imageH < 70) throw Error('文字较长，请减少商品或改用竖版');
    const x = margin + (i % cols) * (cellW + gap),
      y = 175 + Math.floor(i / cols) * (cellH + gap);
    const safeImage =
      item.image && /^data:image\/(png|jpeg|webp);base64,/.test(item.image) ? item.image : null;
    body +=
      '<g transform="translate(' +
      x +
      ',' +
      y +
      ')"><rect width="' +
      cellW +
      '" height="' +
      cellH +
      '" rx="' +
      (data.template === 'retro' ? 2 : 18) +
      '" fill="#ffffff" fill-opacity=".9"/>';
    body += safeImage
      ? '<image href="' +
        safeImage +
        '" x="16" y="14" width="' +
        (cellW - 32) +
        '" height="' +
        imageH +
        '" preserveAspectRatio="xMidYMid meet"/>'
      : '<rect x="16" y="14" width="' +
        (cellW - 32) +
        '" height="' +
        imageH +
        '" rx="10" fill="' +
        t.background +
        '"/><text x="' +
        cellW / 2 +
        '" y="' +
        (imageH / 2 + 18) +
        '" text-anchor="middle" fill="' +
        t.accent +
        '" font-size="18">暂无商品图</text>';
    nameLines.forEach((l, j) => {
      body +=
        '<text x="16" y="' +
        (imageH + 42 + j * 24) +
        '" font-size="18" fill="#30352e">' +
        escape(l) +
        '</text>';
    });
    const py = imageH + 42 + nameLines.length * 24;
    body +=
      '<text x="16" y="' +
      py +
      '" font-size="22" font-weight="bold" fill="' +
      t.accent +
      '">' +
      (item.price ? '¥' + escape(item.price) : '价格可议') +
      '</text><text x="' +
      (cellW - 16) +
      '" y="' +
      py +
      '" text-anchor="end" font-size="17" fill="#555">× ' +
      item.quantity +
      '</text>';
    noteLines.forEach((l, j) => {
      body +=
        '<text x="16" y="' +
        (py + 25 + j * 19) +
        '" font-size="14" fill="#777">' +
        escape(l) +
        '</text>';
    });
    body += '</g>';
  });
  return (
    '<svg xmlns="http://www.w3.org/2000/svg" width="' +
    width +
    '" height="' +
    height +
    '" viewBox="0 0 ' +
    width +
    ' ' +
    height +
    '"><rect width="100%" height="100%" fill="' +
    t.background +
    '"/><g font-family="Microsoft YaHei, Noto Sans SC, sans-serif"><text x="48" y="64" fill="' +
    t.accent +
    '" font-size="14" letter-spacing="4">GUYU COLLECTION · ' +
    data.type +
    '</text><text x="48" y="123" fill="#30352e" font-size="38" font-weight="bold">' +
    escape(data.title.slice(0, 24)) +
    '</text>' +
    body +
    '<text x="48" y="' +
    (height - 28) +
    '" font-size="13" fill="' +
    t.accent +
    '" letter-spacing="2">收藏有迹，喜欢无价。</text></g></svg>'
  );
}
