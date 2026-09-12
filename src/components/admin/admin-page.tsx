'use client';

import { useMemo } from 'react';
import Link from 'next/link';
import { Flower2, Plus, Sparkles, Trash2, Upload } from 'lucide-react';
import ProductArt from '../product-art';
import type { Product, Snapshot } from '../types';
import { statusNames } from '../types';
import { EmptyState } from '../ui';

export type AdminTab = 'product' | 'ip' | 'character' | 'series' | 'productType' | 'tag';
type CatalogEntity = 'product' | 'ip' | 'character' | 'series' | 'tag' | 'productType';

export default function AdminPage({
  data,
  products,
  tab,
  imageBusy,
  onTabChange,
  onOpenForm,
  onImageAction,
  onUpload,
  onArchive,
  onRemove,
}: {
  data: Snapshot;
  products: Product[];
  tab: AdminTab;
  imageBusy: boolean;
  onTabChange: (tab: AdminTab) => void;
  onOpenForm: (type: string, id?: string) => void;
  onImageAction: (action: string, id: string, source?: string) => void;
  onUpload: (file: File, productId: string) => void;
  onArchive: (id: string, status: string) => void;
  onRemove: (entity: CatalogEntity, id: string, name: string) => void;
}) {
  const ipById = useMemo(() => new Map(data.ips.map((item) => [item.id, item])), [data.ips]);
  const characterById = useMemo(
    () => new Map(data.characters.map((item) => [item.id, item])),
    [data.characters],
  );
  const tabs: [AdminTab, string][] = [
    ['product', '商品'],
    ['ip', 'IP'],
    ['character', '角色'],
    ['series', '系列'],
    ['productType', '谷子类型'],
    ['tag', '标签'],
  ];
  const emptyState = (title: string, action?: React.ReactNode) => (
    <EmptyState
      icon={<Flower2 size={34} strokeWidth={1.2} />}
      title={title}
      description="慢慢来，把每一份喜欢放进这里。"
      action={action}
    />
  );

  return (
    <>
      <div className="page-intro">
        <span className="eyebrow">CURATE YOUR ENCYCLOPEDIA</span>
        <h1>整理图鉴里的喜欢</h1>
        <p>上传商品图、维护系列和类型，名称会自动组合。</p>
        <div className="button-row">
          <button className="small-btn" onClick={() => onOpenForm('product')}>
            添加商品
          </button>
          <button className="small-btn" onClick={() => onOpenForm('productType')}>
            新增谷子类型
          </button>
          <button className="small-btn" onClick={() => onOpenForm('entity')}>
            添加 IP / 角色 / 系列 / 标签
          </button>
        </div>
      </div>
      <nav className="admin-tabs" aria-label="图鉴管理分类">
        {tabs.map(([key, label]) => (
          <button
            key={key}
            type="button"
            aria-current={tab === key ? 'page' : undefined}
            onClick={() => onTabChange(key)}
          >
            {label}
          </button>
        ))}
      </nav>

      <div className="record-list admin-product-list" hidden={tab !== 'product'}>
        {products.map((product) => (
          <article className="record" key={product.id}>
            <Link href={`/products/${product.id}`} className="record-product">
              <ProductArt product={product} />
              <strong>{product.name}</strong>
            </Link>
            <span>
              {product.series.character.name} / {product.series.name}
            </span>
            <span className="pill">{product.status === 'ACTIVE' ? '展示中' : '已归档'}</span>
            <button className="small-btn" onClick={() => onOpenForm('productEdit', product.id)}>
              编辑
            </button>
            <div className="catalog-image-controls">
              <button
                className="small-btn"
                disabled={
                  imageBusy ||
                  !product.originalId ||
                  data.jobs.some(
                    (job) =>
                      job.productId === product.id && ['RUNNING', 'QUEUED'].includes(job.status),
                  )
                }
                onClick={() => onImageAction('enhance', product.id)}
              >
                <Sparkles size={14} /> 保真高清{data.provider === 'mock' ? '（模拟）' : ''}
              </button>
              <button
                className="small-btn"
                disabled={imageBusy || !product.originalId}
                onClick={() => onImageAction('select', product.id, 'ORIGINAL')}
              >
                使用原图
              </button>
              {product.enhancedId && (
                <button
                  className="small-btn"
                  disabled={imageBusy}
                  onClick={() => onImageAction('select', product.id, 'ENHANCED')}
                >
                  使用高清图
                </button>
              )}
              {data.jobs
                .filter((job) => job.productId === product.id)
                .slice(0, 1)
                .map((job) => (
                  <small key={job.id}>
                    {statusNames[job.status]} {job.error}
                    {job.status === 'FAILED' && (
                      <button onClick={() => onImageAction('retry', job.id)}>重试</button>
                    )}
                  </small>
                ))}
            </div>
            <label className="upload-button">
              <Upload size={16} /> {imageBusy ? '上传中…' : '上传图片'}
              <input
                aria-label={`上传图片 ${product.name}`}
                type="file"
                accept="image/png,image/jpeg,image/webp"
                disabled={imageBusy}
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  if (file) onUpload(file, product.id);
                  event.target.value = '';
                }}
              />
            </label>
            <button
              className="small-btn"
              onClick={() =>
                onArchive(product.id, product.status === 'ACTIVE' ? 'ARCHIVED' : 'ACTIVE')
              }
            >
              {product.status === 'ACTIVE' ? '归档' : '恢复'}
            </button>
            <button
              className="small-btn danger"
              aria-label={`删除商品 ${product.name}`}
              onClick={() => onRemove('product', product.id, product.name)}
            >
              <Trash2 size={14} /> 删除
            </button>
          </article>
        ))}
        {!products.length &&
          emptyState(
            '图鉴里还没有符合条件的谷子',
            <button className="primary" onClick={() => onOpenForm('product')}>
              添加第一款谷子 <Plus size={16} />
            </button>,
          )}
      </div>

      <section className="catalog-taxonomy" hidden={tab === 'product'}>
        <div className="section-heading">
          <div>
            <span className="eyebrow">CATALOG STRUCTURE</span>
            <h2>
              {tab === 'productType'
                ? '谷子类型管理'
                : tab === 'tag'
                  ? '标签管理'
                  : `${tab === 'ip' ? 'IP' : tab === 'character' ? '角色' : '系列'}管理`}
            </h2>
          </div>
          <p>删除 IP、角色或系列会同时删除其下没有图片和业务记录的图鉴内容。</p>
        </div>
        <div className="taxonomy-grid">
          <article hidden={tab !== 'ip'}>
            <h3>IP</h3>
            {data.ips.map((item) => (
              <TaxonomyRow
                key={item.id}
                label={item.name}
                ariaLabel={`删除 IP ${item.name}`}
                onRemove={() => onRemove('ip', item.id, item.name)}
              />
            ))}
            {!data.ips.length && <small className="muted">暂无 IP</small>}
          </article>
          <article hidden={tab !== 'character'}>
            <h3>角色</h3>
            {data.characters.map((item) => (
              <TaxonomyRow
                key={item.id}
                overline={ipById.get(item.ipId)?.name}
                label={item.name}
                ariaLabel={`删除角色 ${item.name}`}
                onRemove={() => onRemove('character', item.id, item.name)}
              />
            ))}
            {!data.characters.length && <small className="muted">暂无角色</small>}
          </article>
          <article hidden={tab !== 'series'}>
            <h3>系列</h3>
            {data.series.map((item) => (
              <TaxonomyRow
                key={item.id}
                overline={characterById.get(item.characterId)?.name}
                label={item.name}
                ariaLabel={`删除系列 ${item.name}`}
                onRemove={() => onRemove('series', item.id, item.name)}
              />
            ))}
            {!data.series.length && <small className="muted">暂无系列</small>}
          </article>
          <article hidden={!['productType', 'tag'].includes(tab)}>
            <h3>{tab === 'productType' ? '自定义谷子类型' : '标签'}</h3>
            {tab === 'productType' &&
              data.productTypes
                .filter((item) => item.key.startsWith('CUSTOM_'))
                .map((item) => (
                  <TaxonomyRow
                    key={item.key}
                    overline="类型"
                    label={item.name}
                    ariaLabel={`删除类型 ${item.name}`}
                    onRemove={() => onRemove('productType', item.key, item.name)}
                  />
                ))}
            {tab === 'tag' &&
              data.tags.map((item) => (
                <TaxonomyRow
                  key={item.id}
                  overline="标签"
                  label={item.name}
                  ariaLabel={`删除标签 ${item.name}`}
                  onRemove={() => onRemove('tag', item.id, item.name)}
                />
              ))}
            {tab === 'tag' && !data.tags.length && <small className="muted">暂无标签</small>}
            {tab === 'productType' &&
              !data.productTypes.some((item) => item.key.startsWith('CUSTOM_')) && (
                <small className="muted">暂无自定义谷子类型</small>
              )}
          </article>
        </div>
      </section>
    </>
  );
}

function TaxonomyRow({
  overline,
  label,
  ariaLabel,
  onRemove,
}: {
  overline?: string;
  label: string;
  ariaLabel: string;
  onRemove: () => void;
}) {
  return (
    <div className="taxonomy-row">
      <span>
        {overline && <small>{overline}</small>}
        {label}
      </span>
      <button className="small-btn danger" aria-label={ariaLabel} onClick={onRemove}>
        <Trash2 size={14} /> 删除
      </button>
    </div>
  );
}
