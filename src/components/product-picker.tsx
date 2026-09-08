'use client';
import { useState } from 'react';
import { ArrowLeft, Search, X, Check } from 'lucide-react';
import type { Snapshot, Product } from './types';
import ProductArt from './product-art';
export function SeriesCollage({ products }: { products: Product[] }) {
  return (
    <div
      className="series-collage"
      style={{
        gridTemplateColumns: 'repeat(' + Math.ceil(Math.sqrt(products.length || 1)) + ',1fr)',
      }}
    >
      {products.map((p) => (
        <div key={p.id}>
          <ProductArt product={p} />
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
  onSelect: (p: Product) => void;
  onClose: () => void;
  allowedIds?: string[];
  selectedId?: string;
}) {
  const [ip, setIp] = useState('');
  const [character, setCharacter] = useState('');
  const [q, setQ] = useState('');
  const [seriesId, setSeries] = useState('');
  const available = data.products.filter(
    (p) => p.status === 'ACTIVE' && (!allowedIds || allowedIds.includes(p.id)),
  );
  const filtered = available.filter(
    (p) =>
      (!ip || p.series.character.ipId === ip) &&
      (!character || p.series.characterId === character) &&
      (!q || (p.name + p.series.name + p.series.character.name).includes(q)),
  );
  const groups = data.series
    .map((series) => ({ series, products: filtered.filter((p) => p.seriesId === series.id) }))
    .filter((g) => g.products.length);
  const current = groups.find((g) => g.series.id === seriesId);
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
              onChange={(e) => {
                setIp(e.target.value);
                setCharacter('');
                setSeries('');
              }}
            >
              <option value="">全部 IP</option>
              {data.ips.map((i) => (
                <option key={i.id} value={i.id}>
                  {i.name}
                </option>
              ))}
            </select>
          </label>
          <label>
            角色
            <select
              aria-label="筛选角色"
              value={character}
              onChange={(e) => {
                setCharacter(e.target.value);
                setSeries('');
              }}
            >
              <option value="">全部角色</option>
              {data.characters
                .filter((c) => !ip || c.ipId === ip)
                .map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
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
                value={q}
                onChange={(e) => {
                  setQ(e.target.value);
                  setSeries('');
                }}
                placeholder="系列、角色、商品名称"
              />
            </div>
          </label>
        </div>
        {current ? (
          <>
            <button type="button" className="back-link" onClick={() => setSeries('')}>
              <ArrowLeft size={16} /> 返回所有系列
            </button>
            <div className="picker-product-grid">
              {current.products.map((p) => (
                <button
                  type="button"
                  className={'picker-product ' + (selectedId === p.id ? 'selected' : '')}
                  key={p.id}
                  onClick={() => onSelect(p)}
                >
                  <ProductArt product={p} />
                  <div>
                    <strong>{p.typeDefinition.name}</strong>
                    <small>{p.name}</small>
                    <span>
                      选择这一款 <Check size={15} />
                    </span>
                  </div>
                </button>
              ))}
            </div>
          </>
        ) : (
          <div className="series-grid">
            {groups.map((g) => (
              <button
                type="button"
                className="series-tile"
                key={g.series.id}
                onClick={() => setSeries(g.series.id)}
              >
                <SeriesCollage products={g.products} />
                <div>
                  <small>{g.products[0].series.character.name}</small>
                  <strong>{g.series.name}</strong>
                  <span>
                    {g.products.length} 款谷子 ·{' '}
                    {g.products.map((p) => p.typeDefinition.name).join(' / ')}
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
