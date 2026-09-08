'use client';
import { useState } from 'react';
import Link from 'next/link';
import { LayoutGrid, List, ImageIcon } from 'lucide-react';
import type { Product } from './types';
import ProductArt from './product-art';
export type GalleryItem = {
  id: string;
  product: Product;
  badge?: string;
  summary: React.ReactNode;
  actions?: React.ReactNode;
  details?: React.ReactNode;
};
export default function CollectionGallery({
  items,
  heading = '收藏一览',
  extra,
}: {
  items: GalleryItem[];
  heading?: string;
  extra?: React.ReactNode;
}) {
  const [mode, setMode] = useState<'grid' | 'list'>('grid');
  return (
    <section className="collection-gallery">
      <div className="gallery-heading">
        <span>
          {heading} · {items.length} 项
        </span>
        <div className="gallery-tools">
          {extra}
          <div className="view-switch" aria-label="展示方式">
            <button
              aria-label="图卡模式"
              aria-pressed={mode === 'grid'}
              className={mode === 'grid' ? 'selected' : ''}
              onClick={() => setMode('grid')}
            >
              <LayoutGrid size={16} />
              <span>图卡</span>
            </button>
            <button
              aria-label="列表模式"
              aria-pressed={mode === 'list'}
              className={mode === 'list' ? 'selected' : ''}
              onClick={() => setMode('list')}
            >
              <List size={16} />
              <span>列表</span>
            </button>
          </div>
        </div>
      </div>
      {!items.length ? (
        <div className="empty">
          <ImageIcon />
          <h3>这里暂时没有谷子</h3>
          <p>可以调整筛选，或添加新的收藏。</p>
        </div>
      ) : (
        <div className={'collection-items ' + mode}>
          {items.map((item) => (
            <article key={item.id} className="collection-item">
              <Link className="gallery-image" href={'/products/' + item.product.id}>
                <ProductArt product={item.product} />
                {item.badge && <span className="gallery-badge">{item.badge}</span>}
              </Link>
              <div className="gallery-info">
                <small>
                  {item.product.series.character.name} · {item.product.series.name}
                </small>
                <Link className="gallery-name" href={'/products/' + item.product.id}>
                  {item.product.name}
                </Link>
                <div className="gallery-summary">{item.summary}</div>
                <div className="gallery-actions">{item.actions}</div>
                {item.details}
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
