import type { Snapshot } from '@/components/types';
import { cents } from './accounting';

/** Current collection commitment: remaining stock plus purchases awaiting arrival. */
export function collectionInvestment(data: Pick<Snapshot, 'inventory' | 'purchases'>) {
  const pendingByProduct = new Map<string, bigint>();
  for (const purchase of data.purchases) {
    if (!['PENDING', 'SHIPPED'].includes(purchase.arrivalStatus)) continue;
    pendingByProduct.set(
      purchase.productId,
      (pendingByProduct.get(purchase.productId) ?? 0n) + cents(purchase.actualCost),
    );
  }
  const inHand = data.inventory.reduce((sum, item) => sum + cents(item.currentCost), 0n);
  const pending = [...pendingByProduct.values()].reduce((sum, amount) => sum + amount, 0n);
  return { inHand, pending, total: inHand + pending, pendingByProduct };
}
