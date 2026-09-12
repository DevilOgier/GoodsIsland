export const fontRoles = {
  sans: "'Goods Island Sans', 'Noto Sans SC', 'PingFang SC', 'Microsoft YaHei', sans-serif",
  serif: "'Goods Island Serif', 'Noto Serif SC', 'Songti SC', 'SimSun', serif",
  handwriting: "'Goods Island Hand', 'Kaiti SC', 'STKaiti', serif",
  mono: "'SFMono-Regular', Consolas, 'Liberation Mono', monospace",
} as const;

export const posterFontAssets = {
  sans: '/fonts/NunitoSans-Variable.ttf',
  serif: '/fonts/PlayfairDisplay-Variable.ttf',
  handwriting: '/fonts/Caveat-Variable.ttf',
} as const;

export function fontFaceCss(sources: Partial<Record<keyof typeof posterFontAssets, string>>) {
  return [
    sources.sans
      ? `@font-face{font-family:'Goods Island Sans';src:url('${sources.sans}') format('truetype');font-weight:200 1000;font-display:swap}`
      : '',
    sources.serif
      ? `@font-face{font-family:'Goods Island Serif';src:url('${sources.serif}') format('truetype');font-weight:400 900;font-display:swap}`
      : '',
    sources.handwriting
      ? `@font-face{font-family:'Goods Island Hand';src:url('${sources.handwriting}') format('truetype');font-weight:400 700;font-display:swap}`
      : '',
  ].join('');
}
