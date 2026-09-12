'use client';

import { useMemo, useState } from 'react';
import { ArrowLeft, Check, ChevronLeft, ChevronRight, Search, X } from 'lucide-react';
import type { Product, Snapshot } from './types';
import ProductArt from './product-art';

const PAGE_SIZE = 32;

export function selectSeriesPreviewProducts(products: Product[]) {
  if (products.length <= 4) return products;
  const last = products.length - 1;
  return [0, Math.floor(last / 3), Math.floor((last * 2) / 3), last].map(
    (index) => products[index],
  );
}

export function SeriesCollage({ products }: { products: Product[] }) {
  const previewProducts = selectSeriesPreviewProducts(products);
  return (
    <div
      className="series-collage"
      style={{ gridTemplateColumns: `repeat(${previewProducts.length === 1 ? 1 : 2}, 1fr)` }}
    >
      {previewProducts.map((product) => (
        <div key={product.id}>
          <ProductArt product={product} purpose="thumbnail" />
        </div>
      ))}
    </div>
  );
}

export default function ProductPicker({
  data,
  onSelect,
  onClose,
  allowedIds,
  selectedId,
}: {
  data: Snapshot;
  onSelect: (product: Product) => void;
  onClose: () => void;
  allowedIds?: string[];
  selectedId?: string;
}) {
  const [ip, setIp] = useState('');
  const [character, setCharacter] = useState('');
  const [query, setQuery] = useState('');
  const [seriesId, setSeries] = useState('');
  const [page, setPage] = useState(1);

  const groups = useMemo(() => {
    const allowed = allowedIds ? new Set(allowedIds) : null;
    const bySeries = new Map<string, Product[]>();
    const normalizedQuery = query.trim().toLocaleLowerCase('zh-CN');

    for (const product of data.products) {
      if (product.status !== 'ACTIVE' || (allowed && !allowed.has(product.id))) continue;
      if (ip && product.series.character.ipId !== ip) continue;
      if (character && product.series.characterId !== character) continue;
      const searchable = `${product.name}${product.series.name}${product.series.character.name}`;
      if (normalizedQuery && !searchable.toLocaleLowerCase('zh-CN').includes(normalizedQuery))
        continue;
      const products = bySeries.get(product.seriesId);
      if (products) products.push(product);
      else bySeries.set(product.seriesId, [product]);
    }

    return data.series.flatMap((series) => {
      const products = bySeries.get(series.id);
      return products?.length ? [{ series, products }] : [];
    });
  }, [allowedIds, character, data.products, data.series, ip, query]);

  const current = groups.find((group) => group.series.id === seriesId);
  const pageCount = current ? Math.max(1, Math.ceil(current.products.length / PAGE_SIZE)) : 1;
  const visibleProducts = current
    ? current.products.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)
    : [];

  function resetSeries() {
    setSeries('');
    setPage(1);
  }

  return (
    <div className="modal-backdrop picker-backdrop">
      <section
        className="modal product-picker"
        role="dialog"
        aria-modal="true"
        aria-label="从图鉴选择谷子"
      >
        <header>
          <div>
            <span className="eyebrow">CHOOSE A SERIES, FIND YOUR FAVORITE</span>
            <h2>{current ? current.series.name : '先看看喜欢的系列'}</h2>
            <p>选择系列，再确认你买到了哪种谷子。</p>
          </div>
          <button type="button" className="icon-btn" aria-label="关闭选品" onClick={onClose}>
            <X />
          </button>
        </header>
        <div className="picker-filters">
          <label>
            IP
            <select
              aria-label="筛选 IP"
              value={ip}
              onChange={(event) => {
                setIp(event.target.value);
                setCharacter('');
                resetSeries();
              }}
            >
              <option value="">全部 IP</option>
              {data.ips.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}
                </option>
              ))}
            </select>
          </label>
          <label>
            角色
            <select
              aria-label="筛选角色"
              value={character}
              onChange={(event) => {
                setCharacter(event.target.value);
                resetSeries();
              }}
            >
              <option value="">全部角色</option>
              {data.characters
                .filter((item) => !ip || item.ipId === ip)
                .map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name}
                  </option>
                ))}
            </select>
          </label>
          <label className="picker-search">
            搜索
            <div>
              <Search size={16} />
              <input
                aria-label="搜索系列或商品"
                value={query}
                onChange={(event) => {
                  setQuery(event.target.value);
                  resetSeries();
                }}
                placeholder="系列、角色、商品名称"
              />
            </div>
          </label>
        </div>
        {current ? (
          <>
            <button type="button" className="back-link" onClick={resetSeries}>
              <ArrowLeft size={16} /> 返回所有系列
            </button>
            <div className="picker-product-grid">
              {visibleProducts.map((product) => (
                <button
                  type="button"
                  className={`picker-product ${selectedId === product.id ? 'selected' : ''}`}
                  key={product.id}
                  onClick={() => onSelect(product)}
                >
                  <ProductArt product={product} purpose="thumbnail" />
                  <div>
                    <strong>{product.typeDefinition.name}</strong>
                    <small>{product.name}</small>
                    <span>
                      选择这一款 <Check size={15} />
                    </span>
                  </div>
                </button>
              ))}
            </div>
            {pageCount > 1 && (
              <nav className="picker-pagination" aria-label="商品分页">
                <button
                  type="button"
                  disabled={page === 1}
                  onClick={() => setPage((value) => value - 1)}
                >
                  <ChevronLeft size={16} /> 上一页
                </button>
                <span>
                  {page} / {pageCount}
                </span>
                <button
                  type="button"
                  disabled={page === pageCount}
                  onClick={() => setPage((value) => value + 1)}
                >
                  下一页 <ChevronRight size={16} />
                </button>
              </nav>
            )}
          </>
        ) : (
          <div className="series-grid">
            {groups.map((group) => (
              <button
                type="button"
                className="series-tile"
                key={group.series.id}
                onClick={() => {
                  setSeries(group.series.id);
                  setPage(1);
                }}
              >
                <SeriesCollage products={group.products} />
                <div>
                  <small>{group.products[0].series.character.name}</small>
                  <strong>{group.series.name}</strong>
                  <span>
                    {group.products.length} 款谷子 ·{' '}
                    {Array.from(
                      new Set(group.products.map((product) => product.typeDefinition.name)),
                    ).join(' / ')}
                  </span>
                </div>
              </button>
            ))}
          </div>
        )}
        {!groups.length && <div className="empty">没有匹配的系列，试试其他筛选。</div>}
      </section>
    </div>
  );
}
