import type { HTMLAttributes, ReactNode } from 'react';
import { cx } from './utils';

export function Card({ className, ...props }: HTMLAttributes<HTMLElement>) {
  return <section className={cx('ui-card', className)} {...props} />;
}

export function StatCard({
  icon,
  label,
  value,
  hint,
  tone = 'green',
}: {
  icon: ReactNode;
  label: string;
  value: ReactNode;
  hint?: ReactNode;
  tone?: 'green' | 'pink' | 'orange' | 'neutral';
}) {
  return (
    <Card className={cx('ui-stat-card', `ui-stat-card--${tone}`)}>
      <span className="ui-stat-card__icon">{icon}</span>
      <span className="ui-stat-card__label">{label}</span>
      <strong>{value}</strong>
      {hint && <small>{hint}</small>}
    </Card>
  );
}
