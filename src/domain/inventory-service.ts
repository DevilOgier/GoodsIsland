import { Prisma } from '@prisma/client';
import { ensure } from './errors';
import { allocated, decimal, money, replayCosts } from './money';
import { purchaseSchema, saleSchema, feeSchema } from './schemas';
import { z } from 'zod';
type Tx = Prisma.TransactionClient;
export async function inventoryFor(tx: Tx, userId: string, productId: string) {
  return tx.inventory.upsert({
    where: { userId_productId: { userId, productId } },
    create: { userId, productId },
    update: {},
  });
}
export async function arrive(tx: Tx, userId: string, id: string) {
  const p = await tx.purchase.findFirst({ where: { id, userId } });
  ensure(p, '购买记录不存在', 404);
  if (p.arrivalStatus === 'ARRIVED') return p;
  ensure(p.arrivalStatus !== 'CANCELLED', '已取消的购买不能到货', 409);
  const inv = await inventoryFor(tx, userId, p.productId);
  await tx.inventoryEvent.create({
    data: {
      inventoryId: inv.id,
      type: 'BUY',
      quantityDelta: p.quantity,
      costDelta: p.actualCost,
      purchaseId: p.id,
    },
  });
  await tx.inventory.update({
    where: { id: inv.id },
    data: {
      currentQuantity: { increment: p.quantity },
      currentCost: { increment: p.actualCost },
      version: { increment: 1 },
    },
  });
  if (p.wantedId && p.updateWanted) {
    const w = await tx.wanted.findFirst({ where: { id: p.wantedId, userId } });
    ensure(w && w.status !== 'CANCELLED', '收物目标已取消');
    const next = w.fulfilledQuantity + p.quantity;
    ensure(next <= w.wantedQuantity, '已收数量超过目标，请先调整收物目标');
    await tx.wanted.update({
      where: { id: w.id },
      data: {
        fulfilledQuantity: next,
        status: next === w.wantedQuantity ? 'FULFILLED' : 'PARTIAL',
      },
    });
  }
  return tx.purchase.update({
    where: { id: p.id },
    data: { arrivalStatus: 'ARRIVED', arrivedAt: new Date() },
  });
}
export async function buy(tx: Tx, userId: string, raw: unknown) {
  const d = purchaseSchema.parse(raw);
  const product = await tx.product.findFirst({ where: { id: d.productId, status: 'ACTIVE' } });
  ensure(product, '商品不存在或已归档');
  let groupBuyId: string | undefined;
  if (d.groupBuyItemId) {
    const item = await tx.groupBuyItem.findFirst({
      where: { id: d.groupBuyItemId, group: { userId } },
      include: { purchase: true, group: true },
    });
    ensure(item && item.productId === d.productId, '团项不存在或商品不一致');
    ensure(!item.purchase, '该团项已关联购买', 409);
    ensure(!['CANCELLED', 'COMPLETED'].includes(item.group.status), '拼团已结束');
    groupBuyId = item.groupId;
  }
  if (d.wantedId) {
    const w = await tx.wanted.findFirst({
      where: {
        id: d.wantedId,
        userId,
        productId: d.productId,
        status: { in: ['WANTED', 'PARTIAL'] },
      },
    });
    ensure(w, '收物目标无效');
  }
  const productAmount = money(decimal(d.unitPrice).mul(d.quantity));
  const actualCost = productAmount
    .add(d.domesticShipping)
    .add(d.internationalShipping)
    .add(d.otherFee);
  const p = await tx.purchase.create({
    data: {
      ...d,
      arrivalStatus: d.arrivalStatus === 'ARRIVED' ? 'PENDING' : d.arrivalStatus,
      purchaseDate: new Date(d.purchaseDate),
      productAmount,
      actualCost,
      groupBuyId,
      userId,
    },
  });
  return d.arrivalStatus === 'ARRIVED' ? arrive(tx, userId, p.id) : p;
}
export async function sell(tx: Tx, userId: string, raw: unknown) {
  const d = saleSchema.parse(raw);
  const inv = await inventoryFor(tx, userId, d.productId);
  ensure(inv.currentQuantity >= d.quantity, '库存不足，不能超卖', 409);
  const listed = await tx.saleListing.aggregate({
    where: { inventoryId: inv.id, status: 'ACTIVE' },
    _sum: { remainingQuantity: true },
  });
  if (d.listingId) {
    const listing = await tx.saleListing.findFirst({
      where: { id: d.listingId, inventoryId: inv.id, status: 'ACTIVE' },
    });
    ensure(listing && listing.remainingQuantity >= d.quantity, '挂出剩余数量不足', 409);
    await tx.saleListing.update({
      where: { id: listing.id },
      data: {
        remainingQuantity: { decrement: d.quantity },
        status: listing.remainingQuantity === d.quantity ? 'COMPLETED' : 'ACTIVE',
      },
    });
  } else
    ensure(
      inv.currentQuantity - (listed._sum.remainingQuantity ?? 0) >= d.quantity,
      '未挂出数量不足，请选择对应出物记录成交',
      409,
    );
  const cost = allocated(inv.currentCost, d.quantity, inv.currentQuantity);
  const sale = await tx.sale.create({
    data: {
      ...d,
      userId,
      saleDate: new Date(d.saleDate),
      totalAmount: money(decimal(d.unitPrice).mul(d.quantity)),
      allocatedActualCost: cost,
    },
  });
  await tx.inventoryEvent.create({
    data: {
      inventoryId: inv.id,
      type: 'SELL',
      quantityDelta: -d.quantity,
      costDelta: cost.negated(),
      saleId: sale.id,
    },
  });
  await tx.inventory.update({
    where: { id: inv.id },
    data: {
      currentQuantity: { decrement: d.quantity },
      currentCost: { decrement: cost },
      version: { increment: 1 },
    },
  });
  return sale;
}
export async function addFees(tx: Tx, userId: string, raw: unknown) {
  const d = feeSchema.parse(raw);
  const p = await tx.purchase.findFirst({ where: { id: d.purchaseId, userId } });
  ensure(p && p.arrivalStatus !== 'CANCELLED', '购买不存在或已取消', 404);
  const amount = money(decimal(d.domesticShipping).add(d.internationalShipping).add(d.otherFee));
  ensure(amount.gt(0), '追加费用必须大于0');
  const fee = await tx.feeAdjustment.create({ data: { ...d, amount } });
  await tx.purchase.update({ where: { id: p.id }, data: { actualCost: { increment: amount } } });
  if (p.arrivalStatus !== 'ARRIVED') return fee;
  const inv = await inventoryFor(tx, userId, p.productId);
  const events = await tx.inventoryEvent.findMany({
    where: { inventoryId: inv.id, quantityDelta: { not: 0 } },
    orderBy: { sequence: 'asc' },
    include: { purchase: true, sale: { include: { costAdjustments: true } } },
  });
  const replay = replayCosts(
    events.map((e) => ({
      id: e.id,
      quantity: e.quantityDelta,
      cost: e.costDelta.toFixed(2),
      purchaseCost: e.purchase?.actualCost.toFixed(2),
      saleId: e.saleId,
    })),
  );
  ensure(replay.quantity === inv.currentQuantity, '库存流水不一致，请检查', 409);
  const delta = money(replay.cost).sub(inv.currentCost);
  const revision = await tx.costRevision.create({
    data: {
      inventoryId: inv.id,
      feeAdjustmentId: fee.id,
      inventoryCostDelta: delta,
      details: replay.outflows,
    },
  });
  for (const result of replay.outflows) {
    if (!result.saleId) continue;
    const sale = events.find((e) => e.saleId === result.saleId)!.sale!;
    const old = sale.costAdjustments.reduce((n, a) => n.add(a.amount), sale.allocatedActualCost);
    const adjustment = money(result.cost).sub(old);
    if (!adjustment.isZero())
      await tx.saleCostAdjustment.create({
        data: { saleId: sale.id, revisionId: revision.id, amount: adjustment },
      });
  }
  await tx.inventoryEvent.create({
    data: {
      inventoryId: inv.id,
      type: 'COST_ADJUSTMENT',
      quantityDelta: 0,
      costDelta: delta,
      reason: d.reason,
    },
  });
  await tx.inventory.update({
    where: { id: inv.id },
    data: { currentCost: replay.cost, version: { increment: 1 } },
  });
  return { ...fee, inventoryCostDelta: delta };
}
export async function adjust(tx: Tx, userId: string, raw: unknown) {
  const d = z
    .object({
      productId: z.uuid(),
      type: z.enum(['GIFT', 'LOSS', 'EXCHANGE', 'ADJUSTMENT']),
      quantityDelta: z
        .number()
        .int()
        .min(-100000)
        .max(100000)
        .refine((v) => v !== 0),
      cost: z
        .string()
        .regex(/^\d+(\.\d{1,2})?$/)
        .default('0'),
      reason: z.string().min(1).max(500),
    })
    .parse(raw);
  const inv = await inventoryFor(tx, userId, d.productId);
  ensure(d.type !== 'LOSS' || d.quantityDelta < 0, '损耗必须为负数量');
  let cost = money(d.cost);
  if (d.quantityDelta < 0) {
    const listed = await tx.saleListing.aggregate({
      where: { inventoryId: inv.id, status: 'ACTIVE' },
      _sum: { remainingQuantity: true },
    });
    ensure(
      inv.currentQuantity - (listed._sum.remainingQuantity ?? 0) >= -d.quantityDelta,
      '可用库存不足，请先调整挂出数量',
      409,
    );
    cost = allocated(inv.currentCost, -d.quantityDelta, inv.currentQuantity).negated();
  }
  await tx.inventoryEvent.create({
    data: {
      inventoryId: inv.id,
      type: d.type,
      quantityDelta: d.quantityDelta,
      costDelta: cost,
      reason: d.reason,
    },
  });
  return tx.inventory.update({
    where: { id: inv.id },
    data: {
      currentQuantity: { increment: d.quantityDelta },
      currentCost: { increment: cost },
      version: { increment: 1 },
    },
  });
}
