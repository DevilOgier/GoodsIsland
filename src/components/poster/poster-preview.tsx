import type { ReactNode } from 'react';
import { Plus } from 'lucide-react';

export function PosterPreview({
  svg,
  error,
  ratio,
  templateLabel,
  status,
  children,
}: {
  svg: string;
  error: string;
  ratio: string;
  templateLabel: string;
  status?: string;
  children: ReactNode;
}) {
  return (
    <section className="poster-preview-panel">
      <div className="preview-heading">
        <span>海报预览</span>
        <small>
          {ratio} · {templateLabel}
        </small>
      </div>
      <div className="poster-preview">
        {svg ? (
          <div
            className="poster-preview__svg"
            role="img"
            aria-label="海报实时预览"
            dangerouslySetInnerHTML={{ __html: svg }}
          />
        ) : (
          <div className="empty">
            <Plus size={32} />
            <p>{error}</p>
          </div>
        )}
      </div>
      {status && (
        <p role="status" className="notice">
          {status}
        </p>
      )}
      <div className="export-actions">{children}</div>
    </section>
  );
}
