'use client';
import { useEffect, useRef, type ReactNode } from 'react';
import { X } from 'lucide-react';
import { IconButton } from './button';
import { cx } from './utils';

export function Sheet({
  open,
  title,
  description,
  onClose,
  children,
  placement = 'right',
  className,
}: {
  open: boolean;
  title: string;
  description?: string;
  onClose: () => void;
  children: ReactNode;
  placement?: 'right' | 'bottom' | 'center';
  className?: string;
}) {
  const closeRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLElement>(null);
  const onCloseRef = useRef(onClose);
  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);
  useEffect(() => {
    if (!open) return;
    const previous = document.activeElement as HTMLElement | null;
    const oldOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    closeRef.current?.focus();
    const keyboard = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onCloseRef.current();
      if (event.key !== 'Tab') return;
      const focusable = panelRef.current?.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
      );
      if (!focusable?.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    document.addEventListener('keydown', keyboard);
    return () => {
      document.body.style.overflow = oldOverflow;
      document.removeEventListener('keydown', keyboard);
      previous?.focus();
    };
  }, [open]);
  if (!open) return null;
  return (
    <div
      className="ui-sheet-backdrop"
      onMouseDown={(event) => event.target === event.currentTarget && onClose()}
    >
      <section
        ref={panelRef}
        className={cx('ui-sheet', `ui-sheet--${placement}`, className)}
        role="dialog"
        aria-modal="true"
        aria-labelledby="ui-sheet-title"
      >
        <header>
          <div>
            <h2 id="ui-sheet-title">{title}</h2>
            {description && <p>{description}</p>}
          </div>
          <IconButton ref={closeRef} aria-label="关闭" onClick={onClose}>
            <X size={19} />
          </IconButton>
        </header>
        {children}
      </section>
    </div>
  );
}

export function Drawer(props: Omit<React.ComponentProps<typeof Sheet>, 'placement'>) {
  return <Sheet {...props} placement="right" />;
}
export function BottomSheet(props: Omit<React.ComponentProps<typeof Sheet>, 'placement'>) {
  return <Sheet {...props} placement="bottom" />;
}
export function Modal(props: Omit<React.ComponentProps<typeof Sheet>, 'placement'>) {
  return <Sheet {...props} placement="center" />;
}
