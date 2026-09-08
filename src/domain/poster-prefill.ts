import type { Snapshot } from '@/components/types';
import type { PosterItemData } from '@/poster/renderer';
export function posterPrefill(data: Snapshot, source?: string, id?: string) {
  const type = source === 'wanted' ? ('WANTED' as const) : ('SALE' as const);
  const records =
    source === 'wanted'
      ? data.wanted
          .filter((w) => ['WANTED', 'PARTIAL'].includes(w.status) && (!id || w.id === id))
          .map((w) => ({
            productId: w.productId,
            quantity: w.wantedQuantity - w.fulfilledQuantity,
            price: w.targetPrice ?? '',
            note: w.notes,
          }))
      : source === 'listings'
        ? data.listings
            .filter((l) => l.status === 'ACTIVE' && (!id || l.id === id))
            .map((l) => ({
              productId: l.inventory.productId,
              quantity: l.remainingQuantity,
              price: l.unitPrice,
              note: l.notes,
            }))
        : [];
  const items: PosterItemData[] = [];
  const assets: Record<string, string> = {};
  for (const record of records) {
    if (record.quantity <= 0) continue;
    const product = data.products.find((p) => p.id === record.productId);
    if (!product) continue;
    items.push({ ...record, name: product.name });
    const asset =
      product.selectedSource === 'ENHANCED' && product.enhancedId
        ? product.enhancedId
        : product.originalId;
    if (asset) assets[product.id] = asset;
  }
  return { type, items, assets, title: type === 'WANTED' ? '收一些心动收藏' : '出一些心动收藏' };
}
