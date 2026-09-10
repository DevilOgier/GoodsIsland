import { forwardRef, type ButtonHTMLAttributes } from 'react';
import { cx } from './utils';

export type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { className, variant = 'secondary', size = 'md', ...props },
  ref,
) {
  return (
    <button
      ref={ref}
      className={cx('ui-button', `ui-button--${variant}`, `ui-button--${size}`, className)}
      {...props}
    />
  );
});

export const IconButton = forwardRef<HTMLButtonElement, ButtonProps>(function IconButton(
  { className, ...props },
  ref,
) {
  return (
    <Button
      ref={ref}
      className={cx('ui-icon-button', className)}
      variant="ghost"
      size="sm"
      {...props}
    />
  );
});
