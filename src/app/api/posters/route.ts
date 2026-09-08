import { z } from 'zod';
import { requireUser } from '@/infrastructure/auth';
import { db } from '@/infrastructure/db';
import { ensure } from '@/domain/errors';
import { fail, originGuard } from '@/lib/http';
export async function POST(request: Request) {
  try {
    originGuard(request);
    const user = await requireUser();
    const d = z
      .object({
        title: z.string().min(1).max(24),
        type: z.enum(['SALE', 'WANTED']),
        ratio: z.enum(['1:1', '4:3', '3:4', '16:9', '9:16']),
        template: z.enum(['cute', 'simple', 'retro', 'minimal']),
        items: z
          .array(
            z.object({
              productId: z.uuid(),
              quantity: z.number().int().min(1).max(100000),
              price: z.string().regex(/^(\d+(\.\d{1,2})?)?$/),
              note: z.string().max(80),
            }),
          )
          .min(1)
          .max(12),
      })
      .parse(await request.json());
    const result = await db.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtextextended(${user.id},0))`;
      const template = await tx.posterTemplate.findUniqueOrThrow({
        where: { key_version: { key: d.template, version: 1 } },
      });
      ensure(
        new Set(d.items.map((i) => i.productId)).size === d.items.length,
        '海报不能重复添加同一商品',
      );
      const items = [];
      for (const [sortOrder, i] of d.items.entries()) {
        const p = await tx.product.findUniqueOrThrow({
          where: { id: i.productId },
          include: { series: { include: { character: true } } },
        });
        if (d.type === 'SALE') {
          const inv = await tx.inventory.findUnique({
            where: { userId_productId: { userId: user.id, productId: p.id } },
          });
          ensure(inv && inv.currentQuantity >= i.quantity, '出物数量超过在手库存');
        }
        items.push({
          ...i,
          price: i.price || null,
          sortOrder,
          imageAssetId:
            p.selectedSource === 'ENHANCED' && p.enhancedId ? p.enhancedId : p.originalId,
          productSnapshot: {
            name: p.name,
            character: p.series.character.name,
            series: p.series.name,
            version: 1,
          },
        });
      }
      return tx.poster.create({
        data: {
          userId: user.id,
          title: d.title,
          type: d.type,
          ratio: d.ratio,
          templateId: template.id,
          templateConfig: template.defaultConfig!,
          items: { create: items },
        },
      });
    });
    return Response.json(result);
  } catch (e) {
    return fail(e);
  }
}
