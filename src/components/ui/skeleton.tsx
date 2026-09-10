import { cx } from './utils';

export function Skeleton({ className }: { className?: string }) {
  return <span className={cx('ui-skeleton', className)} aria-hidden="true" />;
}
