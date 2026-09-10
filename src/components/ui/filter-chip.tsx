import { X } from 'lucide-react';
import { cx } from './utils';

export function FilterChip({
  label,
  onRemove,
  className,
}: {
  label: string;
  onRemove?: () => void;
  className?: string;
}) {
  return (
    <span className={cx('ui-filter-chip', className)}>
      {label}
      {onRemove && (
        <button type="button" aria-label={`移除筛选：${label}`} onClick={onRemove}>
          <X size={13} />
        </button>
      )}
    </span>
  );
}
