import type { Snapshot } from '@/components/types';

type Product = Snapshot['products'][number];
type Inventory = Snapshot['inventory'][number];
type Purchase = Snapshot['purchases'][number];
type Sale = Snapshot['sales'][number];
type Wanted = Snapshot['wanted'][number];
type Character = Snapshot['characters'][number];
type Series = Snapshot['series'][number];

function addToGroup<T>(map: Map<string, T[]>, key: string, value: T) {
  const group = map.get(key);
  if (group) group.push(value);
  else map.set(key, [value]);
}

function addQuantity(map: Map<string, number>, key: string, quantity: number) {
  map.set(key, (map.get(key) ?? 0) + quantity);
}

export type SnapshotIndex = ReturnType<typeof buildSnapshotIndex>;

export function buildSnapshotIndex(data: Snapshot) {
  const productById = new Map<string, Product>();
  const characterById = new Map<string, Character>();
  const seriesById = new Map<string, Series>();
  const inventoryByProductId = new Map<string, Inventory>();
  const purchasesByProductId = new Map<string, Purchase[]>();
  const salesByProductId = new Map<string, Sale[]>();
  const wantedByProductId = new Map<string, Wanted[]>();
  const pendingPurchaseQuantityByProductId = new Map<string, number>();
  const transitQuantityByProductId = new Map<string, number>();
  const activeListingQuantityByProductId = new Map<string, number>();

  for (const product of data.products) productById.set(product.id, product);
  for (const character of data.characters) characterById.set(character.id, character);
  for (const series of data.series) seriesById.set(series.id, series);
  for (const inventory of data.inventory) inventoryByProductId.set(inventory.productId, inventory);
  for (const purchase of data.purchases) {
    addToGroup(purchasesByProductId, purchase.productId, purchase);
    if (purchase.arrivalStatus === 'PENDING')
      addQuantity(pendingPurchaseQuantityByProductId, purchase.productId, purchase.quantity);
    if (purchase.arrivalStatus === 'SHIPPED')
      addQuantity(transitQuantityByProductId, purchase.productId, purchase.quantity);
  }
  for (const sale of data.sales) addToGroup(salesByProductId, sale.productId, sale);
  for (const wanted of data.wanted) addToGroup(wantedByProductId, wanted.productId, wanted);
  for (const listing of data.listings) {
    if (listing.status !== 'ACTIVE') continue;
    addQuantity(
      activeListingQuantityByProductId,
      listing.inventory.productId,
      listing.remainingQuantity,
    );
  }

  const pendingQuantity = (productId: string) =>
    pendingPurchaseQuantityByProductId.get(productId) ?? 0;
  const transitQuantity = (productId: string) => transitQuantityByProductId.get(productId) ?? 0;

  return {
    productById,
    characterById,
    seriesById,
    inventoryByProductId,
    purchasesByProductId,
    salesByProductId,
    wantedByProductId,
    pendingPurchaseQuantityByProductId,
    transitQuantityByProductId,
    activeListingQuantityByProductId,
    pendingQuantity,
    transitQuantity,
    awaitingArrivalQuantity: (productId: string) =>
      pendingQuantity(productId) + transitQuantity(productId),
    activeListingQuantity: (productId: string) =>
      activeListingQuantityByProductId.get(productId) ?? 0,
  };
}
