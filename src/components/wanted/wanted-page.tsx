'use client';

import Link from 'next/link';
import { Trash2 } from 'lucide-react';
import CollectionGallery from '../collection-gallery';
import type { Product, Snapshot } from '../types';
import { price, statusNames } from '../types';

type WantedPageProps = {
  items: Snapshot['wanted'];
  productFor: (productId: string) => Product | undefined;
  onEdit: (id: string) => void;
  onPurchase: (productId: string, wantedId: string) => void;
  onComplete: (id: string, quantity: number) => void;
  onRemove: (id: string, name: string) => void;
};

export default function WantedPage({
  items,
  productFor,
  onEdit,
  onPurchase,
  onComplete,
  onRemove,
}: WantedPageProps) {
  return (
    <>
      <div className="page-intro">
        <span className="eyebrow">MY WISH LIST</span>
        <h1>收物心愿 🌸</h1>
        <p>把还没遇见的喜欢，先轻轻记在这里。</p>
      </div>
      <CollectionGallery
        heading="正在收"
        extra={
          <Link className="primary gallery-poster-link" href="/posters?source=wanted">
            批量制作收物图
          </Link>
        }
        items={items
          .filter((wanted) => productFor(wanted.productId))
          .map((wanted) => {
            const product = productFor(wanted.productId)!;
            return {
              id: wanted.id,
              product,
              onOpen: () => onEdit(wanted.id),
              badge: statusNames[wanted.status],
              summary: (
                <>
                  <strong>
                    {wanted.targetPrice ? price(wanted.targetPrice) : '价格可议'} / 件
                  </strong>
                  <small>
                    已收 {wanted.fulfilledQuantity} / 想收 {wanted.wantedQuantity} 件
                  </small>
                  <small
                    className={`wanted-priority wanted-priority--${wanted.priority.toLowerCase()}`}
                  >
                    {wanted.priority === 'HIGH'
                      ? '很想要'
                      : wanted.priority === 'LOW'
                        ? '随缘'
                        : '普通'}
                  </small>
                  <small>{wanted.notes}</small>
                </>
              ),
              actions: (
                <>
                  <Link className="small-btn" href={`/posters?source=wanted&id=${wanted.id}`}>
                    制作收物图
                  </Link>
                  <button
                    className="small-btn"
                    onClick={() => onPurchase(wanted.productId, wanted.id)}
                  >
                    记录买入
                  </button>
                  <button
                    className="small-btn"
                    onClick={() => onComplete(wanted.id, wanted.wantedQuantity)}
                  >
                    仅标记收齐
                  </button>
                  <button className="small-btn" onClick={() => onEdit(wanted.id)}>
                    修改
                  </button>
                  <button
                    className="small-btn danger"
                    onClick={() => onRemove(wanted.id, product.name)}
                  >
                    <Trash2 size={14} /> 删除
                  </button>
                </>
              ),
            };
          })}
      />
    </>
  );
}
