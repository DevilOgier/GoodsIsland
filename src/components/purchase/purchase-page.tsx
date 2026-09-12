'use client';

import { Trash2 } from 'lucide-react';
import CollectionGallery from '../collection-gallery';
import type { Product, Snapshot } from '../types';
import { price, statusNames } from '../types';

type PurchaseListProps = {
  items: Snapshot['purchases'];
  status?: string;
  showImages?: boolean;
  productFor: (productId: string) => Product | undefined;
  onAction: (operation: string, payload: Record<string, unknown>) => void;
  onEdit: (id: string, productId: string) => void;
  onFees: (id: string) => void;
  onRemove: (id: string, name: string) => void;
};

export function PurchaseList({
  items,
  status,
  showImages = true,
  productFor,
  onAction,
  onEdit,
  onFees,
  onRemove,
}: PurchaseListProps) {
  return (
    <CollectionGallery
      heading={status === 'IN_TRANSIT' ? '等待到货' : '买入记录'}
      defaultMode="list"
      showImages={showImages}
      items={items
        .filter((purchase) => productFor(purchase.productId))
        .map((purchase) => {
          const product = productFor(purchase.productId)!;
          return {
            id: purchase.id,
            product,
            badge: statusNames[purchase.arrivalStatus],
            summary: (
              <>
                <strong>
                  {purchase.quantity} 件 · 实际成本 {price(purchase.actualCost)}
                </strong>
                <small>
                  {purchase.purchaseChannel} · {purchase.purchaseDate.slice(0, 10)}
                </small>
              </>
            ),
            actions: (
              <>
                {!['ARRIVED', 'CANCELLED'].includes(purchase.arrivalStatus) && (
                  <>
                    <button
                      className="small-btn"
                      onClick={() => onAction('purchase.arrive', { id: purchase.id })}
                    >
                      确认到货
                    </button>
                    <button
                      className="small-btn"
                      onClick={() =>
                        onAction('purchase.status', { id: purchase.id, status: 'CANCELLED' })
                      }
                    >
                      取消
                    </button>
                  </>
                )}
                {purchase.arrivalStatus !== 'CANCELLED' && (
                  <button className="small-btn" onClick={() => onFees(purchase.id)}>
                    补运费
                  </button>
                )}
                {purchase.arrivalStatus !== 'CANCELLED' && (
                  <button
                    className="small-btn"
                    onClick={() => onEdit(purchase.id, purchase.productId)}
                  >
                    修改
                  </button>
                )}
                <button
                  className="small-btn danger"
                  onClick={() => onRemove(purchase.id, product.name)}
                >
                  <Trash2 size={14} /> 删除
                </button>
              </>
            ),
            details: (
              <details className="record-details">
                <summary>费用与补费记录</summary>
                <p>
                  商品金额 {price(purchase.productAmount)} · 国内运费{' '}
                  {price(purchase.domesticShipping)} · 国际运费{' '}
                  {price(purchase.internationalShipping)} · 其他 {price(purchase.otherFee)}
                </p>
                {purchase.adjustments.map((adjustment) => (
                  <p key={adjustment.id}>
                    +{price(adjustment.amount)} · {adjustment.reason}
                  </p>
                ))}
              </details>
            ),
          };
        })}
    />
  );
}

export default function PurchasePage(props: PurchaseListProps) {
  return (
    <>
      <div className="page-intro">
        <span className="eyebrow">PURCHASE STORIES</span>
        <h1>买入记录</h1>
        <p>记录每一份相遇，让喜欢都有迹可循。</p>
      </div>
      <PurchaseList {...props} />
    </>
  );
}
