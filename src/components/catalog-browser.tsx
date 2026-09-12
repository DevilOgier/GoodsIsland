'use client';
import { useMemo, useState } from 'react';
import { Boxes, ChevronLeft, Layers3, PackageOpen, Shapes } from 'lucide-react';
import CollectionGallery, { type GalleryItem } from './collection-gallery';
import ProductArt from './product-art';
import { SeriesCollage } from './product-picker';

type Granularity = 'all' | 'type' | 'series';

function stableSelection(items: GalleryItem[], key: string) {
  const score = (value: string) =>
    [...value].reduce((sum, character) => (sum * 31 + character.codePointAt(0)!) >>> 0, 7);
  return [...items].sort((left, right) => score(left.id + key) - score(right.id + key)).slice(0, 4);
}

export default function CatalogBrowser({
  items,
  heading,
  inventory = false,
}: {
  items: GalleryItem[];
  heading: string;
  inventory?: boolean;
}) {
  const [granularity, setGranularity] = useState<Granularity>('type');
  const [selected, setSelected] = useState('');
  const [page, setPage] = useState(1);
  const groups = useMemo(() => {
    if (granularity === 'type') {
      const map = new Map<string, GalleryItem[]>();
      for (const item of items) {
        const key = item.product.productType;
        map.set(key, [...(map.get(key) ?? []), item]);
      }
      return [...map.entries()]
        .map(([key, values]) => ({
          key,
          label: values[0].product.typeDefinition.name,
          caption: `${values.length} 种周边`,
          items: values,
        }))
        .sort((left, right) => left.label.localeCompare(right.label, 'zh-CN'));
    }
    if (granularity === 'series') {
      const map = new Map<string, GalleryItem[]>();
      for (const item of items) {
        const key = item.product.seriesId;
        map.set(key, [...(map.get(key) ?? []), item]);
      }
      return [...map.entries()]
        .map(([key, values]) => ({
          key,
          label: values[0].product.series.name,
          caption: `${values[0].product.series.character.name} · ${values.length} 种周边`,
          items: values,
        }))
        .sort((left, right) => left.label.localeCompare(right.label, 'zh-CN'));
    }
    return [];
  }, [granularity, items]);
  const chosen = groups.find((group) => group.key === selected);
  const visible = chosen?.items ?? items;
  const paged = visible.slice((page - 1) * 24, page * 24);
  const pages = Math.max(1, Math.ceil(visible.length / 24));
  const chooseGranularity = (next: Granularity) => {
    setGranularity(next);
    setSelected('');
    setPage(1);
  };
  const pagination = visible.length > 24 && (
    <div className="pagination">
      <button disabled={page === 1} onClick={() => setPage((value) => value - 1)}>
        上一页
      </button>
      <span>
        {page} / {pages}
      </span>
      <button disabled={page === pages} onClick={() => setPage((value) => value + 1)}>
        下一页
      </button>
    </div>
  );
  return (
    <section className="catalog-browser">
      <div className="catalog-granularity" aria-label="图鉴浏览粒度">
        {(
          [
            ['all', '全部周边', Boxes],
            ['type', '周边类型', Shapes],
            ['series', '周边系列', Layers3],
          ] as const
        ).map(([key, label, Icon]) => (
          <button
            key={key}
            className={granularity === key ? 'selected' : ''}
            aria-pressed={granularity === key}
            onClick={() => chooseGranularity(key)}
          >
            <Icon size={17} /> {label}
          </button>
        ))}
      </div>
      {granularity === 'all' || chosen ? (
        <>
          {chosen && (
            <button
              className="catalog-back"
              onClick={() => {
                setSelected('');
                setPage(1);
              }}
            >
              <ChevronLeft size={17} /> 返回{granularity === 'type' ? '类型' : '系列'}一览
            </button>
          )}
          <CollectionGallery
            heading={chosen ? `${chosen.label} · ${inventory ? '我的收藏' : '图鉴'}` : heading}
            items={paged}
            totalCount={visible.length}
          />
          {pagination}
        </>
      ) : granularity === 'type' ? (
        <div className="catalog-type-list">
          {groups.map((group) => {
            const quantity = group.items.reduce((sum, item) => sum + (item.quantity ?? 0), 0);
            return (
              <button
                key={group.key}
                onClick={() => {
                  setSelected(group.key);
                  setPage(1);
                }}
              >
                <ProductArt product={stableSelection(group.items, group.key)[0].product} />
                <span>
                  <small>MERCH TYPE</small>
                  <strong>{group.label}</strong>
                  <em>
                    {group.caption}
                    {inventory ? ` · 共 ${quantity} 件在手` : ''}
                  </em>
                </span>
                <PackageOpen size={22} />
              </button>
            );
          })}
        </div>
      ) : (
        <div className="catalog-series-grid">
          {groups.map((group) => {
            const covers = stableSelection(group.items, group.key);
            const quantity = group.items.reduce((sum, item) => sum + (item.quantity ?? 0), 0);
            return (
              <button
                key={group.key}
                onClick={() => {
                  setSelected(group.key);
                  setPage(1);
                }}
              >
                <SeriesCollage products={covers.map((item) => item.product)} />
                <span>
                  <small>{group.caption}</small>
                  <strong>{group.label}</strong>
                  <em>
                    {new Set(group.items.map((item) => item.product.productType)).size} 个类型
                    {inventory ? ` · 共 ${quantity} 件在手` : ''}
                  </em>
                </span>
              </button>
            );
          })}
        </div>
      )}
    </section>
  );
}
