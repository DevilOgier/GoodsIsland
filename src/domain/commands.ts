import { createHash, randomUUID } from 'node:crypto';
import { Prisma } from '@prisma/client';
import { z } from 'zod';
import { db } from '@/infrastructure/db';
import { ensure, DomainError } from './errors';
import { amount, quantity, productSchema } from './schemas';
import {
  buy,
  sell,
  arrive,
  addFees,
  adjust,
  inventoryFor,
  updatePurchase,
  deletePurchase,
} from './inventory-service';
type Tx = Prisma.TransactionClient;
export async function command(
  user: { id: string; role: string },
  operation: string,
  raw: unknown,
  key: string,
) {
  ensure(key.length >= 8 && key.length <= 100, '缺少有效幂等键');
  const hash = createHash('sha256').update(JSON.stringify(raw)).digest('hex');
  return db.$transaction(
    async (tx) => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtextextended(${user.id},0))`;
      const prior = await tx.mutationRequest.findUnique({
        where: { userId_operation_key: { userId: user.id, operation, key } },
      });
      if (prior) {
        ensure(prior.requestHash === hash, '幂等键已用于不同请求', 409);
        return prior.response;
      }
      const result = await dispatch(tx, user, operation, raw);
      const response = JSON.parse(JSON.stringify(result ?? { ok: true })) as Prisma.InputJsonValue;
      await tx.mutationRequest.create({
        data: { userId: user.id, operation, key, requestHash: hash, response },
      });
      return response;
    },
    { timeout: 20000 },
  );
}
async function dispatch(
  tx: Tx,
  user: { id: string; role: string },
  op: string,
  raw: unknown,
): Promise<unknown> {
  const userId = user.id;
  if (op === 'purchase.create') return buy(tx, userId, raw);
  if (op === 'purchase.update') return updatePurchase(tx, userId, raw);
  if (op === 'purchase.delete')
    return deletePurchase(tx, userId, z.object({ id: z.uuid() }).parse(raw).id);
  if (op === 'sale.create') return sell(tx, userId, raw);
  if (op === 'purchase.fees') return addFees(tx, userId, raw);
  if (op === 'inventory.adjust') return adjust(tx, userId, raw);
  if (op === 'purchase.arrive') return arrive(tx, userId, z.object({ id: z.uuid() }).parse(raw).id);
  if (op === 'purchase.status') {
    const d = z.object({ id: z.uuid(), status: z.enum(['SHIPPED', 'CANCELLED']) }).parse(raw);
    const p = await tx.purchase.findFirst({ where: { id: d.id, userId } });
    ensure(p && !['ARRIVED', 'CANCELLED'].includes(p.arrivalStatus), '不能更改当前购买状态', 409);
    return tx.purchase.update({ where: { id: p.id }, data: { arrivalStatus: d.status } });
  }
  if (op === 'listing.create') {
    const d = z
      .object({
        productId: z.uuid(),
        quantity,
        unitPrice: amount,
        notes: z.string().max(2000).default(''),
      })
      .parse(raw);
    const inv = await inventoryFor(tx, userId, d.productId);
    ensure(inv.currentQuantity >= d.quantity, '挂出数量不能超过在手库存', 409);
    ensure(
      !(await tx.saleListing.findFirst({ where: { inventoryId: inv.id, status: 'ACTIVE' } })),
      '该商品已有挂出，请先撤下或完成',
      409,
    );
    return tx.saleListing.create({
      data: {
        inventoryId: inv.id,
        quantity: d.quantity,
        remainingQuantity: d.quantity,
        unitPrice: d.unitPrice,
        notes: d.notes,
      },
    });
  }
  if (op === 'listing.cancel') {
    const { id } = z.object({ id: z.uuid() }).parse(raw);
    const l = await tx.saleListing.findFirst({
      where: { id, inventory: { userId }, status: 'ACTIVE' },
    });
    ensure(l, '出物记录不存在', 404);
    return tx.saleListing.update({ where: { id }, data: { status: 'CANCELLED' } });
  }
  if (op === 'wanted.create') {
    const d = z
      .object({
        productId: z.uuid(),
        wantedQuantity: quantity,
        targetPrice: amount.optional(),
        priority: z.enum(['LOW', 'NORMAL', 'HIGH']).default('NORMAL'),
        notes: z.string().max(2000).default(''),
      })
      .parse(raw);
    const existing = await tx.wanted.findFirst({
      where: { userId, productId: d.productId, status: { in: ['WANTED', 'PARTIAL'] } },
    });
    if (existing)
      return tx.wanted.update({
        where: { id: existing.id },
        data: {
          wantedQuantity: { increment: d.wantedQuantity },
          targetPrice: d.targetPrice,
          priority: d.priority,
          notes: d.notes,
        },
      });
    return tx.wanted.create({ data: { ...d, userId } });
  }
  if (op === 'wanted.update') {
    const d = z
      .object({
        id: z.uuid(),
        productId: z.uuid(),
        wantedQuantity: quantity,
        targetPrice: amount.optional(),
        priority: z.enum(['LOW', 'NORMAL', 'HIGH']),
        notes: z.string().max(2000).default(''),
      })
      .parse(raw);
    const w = await tx.wanted.findFirst({ where: { id: d.id, userId } });
    ensure(w, '收物不存在', 404);
    ensure(w.productId === d.productId, '不能更换心愿商品');
    ensure(d.wantedQuantity >= w.fulfilledQuantity, '想收数量不能少于已收数量');
    return tx.wanted.update({
      where: { id: w.id },
      data: {
        wantedQuantity: d.wantedQuantity,
        targetPrice: d.targetPrice,
        priority: d.priority,
        notes: d.notes,
        status:
          d.wantedQuantity === w.fulfilledQuantity
            ? 'FULFILLED'
            : w.fulfilledQuantity
              ? 'PARTIAL'
              : 'WANTED',
      },
    });
  }
  if (op === 'wanted.delete') {
    const { id } = z.object({ id: z.uuid() }).parse(raw);
    const w = await tx.wanted.findFirst({ where: { id, userId } });
    ensure(w, '收物不存在', 404);
    return tx.wanted.delete({ where: { id: w.id } });
  }
  if (op === 'wanted.progress') {
    const d = z
      .object({
        id: z.uuid(),
        fulfilledQuantity: z.number().int().min(0),
        cancel: z.boolean().default(false),
      })
      .parse(raw);
    const w = await tx.wanted.findFirst({ where: { id: d.id, userId } });
    ensure(w, '收物不存在', 404);
    ensure(d.fulfilledQuantity <= w.wantedQuantity, '已收不能超过目标');
    return tx.wanted.update({
      where: { id: w.id },
      data: {
        fulfilledQuantity: d.fulfilledQuantity,
        status: d.cancel
          ? 'CANCELLED'
          : d.fulfilledQuantity === w.wantedQuantity
            ? 'FULFILLED'
            : d.fulfilledQuantity
              ? 'PARTIAL'
              : 'WANTED',
      },
    });
  }
  if (op === 'group.create') {
    const d = z
      .object({
        name: z.string().min(1).max(100),
        groupOwner: z.string().min(1).max(100),
        notes: z.string().max(2000).default(''),
      })
      .parse(raw);
    return tx.groupBuy.create({ data: { ...d, userId } });
  }
  if (op === 'group.item') {
    const d = z
      .object({ groupId: z.uuid(), productId: z.uuid(), quantity, unitPrice: amount })
      .parse(raw);
    ensure(
      await tx.groupBuy.findFirst({ where: { id: d.groupId, userId, status: 'OPEN' } }),
      '拼团不存在或已截团',
    );
    return tx.groupBuyItem.create({ data: d });
  }
  if (op === 'group.pay') {
    const { id } = z.object({ id: z.uuid() }).parse(raw);
    const item = await tx.groupBuyItem.findFirst({
      where: { id, group: { userId } },
      include: { purchase: true, group: true },
    });
    ensure(item, '团项不存在', 404);
    ensure(!['COMPLETED', 'CANCELLED'].includes(item.group.status), '拼团已结束', 409);
    const purchase =
      item.purchase ??
      (await buy(tx, userId, {
        productId: item.productId,
        quantity: item.quantity,
        unitPrice: item.unitPrice.toFixed(2),
        purchaseChannel: '拼团',
        purchaseDate: new Date().toISOString().slice(0, 10),
        arrivalStatus: 'PENDING',
        groupBuyItemId: item.id,
      }));
    await tx.groupBuyItem.update({
      where: { id: item.id },
      data: { paymentStatus: 'PAID' },
    });
    return purchase;
  }
  if (op === 'group.dispatch') {
    const d = z.object({ id: z.uuid(), shippingFee: amount }).parse(raw);
    const item = await tx.groupBuyItem.findFirst({
      where: { id: d.id, group: { userId } },
      include: { purchase: true, group: true },
    });
    ensure(item, '团项不存在', 404);
    ensure(!['COMPLETED', 'CANCELLED'].includes(item.group.status), '拼团已结束', 409);
    ensure(item.paymentStatus === 'PAID' && item.purchase, '请先确认已付款', 409);
    ensure(item.dispatchStatus !== 'DISPATCHED', '该团项已经派发', 409);
    ensure(
      !['ARRIVED', 'CANCELLED'].includes(item.purchase.arrivalStatus),
      '当前购买状态不能派发',
      409,
    );
    if (Number(d.shippingFee) > 0)
      await addFees(tx, userId, {
        purchaseId: item.purchase.id,
        domesticShipping: d.shippingFee,
        internationalShipping: '0',
        otherFee: '0',
        reason: '拼团派发邮费',
      });
    await tx.purchase.update({
      where: { id: item.purchase.id },
      data: { arrivalStatus: 'SHIPPED' },
    });
    return tx.groupBuyItem.update({
      where: { id: item.id },
      data: { dispatchStatus: 'DISPATCHED' },
    });
  }
  if (op === 'group.item-status') {
    const d = z
      .object({
        id: z.uuid(),
        paymentStatus: z.enum(['UNPAID', 'PAID']).optional(),
        shippingStatus: z.enum(['NOT_SHIPPED', 'SHIPPED']).optional(),
        dispatchStatus: z.enum(['NOT_DISPATCHED', 'DISPATCHED']).optional(),
      })
      .parse(raw);
    const item = await tx.groupBuyItem.findFirst({
      where: { id: d.id, group: { userId } },
      include: { group: true },
    });
    ensure(item, '团项不存在', 404);
    ensure(!['COMPLETED', 'CANCELLED'].includes(item.group.status), '拼团已结束', 409);
    const { id, ...status } = d;
    return tx.groupBuyItem.update({ where: { id }, data: status });
  }
  if (op === 'group.status') {
    const d = z
      .object({ id: z.uuid(), status: z.enum(['CLOSED', 'COMPLETED', 'CANCELLED']) })
      .parse(raw);
    const g = await tx.groupBuy.findFirst({
      where: { id: d.id, userId },
      include: { items: { include: { purchase: true } } },
    });
    ensure(g, '拼团不存在', 404);
    ensure(['OPEN', 'CLOSED'].includes(g.status), '拼团已结束', 409);
    if (d.status === 'COMPLETED')
      ensure(
        g.status === 'CLOSED' &&
          g.items.length > 0 &&
          g.items.every(
            (i) => i.purchase?.arrivalStatus === 'ARRIVED' && i.dispatchStatus === 'DISPATCHED',
          ),
        '需截团且全部到货、排发后完成',
      );
    if (d.status === 'CANCELLED') {
      ensure(
        g.items.every((i) => i.purchase?.arrivalStatus !== 'ARRIVED'),
        '有已到货商品，不能取消',
      );
      await tx.purchase.updateMany({
        where: { groupBuyId: g.id, userId },
        data: { arrivalStatus: 'CANCELLED' },
      });
    }
    return tx.groupBuy.update({ where: { id: g.id }, data: { status: d.status } });
  }
  if (op.startsWith('catalog.')) {
    ensure(user.role === 'ADMIN', '仅管理员可维护公共图鉴', 403);
    if (op === 'catalog.type') {
      const d = z.object({ name: z.string().trim().min(1).max(30) }).parse(raw);
      return tx.productType.create({ data: { key: 'CUSTOM_' + randomUUID(), name: d.name } });
    }
    async function nameFor(seriesId: string, productType: string) {
      const series = await tx.series.findUnique({
        where: { id: seriesId },
        include: { character: true },
      });
      const type = await tx.productType.findUnique({ where: { key: productType } });
      ensure(series && type && type.status === 'ACTIVE', '请选择有效系列与类型');
      return series.character.name + ' · ' + series.name + ' · ' + type.name;
    }
    if (op === 'catalog.product') {
      const d = productSchema.parse(raw);
      const { tagIds, ...data } = d;
      return tx.product.create({
        data: {
          ...data,
          name: await nameFor(data.seriesId, data.productType),
          tags: { create: tagIds.map((tagId) => ({ tagId })) },
        },
      });
    }
    if (op === 'catalog.product-update') {
      const d = productSchema.extend({ id: z.uuid() }).parse(raw);
      const { id, tagIds, ...rest } = d;
      return tx.product.update({
        where: { id },
        data: {
          ...rest,
          name: await nameFor(rest.seriesId, rest.productType),
          ...(tagIds.length
            ? { tags: { deleteMany: {}, create: tagIds.map((tagId) => ({ tagId })) } }
            : {}),
        },
      });
    }
    if (op === 'catalog.entity') {
      const d = z
        .object({
          type: z.enum(['ip', 'character', 'series', 'tag']),
          name: z.string().min(1).max(100),
          parentId: z.uuid().optional(),
        })
        .parse(raw);
      if (d.type === 'ip') return tx.iP.create({ data: { name: d.name } });
      if (d.type === 'tag') return tx.tag.create({ data: { name: d.name } });
      ensure(d.parentId, '请选择上级');
      if (d.type === 'character')
        return tx.character.create({ data: { name: d.name, ipId: d.parentId } });
      return tx.series.create({ data: { name: d.name, characterId: d.parentId } });
    }
    if (op === 'catalog.delete') {
      const d = z
        .object({
          entity: z.enum(['product', 'ip', 'character', 'series', 'tag', 'productType']),
          id: z.string().min(1).max(100),
        })
        .parse(raw);
      async function deleteProducts(ids: string[]) {
        if (!ids.length) return;
        const products = await tx.product.findMany({ where: { id: { in: ids } } });
        const [inventories, purchases, sales, groupItems, wanted, posterItems, jobs, uploads] =
          await Promise.all([
            tx.inventory.count({ where: { productId: { in: ids } } }),
            tx.purchase.count({ where: { productId: { in: ids } } }),
            tx.sale.count({ where: { productId: { in: ids } } }),
            tx.groupBuyItem.count({ where: { productId: { in: ids } } }),
            tx.wanted.count({ where: { productId: { in: ids } } }),
            tx.posterItem.count({ where: { productId: { in: ids } } }),
            tx.imageJob.count({ where: { productId: { in: ids } } }),
            tx.uploadIntent.count({ where: { productId: { in: ids } } }),
          ]);
        ensure(
          products.every(
            (product) => !product.originalId && !product.enhancedId && !product.thumbnailId,
          ) &&
            inventories + purchases + sales + groupItems + wanted + posterItems + jobs + uploads ===
              0,
          '所选内容已有图片、库存或业务记录，请使用归档保留历史',
          409,
        );
        await tx.productTag.deleteMany({ where: { productId: { in: ids } } });
        await tx.product.deleteMany({ where: { id: { in: ids } } });
      }
      if (d.entity === 'product') {
        const id = z.uuid().parse(d.id);
        ensure(await tx.product.findUnique({ where: { id } }), '图鉴商品不存在', 404);
        await deleteProducts([id]);
        return { id };
      }
      if (d.entity === 'series') {
        const id = z.uuid().parse(d.id);
        ensure(await tx.series.findUnique({ where: { id } }), '系列不存在', 404);
        const products = await tx.product.findMany({
          where: { seriesId: id },
          select: { id: true },
        });
        await deleteProducts(products.map((product) => product.id));
        await tx.series.delete({ where: { id } });
        return { id };
      }
      if (d.entity === 'character') {
        const id = z.uuid().parse(d.id);
        ensure(await tx.character.findUnique({ where: { id } }), '角色不存在', 404);
        const products = await tx.product.findMany({
          where: { series: { characterId: id } },
          select: { id: true },
        });
        await deleteProducts(products.map((product) => product.id));
        await tx.series.deleteMany({ where: { characterId: id } });
        await tx.character.delete({ where: { id } });
        return { id };
      }
      if (d.entity === 'ip') {
        const id = z.uuid().parse(d.id);
        ensure(await tx.iP.findUnique({ where: { id } }), 'IP 不存在', 404);
        const products = await tx.product.findMany({
          where: { series: { character: { ipId: id } } },
          select: { id: true },
        });
        await deleteProducts(products.map((product) => product.id));
        await tx.series.deleteMany({ where: { character: { ipId: id } } });
        await tx.character.deleteMany({ where: { ipId: id } });
        await tx.iP.delete({ where: { id } });
        return { id };
      }
      if (d.entity === 'tag') {
        const id = z.uuid().parse(d.id);
        await tx.productTag.deleteMany({ where: { tagId: id } });
        await tx.tag.delete({ where: { id } });
        return { id };
      }
      ensure(d.id.startsWith('CUSTOM_'), '系统内置谷子类型不能删除');
      ensure(
        (await tx.product.count({ where: { productType: d.id } })) === 0,
        '请先删除或修改使用该类型的商品',
      );
      await tx.productType.delete({ where: { key: d.id } });
      return { id: d.id };
    }
    if (op === 'catalog.archive') {
      const d = z.object({ id: z.uuid(), status: z.enum(['ACTIVE', 'ARCHIVED']) }).parse(raw);
      return tx.product.update({ where: { id: d.id }, data: { status: d.status } });
    }
  }
  throw new DomainError('未知操作', 404);
}
