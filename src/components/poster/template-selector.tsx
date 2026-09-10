import { ratios, templates } from '@/poster/renderer';

export function TemplateSelector({
  ratio,
  template,
  onRatioChange,
  onTemplateChange,
}: {
  ratio: string;
  template: string;
  onRatioChange: (ratio: string) => void;
  onTemplateChange: (template: string) => void;
}) {
  return (
    <section className="poster-format-controls">
      <h3>03 / 选择画布比例</h3>
      <div className="ratio-options" aria-label="画布比例">
        {Object.keys(ratios).map((item) => (
          <button
            type="button"
            aria-pressed={ratio === item}
            className={ratio === item ? 'selected' : ''}
            key={item}
            onClick={() => onRatioChange(item)}
          >
            {item}
          </button>
        ))}
      </div>
      <h3>04 / 选择海报风格</h3>
      <div className="template-options">
        {Object.entries(templates).map(([key, item]) => (
          <button
            type="button"
            aria-pressed={template === key}
            className={`${template === key ? 'selected' : ''} template-card template-card--${key}`}
            style={{ background: item.background }}
            key={key}
            onClick={() => onTemplateChange(key)}
          >
            <span className="template-card__sample" aria-hidden="true">
              <i />
              <i />
              <i />
            </span>
            <strong>{item.label}</strong>
            <small>{item.description}</small>
          </button>
        ))}
      </div>
    </section>
  );
}
