import { z } from 'zod';
import { requireUser } from '@/infrastructure/auth';
import { db } from '@/infrastructure/db';
import { ensure } from '@/domain/errors';
import { fail, originGuard } from '@/lib/http';

const templateConfigSchema = z.object({
  palette: z.string().min(1).max(32),
  density: z.enum(['IMAGE_FIRST', 'BALANCED', 'INFO_FIRST']),
  priceStyle: z.enum(['PRICE_PROMINENT', 'PRICE_NORMAL', 'PRICE_HIDDEN']),
  showNote: z.boolean(),
});

export async function POST(request: Request) {
  try {
    originGuard(request);
    const user = await requireUser();
    const data = z
      .object({
        title: z.string().min(1).max(24),
        type: z.enum(['SALE', 'WANTED']),
        ratio: z.enum(['1:1', '4:3', '3:4', '16:9', '9:16']),
        template: z.enum([
          'cute',
          'simple',
          'retro',
          'minimal',
          'polaroid',
          'invitation',
          'gingham',
          'resume',
        ]),
        templateVersion: z.number().int().min(1).max(3).default(3),
        templateConfig: templateConfigSchema.optional(),
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

    const result = await db.$transaction(async (transaction) => {
      await transaction.$executeRaw`SELECT pg_advisory_xact_lock(hashtextextended(${user.id},0))`;
      const template = await transaction.posterTemplate.findUniqueOrThrow({
        where: {
          key_version: { key: data.template, version: data.templateVersion },
        },
      });
      ensure(
        new Set(data.items.map((item) => item.productId)).size === data.items.length,
        '海报不能重复添加同一商品',
      );

      const items = [];
      for (const [sortOrder, item] of data.items.entries()) {
        const product = await transaction.product.findUniqueOrThrow({
          where: { id: item.productId },
          include: { series: { include: { character: true } } },
        });
        if (data.type === 'SALE') {
          const inventory = await transaction.inventory.findUnique({
            where: {
              userId_productId: { userId: user.id, productId: product.id },
            },
          });
          ensure(inventory && inventory.currentQuantity >= item.quantity, '出物数量超过在手库存');
        }
        items.push({
          ...item,
          price: item.price || null,
          sortOrder,
          imageAssetId:
            product.selectedSource === 'ENHANCED' && product.enhancedId
              ? product.enhancedId
              : product.originalId,
          productSnapshot: {
            name: product.name,
            character: product.series.character.name,
            series: product.series.name,
            version: 1,
          },
        });
      }

      return transaction.poster.create({
        data: {
          userId: user.id,
          title: data.title,
          type: data.type,
          ratio: data.ratio,
          templateId: template.id,
          templateConfig: data.templateConfig ?? template.defaultConfig!,
          items: { create: items },
        },
      });
    });
    return Response.json(result);
  } catch (error) {
    return fail(error);
  }
}
