import Link from 'next/link';
import { ArrowDownLeft, ArrowUpRight, Heart, Palette, Tag } from 'lucide-react';
import { BottomSheet } from '@/components/ui';

export type QuickAction = 'purchase' | 'sale' | 'wanted';

export function QuickActionSheet({
  open,
  onClose,
  onAction,
}: {
  open: boolean;
  onClose: () => void;
  onAction: (action: QuickAction) => void;
}) {
  const choose = (action: QuickAction) => {
    onClose();
    onAction(action);
  };
  return (
    <BottomSheet open={open} onClose={onClose} title="快速记录" description="把刚发生的小事记下来">
      <div className="quick-action-grid">
        <button type="button" onClick={() => choose('purchase')}>
          <span className="quick-action-icon tone-green">
            <ArrowDownLeft />
          </span>
          <strong>记录买入</strong>
          <small>买到一份新喜欢</small>
        </button>
        <button type="button" onClick={() => choose('sale')}>
          <span className="quick-action-icon tone-pink">
            <ArrowUpRight />
          </span>
          <strong>记录卖出</strong>
          <small>完成一次成交</small>
        </button>
        <button type="button" onClick={() => choose('wanted')}>
          <span className="quick-action-icon tone-orange">
            <Heart />
          </span>
          <strong>新增收物</strong>
          <small>记下想要的谷子</small>
        </button>
        <Link href="/posters?source=listings" onClick={onClose}>
          <span className="quick-action-icon tone-pink">
            <Tag />
          </span>
          <strong>生成出物图</strong>
          <small>带入剩余挂出</small>
        </Link>
        <Link href="/posters?source=wanted" onClick={onClose}>
          <span className="quick-action-icon tone-green">
            <Palette />
          </span>
          <strong>生成收物图</strong>
          <small>带入未收齐心愿</small>
        </Link>
      </div>
    </BottomSheet>
  );
}
