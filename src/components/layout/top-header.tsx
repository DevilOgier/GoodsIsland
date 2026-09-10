'use client';
import { useMemo, useState } from 'react';
import Link from 'next/link';
import { BookOpen, Boxes, Flower2, Plus, Search, UserRound, X } from 'lucide-react';
import type { Product, Snapshot } from '@/components/types';

type Result = {
  id: string;
  label: string;
  meta: string;
  href: string;
  kind: '商品' | '角色' | '系列';
};

export function TopHeader({
  section,
  user,
  products,
  characters,
  series,
  onQuickOpen,
}: {
  section: string;
  user: { name: string };
  products: Product[];
  characters: Snapshot['characters'];
  series: Snapshot['series'];
  onQuickOpen: () => void;
}) {
  const [query, setQuery] = useState('');
  const [focused, setFocused] = useState(false);
  const results = useMemo(() => {
    const q = query.trim().toLocaleLowerCase('zh-CN');
    if (!q) return [];
    const productResults: Result[] = products
      .filter((product) =>
        (product.name + product.series.name + product.series.character.name)
          .toLocaleLowerCase('zh-CN')
          .includes(q),
      )
      .slice(0, 5)
      .map((product) => ({
        id: product.id,
        label: product.name,
        meta: `${product.series.character.name} · ${product.series.name}`,
        href: `/products/${product.id}`,
        kind: '商品',
      }));
    const characterResults: Result[] = characters
      .filter((character) => character.name.toLocaleLowerCase('zh-CN').includes(q))
      .slice(0, 3)
      .map((character) => ({
        id: character.id,
        label: character.name,
        meta: '角色',
        href: `/products?character=${character.id}`,
        kind: '角色',
      }));
    const seriesResults: Result[] = series
      .filter((item) => item.name.toLocaleLowerCase('zh-CN').includes(q))
      .slice(0, 3)
      .map((item) => ({
        id: item.id,
        label: item.name,
        meta: '系列',
        href: `/products?series=${item.id}`,
        kind: '系列',
      }));
    return [...productResults, ...characterResults, ...seriesResults].slice(0, 8);
  }, [characters, products, query, series]);
  return (
    <header className="app-topbar">
      <div className="app-topbar__title">
        <span className="app-topbar__mobile-brand">
          <Flower2 size={19} /> 谷屿
        </span>
        <span className="app-topbar__eyebrow">我的收藏生活</span>
        <strong>{section}</strong>
      </div>
      <div className="app-global-search">
        <Search size={17} />
        <input
          aria-label="全局搜索"
          placeholder="搜索商品、角色、系列…"
          value={query}
          onFocus={() => setFocused(true)}
          onBlur={() => window.setTimeout(() => setFocused(false), 120)}
          onChange={(event) => setQuery(event.target.value)}
        />
        {query && (
          <button type="button" aria-label="清空全局搜索" onClick={() => setQuery('')}>
            <X size={15} />
          </button>
        )}
        {focused && query && (
          <div className="app-search-results">
            {results.map((result) => (
              <a key={result.kind + result.id} href={result.href} onClick={() => setQuery('')}>
                <span>
                  {result.kind === '商品' ? (
                    <Boxes size={16} />
                  ) : result.kind === '系列' ? (
                    <BookOpen size={16} />
                  ) : (
                    <UserRound size={16} />
                  )}
                </span>
                <span>
                  <strong>{result.label}</strong>
                  <small>{result.meta}</small>
                </span>
                <em>{result.kind}</em>
              </a>
            ))}
            {!results.length && <p>没有找到匹配的收藏内容</p>}
          </div>
        )}
      </div>
      <button
        className="app-quick-button"
        type="button"
        aria-label="快速记录"
        onClick={onQuickOpen}
      >
        <Plus size={18} />
        <span>快速记录</span>
      </button>
      <Link className="app-topbar__profile" href="/me">
        <span className="app-avatar">{user.name.slice(0, 1)}</span>
        <strong>{user.name}</strong>
      </Link>
    </header>
  );
}
