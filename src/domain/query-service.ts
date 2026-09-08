import { db } from '@/infrastructure/db';
export const productInclude = {
  typeDefinition: true,
  series: { include: { character: { include: { ip: true } } } },
  tags: { include: { tag: true } },
} as const;
export async function snapshot(userId: string) {
  const [
    products,
    ips,
    characters,
    series,
    tags,
    inventory,
    purchases,
    sales,
    listings,
    groups,
    wanted,
    posters,
    templates,
    jobs,
    productTypes,
  ] = await Promise.all([
    db.product.findMany({ include: productInclude, orderBy: { createdAt: 'desc' } }),
    db.iP.findMany(),
    db.character.findMany(),
    db.series.findMany(),
    db.tag.findMany(),
    db.inventory.findMany({
      where: { userId },
      include: { events: { orderBy: { sequence: 'desc' } } },
    }),
    db.purchase.findMany({
      where: { userId },
      include: { adjustments: true },
      orderBy: { createdAt: 'desc' },
    }),
    db.sale.findMany({
      where: { userId },
      include: { costAdjustments: true },
      orderBy: { createdAt: 'desc' },
    }),
    db.saleListing.findMany({
      where: { inventory: { userId } },
      include: { inventory: true },
      orderBy: { createdAt: 'desc' },
    }),
    db.groupBuy.findMany({
      where: { userId },
      include: { items: { include: { purchase: true } } },
      orderBy: { createdAt: 'desc' },
    }),
    db.wanted.findMany({ where: { userId }, orderBy: { createdAt: 'desc' } }),
    db.poster.findMany({
      where: { userId },
      include: { items: true, template: true },
      orderBy: { createdAt: 'desc' },
    }),
    db.posterTemplate.findMany({ where: { status: 'ACTIVE' } }),
    db.imageJob.findMany({ where: { userId }, orderBy: { createdAt: 'desc' }, take: 30 }),
    db.productType.findMany({ where: { status: 'ACTIVE' }, orderBy: { createdAt: 'asc' } }),
  ]);
  return {
    products,
    ips,
    characters,
    series,
    tags,
    inventory,
    purchases,
    sales,
    listings,
    groups,
    wanted,
    posters,
    templates,
    jobs,
    productTypes,
    provider: process.env.IMAGE_ENHANCEMENT_PROVIDER ?? 'mock',
  };
}
