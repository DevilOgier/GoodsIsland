import type { HTMLAttributes } from 'react';
import { cx } from './utils';

export function Badge({ className, ...props }: HTMLAttributes<HTMLSpanElement>) {
  return <span className={cx('ui-badge', className)} {...props} />;
}

export function TagChip({ className, ...props }: HTMLAttributes<HTMLSpanElement>) {
  return <span className={cx('ui-tag-chip', className)} {...props} />;
}
