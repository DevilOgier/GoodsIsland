'use client';

import Link from 'next/link';
import { LoaderCircle, Package } from 'lucide-react';
import type { Product, Snapshot } from '../types';
import { price, statusNames } from '../types';

type Group = Snapshot['groups'][number];
type Action = (
  operation: string,
  payload: Record<string, unknown>,
  message?: string,
  key?: string,
) => void;

export default function GroupDetail({
  group,
  pendingAction,
  productFor,
  onAction,
  onAddItem,
  onDispatch,
}: {
  group: Group;
  pendingAction: string;
  productFor: (productId: string) => Product | undefined;
  onAction: Action;
  onAddItem: () => void;
  onDispatch: (itemId: string) => void;
}) {
  return (
    <>
      <div className="page-intro">
        <Link className="back-link" href="/groups">
          ← 我的拼团
        </Link>
        <h1>{group.name}</h1>
        <p>
          团长 · {group.groupOwner} / {statusNames[group.status]}
        </p>
        <p className="group-sync-note">
          确认付款后会记入收藏柜；派发时记录邮费并进入“在路上”，确认到货后才增加在手库存。
        </p>
        <div className="button-row">
          {group.status === 'OPEN' && (
            <button className="small-btn" onClick={onAddItem}>
              添加团项
            </button>
          )}
          {group.status === 'OPEN' && (
            <button
              disabled={Boolean(pendingAction)}
              onClick={() =>
                onAction(
                  'group.status',
                  { id: group.id, status: 'CLOSED' },
                  '已截团，团项仍可继续更新物流状态',
                  `group:${group.id}:close`,
                )
              }
            >
              {pendingAction === `group:${group.id}:close` && (
                <LoaderCircle className="button-spinner" size={15} />
              )}
              {pendingAction === `group:${group.id}:close` ? '截团中…' : '截团'}
            </button>
          )}
          {group.status === 'CLOSED' && (
            <button
              disabled={Boolean(pendingAction)}
              onClick={() =>
                onAction(
                  'group.status',
                  { id: group.id, status: 'COMPLETED' },
                  '拼团已完成并保存',
                  `group:${group.id}:complete`,
                )
              }
            >
              {pendingAction === `group:${group.id}:complete` && (
                <LoaderCircle className="button-spinner" size={15} />
              )}
              {pendingAction === `group:${group.id}:complete` ? '保存中…' : '完成拼团'}
            </button>
          )}
        </div>
      </div>
      <div className="record-list">
        {group.items.map((item) => (
          <article className="record" key={item.id}>
            <Link className="group-item-product" href={`/products/${item.productId}`}>
              <Package size={20} />
              <strong>{productFor(item.productId)?.name ?? '商品'}</strong>
            </Link>
            <strong>
              {item.purchase?.quantity ?? item.quantity} 件 ·{' '}
              {price(item.purchase?.unitPrice ?? item.unitPrice)}
            </strong>
            <div className="record-actions">
              {item.paymentStatus === 'PAID' && item.purchase ? (
                <span className="pill">已付款</span>
              ) : (
                <button
                  className="small-btn"
                  disabled={
                    Boolean(pendingAction) || ['COMPLETED', 'CANCELLED'].includes(group.status)
                  }
                  onClick={() =>
                    onAction(
                      'group.pay',
                      { id: item.id },
                      '已确认付款，并同步记入收藏柜',
                      `group:${item.id}:pay`,
                    )
                  }
                >
                  {pendingAction === `group:${item.id}:pay` && (
                    <LoaderCircle className="button-spinner" size={14} />
                  )}
                  {pendingAction === `group:${item.id}:pay` ? '同步中…' : '确认已付款'}
                </button>
              )}
              {item.purchase &&
                item.paymentStatus === 'PAID' &&
                item.dispatchStatus !== 'DISPATCHED' &&
                !['ARRIVED', 'CANCELLED'].includes(item.purchase.arrivalStatus) &&
                !['COMPLETED', 'CANCELLED'].includes(group.status) && (
                  <button className="small-btn" onClick={() => onDispatch(item.id)}>
                    确认已派发
                  </button>
                )}
              {item.dispatchStatus === 'DISPATCHED' && <span className="pill">已派发</span>}
            </div>
            {item.purchase && (
              <>
                <span className="pill">{statusNames[item.purchase.arrivalStatus]}</span>
                {item.dispatchStatus === 'DISPATCHED' &&
                  !['ARRIVED', 'CANCELLED'].includes(item.purchase.arrivalStatus) && (
                    <button
                      className="small-btn"
                      disabled={Boolean(pendingAction)}
                      onClick={() =>
                        onAction(
                          'purchase.arrive',
                          { id: item.purchase!.id },
                          '已确认到货，收藏柜库存已同步增加',
                          `group:${item.id}:arrive`,
                        )
                      }
                    >
                      {pendingAction === `group:${item.id}:arrive` && (
                        <LoaderCircle className="button-spinner" size={14} />
                      )}
                      {pendingAction === `group:${item.id}:arrive` ? '入库中…' : '确认已到货'}
                    </button>
                  )}
              </>
            )}
          </article>
        ))}
      </div>
    </>
  );
}
