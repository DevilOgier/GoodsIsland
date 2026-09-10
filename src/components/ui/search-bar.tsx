import type { ChangeEvent, InputHTMLAttributes } from 'react';
import { Search, X } from 'lucide-react';
import { cx } from './utils';

export function SearchBar({
  className,
  value,
  onChange,
  onValueChange,
  ...props
}: InputHTMLAttributes<HTMLInputElement> & { onValueChange?: (value: string) => void }) {
  const change = (event: ChangeEvent<HTMLInputElement>) => {
    onChange?.(event);
    onValueChange?.(event.target.value);
  };
  return (
    <label className={cx('ui-search-bar', className)}>
      <Search size={17} aria-hidden="true" />
      <input value={value} onChange={change} {...props} />
      {value && onValueChange && (
        <button type="button" aria-label="清空搜索" onClick={() => onValueChange('')}>
          <X size={15} />
        </button>
      )}
    </label>
  );
}
