import invitationSubsets from './invitation-font-subsets.json';
export const fontRoles = {
  sans: "'Goods Island Sans', 'Noto Sans SC', 'PingFang SC', 'Microsoft YaHei', sans-serif",
  serif: "'Goods Island Serif', 'Noto Serif SC', 'Songti SC', 'SimSun', serif",
  handwriting: "'Goods Island Chinese Hand', 'Goods Island Hand', 'Kaiti SC', 'STKaiti', serif",
  latinHandwriting: "'Goods Island Hand', cursive",
  mono: "'SFMono-Regular', Consolas, 'Liberation Mono', monospace",
} as const;

export const posterFontAssets = {
  sans: '/fonts/NunitoSans-Variable.ttf',
  serif: '/fonts/PlayfairDisplay-Variable.ttf',
  handwriting: '/fonts/Caveat-Variable.ttf',
  chineseHandwriting: '/fonts/LXGWWenKaiLite-Regular.woff2',
  chineseSerif: '/fonts/InvitationSong-Semibold.woff2',
} as const;

export type PosterFontRole = keyof typeof posterFontAssets;

export function fontFaceCss(sources: Partial<Record<keyof typeof posterFontAssets, string>>) {
  return [
    sources.chineseSerif
      ? `@font-face{font-family:'Goods Island Song';src:url('${sources.chineseSerif}') format('woff2');font-weight:400 900;font-display:block}`
      : '',
    sources.sans
      ? `@font-face{font-family:'Goods Island Sans';src:url('${sources.sans}') format('truetype');font-weight:200 1000;font-display:swap}`
      : '',
    sources.serif
      ? `@font-face{font-family:'Goods Island Serif';src:url('${sources.serif}') format('truetype');font-weight:400 900;font-display:swap}`
      : '',
    sources.handwriting
      ? `@font-face{font-family:'Goods Island Hand';src:url('${sources.handwriting}') format('truetype');font-weight:400 700;font-display:swap}`
      : '',
    sources.chineseHandwriting
      ? `@font-face{font-family:'Goods Island Chinese Hand';src:url('${sources.chineseHandwriting}') format('woff2');font-weight:400;font-display:block}`
      : '',
  ].join('');
}

export const posterFontFamilies: Record<PosterFontRole, string> = {
  sans: 'Goods Island Sans',
  serif: 'Goods Island Serif',
  handwriting: 'Goods Island Hand',
  chineseHandwriting: 'Goods Island Chinese Hand',
  chineseSerif: 'Goods Island Song',
};

export function posterFontSources(roles: PosterFontRole[], text?: string) {
  const points =
    text === undefined ? null : new Set(Array.from(text, (character) => character.codePointAt(0)!));
  return [...new Set(roles)]
    .sort()
    .flatMap<{ role: PosterFontRole; url: string; unicodeRange: string }>((role) => {
      if (role === 'chineseSerif' && points)
        return invitationSubsets
          .filter((part) => [...points].some((point) => point >= part.start && point <= part.end))
          .map((part) => ({
            role,
            url: part.url,
            unicodeRange: `U+${part.start.toString(16)}-${part.end.toString(16)}`,
          }));
      return [{ role, url: posterFontAssets[role], unicodeRange: '' }];
    });
}
