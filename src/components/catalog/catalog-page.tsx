'use client';

import { Flower2, Plus } from 'lucide-react';
import CatalogBrowser from '../catalog-browser';
import type { Product } from '../types';
import { EmptyState } from '../ui';

type CatalogPageProps = {
  products: Product[];
  quantityFor: (productId: string) => number;
  onPurchase: (productId: string) => void;
  onAddProduct: () => void;
  canEdit: boolean;
  onEditProduct: (productId: string) => void;
};

export default function CatalogPage({
  products,
  quantityFor,
  onPurchase,
  onAddProduct,
  canEdit,
  onEditProduct,
}: CatalogPageProps) {
  return (
    <>
      <div className="page-intro">
        <span className="eyebrow">THE COLLECTION ENCYCLOPEDIA</span>
        <h1>谷子图鉴 📖</h1>
        <p>收录每一份心动的谷子。</p>
      </div>
      {products.length ? (
        <CatalogBrowser
          heading="谷子图鉴"
          items={products.map((product) => ({
            id: product.id,
            product,
            badge: product.typeDefinition.name,
            summary: (
              <strong>
                {quantityFor(product.id) ? `拥有 ×${quantityFor(product.id)}` : '未拥有'}
              </strong>
            ),
            actions: (
              <>
                <button className="small-btn" onClick={() => onPurchase(product.id)}>
                  记录买入
                </button>
                {canEdit && (
                  <button className="small-btn" onClick={() => onEditProduct(product.id)}>
                    {product.releaseDate ? '编辑图鉴' : '补录时间'}
                  </button>
                )}
              </>
            ),
            details: (
              <small className={product.releaseDate ? 'catalog-date' : 'catalog-date is-missing'}>
                {product.releaseDate
                  ? `发售于 ${product.releaseDate.slice(0, 10)}`
                  : '发售时间待补录'}
              </small>
            ),
            quantity: quantityFor(product.id),
          }))}
        />
      ) : (
        <EmptyState
          icon={<Flower2 size={34} strokeWidth={1.2} />}
          title="这里还没有谷子"
          description="慢慢来，把每一份喜欢放进这里。"
          action={
            <button className="primary" onClick={onAddProduct}>
              添加商品 <Plus size={16} />
            </button>
          }
        />
      )}
    </>
  );
}
