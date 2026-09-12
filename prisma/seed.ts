import { PrismaClient } from '@prisma/client';

const db = new PrismaClient();

for (const [key, name, color] of [
  ['cute', '奶油手帐', '#f3e6ef'],
  ['simple', '清新画廊', '#e8f0ea'],
  ['retro', '复古票根', '#eee3cf'],
  ['minimal', '极简留白', '#f1f1f1'],
]) {
  for (const version of [1, 2]) {
    await db.posterTemplate.upsert({
      where: { key_version: { key, version } },
      update: {},
      create: {
        key,
        version,
        name,
        rendererKey: key,
        defaultConfig: { background: color, layoutVersion: version },
      },
    });
  }
}

for (const [key, name, config] of [
  [
    'polaroid',
    '奶油手账',
    { palette: 'cream', density: 'BALANCED', priceStyle: 'PRICE_PROMINENT', showNote: true },
  ],
  [
    'invitation',
    '婚礼请柬',
    { palette: 'champagne', density: 'INFO_FIRST', priceStyle: 'PRICE_PROMINENT', showNote: true },
  ],
  [
    'gingham',
    '田园格纹',
    { palette: 'sage', density: 'BALANCED', priceStyle: 'PRICE_PROMINENT', showNote: true },
  ],
  [
    'resume',
    '收藏简历',
    { palette: 'paper', density: 'INFO_FIRST', priceStyle: 'PRICE_NORMAL', showNote: true },
  ],
] as const) {
  await db.posterTemplate.upsert({
    where: { key_version: { key, version: 3 } },
    update: {},
    create: {
      key,
      version: 3,
      name,
      rendererKey: key,
      defaultConfig: config,
    },
  });
}

console.log('基础谷子类型和海报模板已初始化；图鉴及个人数据保持为空。');
await db.$disconnect();
