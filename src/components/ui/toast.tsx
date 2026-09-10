import { AlertCircle, CheckCircle2, Info } from 'lucide-react';

export function Toast({
  message,
  tone = 'success',
}: {
  message: string;
  tone?: 'success' | 'error' | 'info';
}) {
  const Icon = tone === 'error' ? AlertCircle : tone === 'info' ? Info : CheckCircle2;
  return (
    <div className={`ui-toast ui-toast--${tone}`} role={tone === 'error' ? 'alert' : 'status'}>
      <Icon size={18} />
      <span>{message}</span>
    </div>
  );
}
