'use client';

import Link from 'next/link';
import CollectionGallery from '../collection-gallery';
import type { Product, Snapshot } from '../types';
import { price, statusNames } from '../types';

export default function ListingsPage({
  items,
  productFor,
  onSale,
  onCancel,
}: {
  items: Snapshot['listings'];
  productFor: (productId: string) => Product | undefined;
  onSale: (listingId: string, productId: string) => void;
  onCancel: (listingId: string) => void;
}) {
  return (
    <>
      <div className="page-intro">
        <span className="eyebrow">PASS ON THE JOY</span>
        <h1>正在出物</h1>
        <p>挂出只是整理计划，确认成交后才会扣减库存。</p>
      </div>
      <div className="notice">挂出不扣库存。选择出物记录可直接制作海报，实际成交后再扣库存。</div>
      <CollectionGallery
        heading="出物收藏"
        extra={
          <Link className="primary gallery-poster-link" href="/posters?source=listings">
            批量制作出物图
          </Link>
        }
        items={items
          .filter((listing) => productFor(listing.inventory.productId))
          .map((listing) => ({
            id: listing.id,
            product: productFor(listing.inventory.productId)!,
            badge: statusNames[listing.status],
            summary: (
              <>
                <strong>{price(listing.unitPrice)} / 件</strong>
                <small>
                  剩余挂出 {listing.remainingQuantity} / {listing.quantity} 件
                </small>
              </>
            ),
            actions:
              listing.status === 'ACTIVE' ? (
                <>
                  <button
                    className="small-btn"
                    onClick={() => onSale(listing.id, listing.inventory.productId)}
                  >
                    确认成交
                  </button>
                  <Link className="small-btn" href={`/posters?source=listings&id=${listing.id}`}>
                    制作出物图
                  </Link>
                  <button className="small-btn" onClick={() => onCancel(listing.id)}>
                    撤下
                  </button>
                </>
              ) : undefined,
          }))}
      />
    </>
  );
}
