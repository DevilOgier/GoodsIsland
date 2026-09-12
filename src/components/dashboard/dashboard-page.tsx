'use client';

import Link from 'next/link';
import {
  Archive,
  ArrowDownLeft,
  ArrowRight,
  ArrowUpRight,
  BookOpen,
  Flower2,
  Heart,
  Package,
  Palette,
  Plus,
} from 'lucide-react';
import { accounting, fixed, localDate } from '@/domain/accounting';
import type { SnapshotIndex } from '@/lib/snapshot-index';
import type { Snapshot } from '../types';
import { price } from '../types';
import ProductArt from '../product-art';
import { EmptyState } from '../ui';

type DashboardPageProps = {
  data: Snapshot;
  index: SnapshotIndex;
  userName: string;
  onPurchase: (productId?: string) => void;
  onInventoryStatus: (status: string) => void;
};

export default function DashboardPage({
  data,
  index,
  userName,
  onPurchase,
  onInventoryStatus,
}: DashboardPageProps) {
  const currentMonth = localDate(new Date().toISOString()).slice(0, 7);
  const monthAccounting = accounting(data, { month: currentMonth });
  const inventoryQuantity = data.inventory.reduce((sum, item) => sum + item.currentQuantity, 0);
  const awaitingQuantity = data.purchases
    .filter((purchase) => ['PENDING', 'SHIPPED'].includes(purchase.arrivalStatus))
    .reduce((sum, purchase) => sum + purchase.quantity, 0);
  const pendingGroupItems = data.groups
    .flatMap((group) => group.items)
    .filter(
      (item) =>
        item.dispatchStatus === 'NOT_DISPATCHED' && item.purchase?.arrivalStatus !== 'CANCELLED',
    ).length;
  const ownedProducts = data.products
    .filter((product) => (index.inventoryByProductId.get(product.id)?.currentQuantity ?? 0) > 0)
    .slice(0, 4);
  const stats = [
    {
      icon: Archive,
      label: '在手谷子',
      value: inventoryQuantity,
      unit: '件喜欢',
      href: '/inventory?status=stock',
      status: 'stock',
    },
    {
      icon: BookOpen,
      label: '本月支出',
      value: `¥${fixed(monthAccounting.expense)}`,
      unit: `${currentMonth.replace('-', ' 年 ')} 月`,
      href: '/accounting',
      status: '',
    },
    {
      icon: Package,
      label: '等待到货',
      value: awaitingQuantity,
      unit: '件待到货',
      href: '/purchases?status=IN_TRANSIT',
      status: 'IN_TRANSIT',
    },
    {
      icon: Heart,
      label: '拼团待处理',
      value: pendingGroupItems,
      unit: '项待跟进',
      href: '/groups',
      status: '',
    },
  ];

  return (
    <>
      <section className="hero">
        <div>
          <span className="eyebrow">MY LITTLE COLLECTION ISLAND</span>
          <h1>你好，{userName} 🌷</h1>
          <p>
            继续收集喜欢的吧。
            <br />
            在谷屿，小小的谷子也能拼成闪闪发光的日常。
          </p>
          <button className="primary" onClick={() => onPurchase()}>
            收藏新的喜欢 <Plus size={17} />
          </button>
        </div>
        <div className="hero-art">
          <div className="paper-note">
            little things,
            <br />
            <i>big happiness.</i>
            <Flower2 size={36} />
          </div>
          <div className="hero-badge">
            <Flower2 size={86} strokeWidth={1} />
            <span>MY FAVORITES</span>
          </div>
          <span className="sparkle one">✧</span>
          <span className="sparkle two">✦</span>
          <span className="hero-caption">YOUR COLLECTION, YOUR STORY.</span>
        </div>
      </section>

      <div className="stats">
        {stats.map(({ icon: Icon, label, value, unit, href, status }, position) => (
          <Link
            className="stat stat-link"
            key={label}
            href={href}
            onClick={() => onInventoryStatus(status)}
            aria-label={`查看${label}`}
          >
            <span className={`stat-icon tone-${position}`}>
              <Icon size={20} />
            </span>
            <div>
              <small>{label}</small>
              <strong>
                {value} <span>{unit}</span>
              </strong>
            </div>
            <ArrowRight className="stat-arrow" size={15} />
          </Link>
        ))}
      </div>

      <section className="section-heading">
        <div>
          <span className="eyebrow">ON YOUR SHELF</span>
          <h2>
            收藏柜的一角{' '}
            <span>{data.inventory.filter((item) => item.currentQuantity > 0).length}</span>
          </h2>
        </div>
        <Link href="/inventory">
          查看全部 <ArrowRight size={16} />
        </Link>
      </section>

      {ownedProducts.length ? (
        <div className="product-grid">
          {ownedProducts.map((product) => {
            const inventory = index.inventoryByProductId.get(product.id);
            return (
              <article className="product-card" key={product.id}>
                <Link href={`/products/${product.id}`}>
                  <ProductArt product={product} />
                </Link>
                <div className="card-info">
                  <span className="card-kicker">
                    {product.series.character.name} <span> / </span> {product.series.name}
                  </span>
                  <Link className="card-title" href={`/products/${product.id}`}>
                    {product.name}
                  </Link>
                  <div className="card-bottom">
                    <span className="type-tag">{product.typeDefinition.name}</span>
                    <span className="stock">
                      {inventory?.currentQuantity ?? 0}
                      <small> 件在手</small>
                    </span>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      ) : (
        <EmptyState
          icon={<Flower2 size={34} strokeWidth={1.2} />}
          title="收藏柜等着第一份喜欢"
          description="慢慢来，把每一份喜欢放进这里。"
          action={
            <button className="primary" onClick={() => onPurchase()}>
              记录买入 <Plus size={16} />
            </button>
          }
        />
      )}

      <div className="dashboard-bottom">
        <section className="mini-panel">
          <h3>
            <ArrowDownLeft size={18} /> 最近买入
          </h3>
          {data.purchases.slice(0, 3).map((purchase) => (
            <div className="mini-row" key={purchase.id}>
              <span>{index.productById.get(purchase.productId)?.name}</span>
              <strong>{price(purchase.actualCost)}</strong>
            </div>
          ))}
          {!data.purchases.length && <p className="muted">每一次心动，都值得被记录。</p>}
        </section>
        <section className="mini-panel">
          <h3>
            <ArrowUpRight size={18} /> 最近卖出
          </h3>
          {data.sales.slice(0, 3).map((sale) => (
            <div className="mini-row" key={sale.id}>
              <span>{index.productById.get(sale.productId)?.name}</span>
              <strong>{price(sale.totalAmount)}</strong>
            </div>
          ))}
          {!data.sales.length && <p className="muted">让喜欢在新的收藏柜里延续。</p>}
        </section>
        <Link href="/posters" className="workshop-promo">
          <Palette size={27} />
          <h3>给喜欢做一张海报</h3>
          <p>收物 / 出物 · 四款手帐模板</p>
          <span>
            去海报工坊 <ArrowUpRight size={16} />
          </span>
        </Link>
      </div>

      <div className="dashboard-poster-links">
        <Link href="/wanted?status=ACTIVE">逛逛收物心愿 →</Link>
        <Link href="/posters?source=wanted">生成我的收物图 →</Link>
        <Link href="/listings?status=ACTIVE">查看正在出物 →</Link>
        <Link href="/posters?source=listings">生成我的出物图 →</Link>
      </div>
      <div className="summary-strip">
        待排发 {pendingGroupItems} 项 <span>·</span> 正在出物{' '}
        {data.listings
          .filter((listing) => listing.status === 'ACTIVE')
          .reduce((sum, listing) => sum + listing.remainingQuantity, 0)}{' '}
        件 <span>·</span> 当前库存成本{' '}
        {price(data.inventory.reduce((sum, item) => sum + Number(item.currentCost), 0))}
      </div>
    </>
  );
}
