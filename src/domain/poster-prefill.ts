import type { Snapshot } from '@/components/types';
import type { PosterItemData } from '@/poster/renderer';

export function posterPrefill(data: Snapshot, source?: string, id?: string) {
  const type = source === 'wanted' ? ('WANTED' as const) : ('SALE' as const);
  const records =
    source === 'wanted'
      ? data.wanted
          .filter(
            (wanted) => ['WANTED', 'PARTIAL'].includes(wanted.status) && (!id || wanted.id === id),
          )
          .map((wanted) => ({
            productId: wanted.productId,
            quantity: wanted.wantedQuantity - wanted.fulfilledQuantity,
            price: wanted.targetPrice ?? '',
            note: wanted.notes,
          }))
      : source === 'listings'
        ? data.listings
            .filter((listing) => listing.status === 'ACTIVE' && (!id || listing.id === id))
            .map((listing) => ({
              productId: listing.inventory.productId,
              quantity: listing.remainingQuantity,
              price: listing.unitPrice,
              note: listing.notes,
            }))
        : [];

  const productMap = new Map(data.products.map((product) => [product.id, product]));
  const items: PosterItemData[] = [];
  const assets: Record<string, string> = {};

  for (const record of records) {
    if (record.quantity <= 0) continue;
    const product = productMap.get(record.productId);
    if (!product) continue;
    const exportAssetId =
      product.selectedSource === 'ENHANCED' && product.enhancedId
        ? product.enhancedId
        : product.originalId;
    items.push({
      ...record,
      name: product.name,
      previewAssetId: product.thumbnailId || product.originalId || undefined,
      exportAssetId: exportAssetId || undefined,
    });
    if (exportAssetId) assets[product.id] = exportAssetId;
  }

  return {
    type,
    items,
    assets,
    title: type === 'WANTED' ? '收一些心动收藏' : '出一些心动收藏',
  };
}
