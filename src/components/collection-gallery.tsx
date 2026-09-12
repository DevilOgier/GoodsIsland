'use client';
import { useState } from 'react';
import Link from 'next/link';
import { Images, List, ImageIcon } from 'lucide-react';
import type { Product } from './types';
import ProductArt from './product-art';
import { EmptyState } from './ui';
export type GalleryItem = {
  id: string;
  product: Product;
  badge?: string;
  summary: React.ReactNode;
  actions?: React.ReactNode;
  details?: React.ReactNode;
  quantity?: number;
  onOpen?: () => void;
};
export default function CollectionGallery({
  items,
  heading = '收藏一览',
  extra,
  totalCount,
  defaultMode = 'album',
  showImages = true,
}: {
  items: GalleryItem[];
  heading?: string;
  extra?: React.ReactNode;
  totalCount?: number;
  defaultMode?: 'album' | 'list';
  showImages?: boolean;
}) {
  const [mode, setMode] = useState<'album' | 'list'>(defaultMode);
  return (
    <section className="collection-gallery">
      <div className="gallery-heading">
        <span>
          {heading} · {totalCount ?? items.length} 项
        </span>
        <div className="gallery-tools">
          {extra}
          <div className="view-switch" aria-label="展示方式">
            <button
              aria-label="收藏册模式"
              aria-pressed={mode === 'album'}
              className={mode === 'album' ? 'selected' : ''}
              onClick={() => setMode('album')}
            >
              <Images size={16} />
              <span>收藏册</span>
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
        <EmptyState
          icon={<ImageIcon />}
          title="这里暂时没有谷子"
          description="可以调整筛选，或添加新的收藏。"
        />
      ) : (
        <div className={'collection-items ' + mode}>
          {items.map((item) => (
            <article
              key={item.id}
              className={'collection-item' + (showImages ? '' : ' collection-item--no-image')}
            >
              {showImages &&
                (item.onOpen ? (
                  <button
                    type="button"
                    className="gallery-image gallery-open-button"
                    onClick={item.onOpen}
                  >
                    <ProductArt product={item.product} />
                    {item.badge && <span className="gallery-badge">{item.badge}</span>}
                  </button>
                ) : (
                  <Link className="gallery-image" href={'/products/' + item.product.id}>
                    <ProductArt product={item.product} />
                    {item.badge && <span className="gallery-badge">{item.badge}</span>}
                  </Link>
                ))}
              <div className="gallery-info">
                <small>
                  {item.product.series.character.name} · {item.product.series.name}
                </small>
                {item.onOpen ? (
                  <button
                    type="button"
                    className="gallery-name gallery-open-name"
                    onClick={item.onOpen}
                  >
                    {item.product.name}
                  </button>
                ) : (
                  <Link className="gallery-name" href={'/products/' + item.product.id}>
                    {item.product.name}
                  </Link>
                )}
                {!showImages && item.badge && <span className="pill">{item.badge}</span>}
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
