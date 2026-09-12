'use client';

import Link from 'next/link';
import { Flower2, Plus } from 'lucide-react';
import CatalogBrowser from '../catalog-browser';
import type { Product, Snapshot } from '../types';
import { price } from '../types';
import { EmptyState } from '../ui';

type InventoryPageProps = {
  data: Snapshot;
  products: Product[];
  quantityFor: (productId: string) => number;
  costFor: (productId: string) => number;
  awaitingFor: (productId: string) => number;
  listingFor: (productId: string) => number;
  onPurchase: (productId?: string) => void;
  onStatus: (status: string) => void;
};

export default function InventoryPage({
  data,
  products,
  quantityFor,
  costFor,
  awaitingFor,
  listingFor,
  onPurchase,
  onStatus,
}: InventoryPageProps) {
  return (
    <>
      <div className="page-intro">
        <span className="eyebrow">YOUR OWN LITTLE TREASURES</span>
        <h1>我的收藏柜 🌷</h1>
        <p>这些是我用热爱一点点收集起来的宝物。</p>
      </div>
      <div className="inventory-overview-stats">
        <Link href="/inventory?status=stock" onClick={() => onStatus('stock')}>
          <span>总库存件数</span>
          <strong>{data.inventory.reduce((sum, item) => sum + item.currentQuantity, 0)}</strong>
        </Link>
        <Link href="/purchases?status=ARRIVED" onClick={() => onStatus('ARRIVED')}>
          <span>已到货记录</span>
          <strong>
            {data.purchases
              .filter((item) => item.arrivalStatus === 'ARRIVED')
              .reduce((sum, item) => sum + item.quantity, 0)}
          </strong>
        </Link>
        <Link href="/inventory?status=IN_TRANSIT" onClick={() => onStatus('IN_TRANSIT')}>
          <span>等待到货</span>
          <strong>
            {data.purchases
              .filter((item) => ['PENDING', 'SHIPPED'].includes(item.arrivalStatus))
              .reduce((sum, item) => sum + item.quantity, 0)}
          </strong>
        </Link>
        <Link href="/accounting" onClick={() => onStatus('')}>
          <span>当前库存投入</span>
          <strong>
            {price(data.inventory.reduce((sum, item) => sum + Number(item.currentCost), 0))}
          </strong>
        </Link>
      </div>
      {products.length ? (
        <CatalogBrowser
          heading="我的收藏"
          inventory
          items={products.map((product) => {
            const quantity = quantityFor(product.id);
            return {
              id: product.id,
              product,
              badge: product.typeDefinition.name,
              summary: (
                <>
                  <strong>{quantity ? `拥有 ×${quantity}` : '未拥有'}</strong>
                  {awaitingFor(product.id) > 0 && (
                    <small>等待到货 ×{awaitingFor(product.id)}</small>
                  )}
                  <small>
                    均价 {price(quantity ? costFor(product.id) / quantity : 0)} · 挂出{' '}
                    {listingFor(product.id)} 件
                  </small>
                </>
              ),
              actions: (
                <button className="small-btn" onClick={() => onPurchase(product.id)}>
                  记录买入
                </button>
              ),
              quantity,
            };
          })}
        />
      ) : (
        <EmptyState
          icon={<Flower2 size={34} strokeWidth={1.2} />}
          title="这里还没有谷子"
          description="慢慢来，把每一份喜欢放进这里。"
          action={
            <button className="primary" onClick={() => onPurchase()}>
              记录买入 <Plus size={16} />
            </button>
          }
        />
      )}
    </>
  );
}
