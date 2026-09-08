import { Prisma } from '@prisma/client';
export const decimal = (n: Prisma.Decimal.Value) => new Prisma.Decimal(n);
export const money = (n: Prisma.Decimal.Value) => decimal(n).toDecimalPlaces(2);
export function allocated(cost: Prisma.Decimal.Value, quantity: number, stock: number) {
  if (!Number.isSafeInteger(quantity) || quantity <= 0 || quantity > stock)
    throw new Error('库存不足');
  return quantity === stock ? money(cost) : money(decimal(cost).mul(quantity).div(stock));
}
export type CostEntry = {
  id: string;
  quantity: number;
  cost: string;
  purchaseCost?: string;
  saleId?: string | null;
};
export function replayCosts(entries: CostEntry[]) {
  let quantity = 0;
  let cost = money(0);
  const outflows: { eventId: string; saleId: string | null; cost: string }[] = [];
  for (const e of entries) {
    if (e.quantity > 0) {
      quantity += e.quantity;
      cost = cost.add(e.purchaseCost ?? e.cost);
    } else if (e.quantity < 0) {
      const part = allocated(cost, -e.quantity, quantity);
      quantity += e.quantity;
      cost = cost.sub(part);
      outflows.push({ eventId: e.id, saleId: e.saleId ?? null, cost: part.toFixed(2) });
    }
  }
  return { quantity, cost: cost.toFixed(2), outflows };
}
