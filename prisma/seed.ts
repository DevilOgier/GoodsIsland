import { PrismaClient } from '@prisma/client';
const db = new PrismaClient();
const ip = await db.iP.upsert({
  where: { name: '崩坏：星穹铁道' },
  update: {},
  create: { name: '崩坏：星穹铁道' },
});
for (const [character, seriesName, types] of [
  ['三月七', '生日系列', ['BADGE', 'STANDEE', 'POSTCARD']],
  ['丹恒', '星旅系列', ['BADGE', 'KEYCHAIN']],
  ['流萤', '夏日系列', ['STANDEE', 'POSTCARD']],
  ['卡芙卡', '星旅系列', ['BADGE']],
] as const) {
  const c = await db.character.upsert({
    where: { ipId_name: { ipId: ip.id, name: character } },
    update: {},
    create: { ipId: ip.id, name: character },
  });
  const s = await db.series.upsert({
    where: { characterId_name: { characterId: c.id, name: seriesName } },
    update: {},
    create: { characterId: c.id, name: seriesName },
  });
  const names = { BADGE: '徽章', STANDEE: '亚克力立牌', POSTCARD: '明信片', KEYCHAIN: '钥匙扣' };
  for (const type of types) {
    const name = character + ' · ' + names[type];
    await db.product.upsert({
      where: {
        seriesId_appearanceKey_name_productType: {
          seriesId: s.id,
          appearanceKey: 'example',
          name,
          productType: type,
        },
      },
      update: {},
      create: {
        seriesId: s.id,
        appearanceKey: 'example',
        name,
        productType: type,
        description: '示例图鉴条目。装饰占位图不是商品实拍，请上传你自己的商品图片。',
      },
    });
  }
}
for (const name of ['生日限定', '日常收藏', '心愿清单'])
  await db.tag.upsert({ where: { name }, update: {}, create: { name } });
for (const [key, name, color] of [
  ['cute', '奶油手帐', '#f3e6ef'],
  ['simple', '清新画廊', '#e8f0ea'],
  ['retro', '复古票根', '#eee3cf'],
  ['minimal', '极简留白', '#f1f1f1'],
]) {
  for (const version of [1, 2])
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
console.log('示例图鉴和海报模板已初始化；未创建账号或虚构个人库存。');
await db.$disconnect();
