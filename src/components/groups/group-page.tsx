'use client';

import Link from 'next/link';
import { ArrowRight, ChevronRight, Flower2, Package, Plus, Users } from 'lucide-react';
import type { Product, Snapshot } from '../types';
import { statusNames } from '../types';
import { EmptyState } from '../ui';

type GroupEntry = {
  group: Snapshot['groups'][number];
  item: Snapshot['groups'][number]['items'][number];
};

export default function GroupPage({
  data,
  groups,
  tasks,
  view,
  productFor,
  onCreate,
}: {
  data: Snapshot;
  groups: Snapshot['groups'];
  tasks: GroupEntry[];
  view: string;
  productFor: (productId: string) => Product | undefined;
  onCreate: () => void;
}) {
  const items = data.groups.flatMap((group) => group.items);
  return (
    <>
      <div className="page-intro">
        <span className="eyebrow">COLLECT TOGETHER</span>
        <h1>我的拼团 🌿</h1>
        <p>和同好一起拼，更快收获喜欢的谷子！</p>
      </div>
      <div className="group-overview-stats">
        <Link href="/groups?view=open" aria-current={view === 'open' ? 'page' : undefined}>
          <span>进行中</span>
          <strong>{data.groups.filter((group) => group.status === 'OPEN').length}</strong>
        </Link>
        <Link href="/groups?view=unpaid" aria-current={view === 'unpaid' ? 'page' : undefined}>
          <span>待付款</span>
          <strong>{items.filter((item) => item.paymentStatus === 'UNPAID').length}</strong>
        </Link>
        <Link href="/groups?view=transit" aria-current={view === 'transit' ? 'page' : undefined}>
          <span>待到货</span>
          <strong>
            {
              items.filter(
                (item) =>
                  item.purchase && !['ARRIVED', 'CANCELLED'].includes(item.purchase.arrivalStatus),
              ).length
            }
          </strong>
        </Link>
        <Link href="/groups?view=dispatch" aria-current={view === 'dispatch' ? 'page' : undefined}>
          <span>待排发</span>
          <strong>
            {
              items.filter(
                (item) =>
                  item.paymentStatus === 'PAID' &&
                  item.dispatchStatus === 'NOT_DISPATCHED' &&
                  item.purchase?.arrivalStatus !== 'CANCELLED' &&
                  Boolean(item.purchase),
              ).length
            }
          </strong>
        </Link>
      </div>
      {view && view !== 'open' && (
        <section className="group-task-panel">
          <div className="section-heading">
            <h2>
              {view === 'unpaid' ? '待付款项目' : view === 'transit' ? '待到货项目' : '待排发项目'}
            </h2>
            <Link href="/groups">查看全部拼团</Link>
          </div>
          <div className="record-list group-task-list">
            {tasks.map(({ group, item }) => (
              <Link className="record group-task-row" href={`/groups/${group.id}`} key={item.id}>
                <Package size={20} />
                <span>
                  <strong>{productFor(item.productId)?.name ?? '商品'}</strong>
                  <small>{group.name}</small>
                </span>
                <span>{item.quantity} 件</span>
                <span className="pill">
                  {view === 'unpaid'
                    ? '待付款'
                    : view === 'transit'
                      ? statusNames[item.purchase?.arrivalStatus ?? 'PENDING']
                      : '待排发'}
                </span>
                <ChevronRight size={17} />
              </Link>
            ))}
            {!tasks.length && (
              <EmptyState
                icon={<Flower2 size={34} strokeWidth={1.2} />}
                title="这里暂时没有待处理项目"
                description="慢慢来，把每一份喜欢放进这里。"
              />
            )}
          </div>
        </section>
      )}
      {(!view || view === 'open') && (
        <div className="group-grid">
          {groups.map((group) => (
            <Link className="group-card" href={`/groups/${group.id}`} key={group.id}>
              <div className="group-card-top">
                <Users size={24} />
                <span className="pill">{statusNames[group.status]}</span>
              </div>
              <h2>{group.name}</h2>
              <p>团长 · {group.groupOwner}</p>
              <p className="group-card-items">
                {group.items.length
                  ? group.items
                      .slice(0, 3)
                      .map((item) => productFor(item.productId)?.name ?? '商品')
                      .join(' · ')
                  : '还没有团内商品'}
              </p>
              <div className="group-counts">
                <span>
                  <strong>
                    {group.items.reduce(
                      (sum, item) => sum + (item.purchase?.quantity ?? item.quantity),
                      0,
                    )}
                  </strong>
                  件商品
                </span>
                <span>
                  <strong>
                    {
                      group.items.filter((item) => item.purchase?.arrivalStatus !== 'ARRIVED')
                        .length
                    }
                  </strong>
                  项待到货
                </span>
                <span>
                  <strong>
                    {group.items.filter((item) => item.dispatchStatus !== 'DISPATCHED').length}
                  </strong>
                  项待排发
                </span>
              </div>
              <div className="group-progress">
                <i
                  style={{
                    width: `${group.items.length ? Math.round((group.items.filter((item) => item.purchase?.arrivalStatus === 'ARRIVED').length / group.items.length) * 100) : 0}%`,
                  }}
                />
              </div>
              <div className="group-link">
                看看团里的喜欢 <ArrowRight size={16} />
              </div>
            </Link>
          ))}
          {!groups.length && (
            <EmptyState
              icon={<Flower2 size={34} strokeWidth={1.2} />}
              title="跟同好一起，等待喜欢到来"
              description="慢慢来，把每一份喜欢放进这里。"
              action={
                <button className="primary" onClick={onCreate}>
                  记录拼团 <Plus size={16} />
                </button>
              }
            />
          )}
        </div>
      )}
    </>
  );
}
