'use client';

import Link from 'next/link';
import ProductArt from '../product-art';
import type { Product, Snapshot } from '../types';
import { price } from '../types';

type SaleListProps = {
  items: Snapshot['sales'];
  productFor: (productId: string) => Product | undefined;
};

export function SaleList({ items, productFor }: SaleListProps) {
  return items.length ? (
    <div className="record-list">
      {items.map((sale) => {
        const product = productFor(sale.productId);
        const cost =
          Number(sale.allocatedActualCost) +
          sale.costAdjustments.reduce((sum, fee) => sum + Number(fee.amount), 0);
        return (
          <article className="record" key={sale.id}>
            <Link href={`/products/${sale.productId}`} className="record-product">
              {product && <ProductArt product={product} />}
              <strong>{product?.name ?? '商品'}</strong>
            </Link>
            <div>
              <small>实际成交</small>
              <strong>
                {sale.quantity} 件 · {price(sale.totalAmount)}
              </strong>
            </div>
            <div>
              <small>分摊成本（含补费）</small>
              <strong>{price(cost)}</strong>
            </div>
            <div>
              <small>本次收益</small>
              <strong className={Number(sale.totalAmount) - cost >= 0 ? 'green' : ''}>
                {price(Number(sale.totalAmount) - cost)}
              </strong>
            </div>
            <small>
              {sale.saleChannel} · {sale.saleDate.slice(0, 10)}
            </small>
          </article>
        );
      })}
    </div>
  ) : (
    <div className="empty">
      <p>喜欢还在身边，暂时没有成交</p>
    </div>
  );
}

export default function SalePage(props: SaleListProps) {
  return (
    <>
      <div className="page-intro">
        <span className="eyebrow">PASSED WITH LOVE</span>
        <h1>卖出记录</h1>
        <p>记下每一次成交，也记住喜欢去往了哪里。</p>
      </div>
      <SaleList {...props} />
    </>
  );
}
