import { posterTemplateRegistry, posterTemplates } from '@/poster/registry';
import { ratios } from '@/poster/renderer';
import type { PosterRenderOptions } from '@/poster/types';

export function TemplateSelector({
  ratio,
  template,
  config,
  onRatioChange,
  onTemplateChange,
  onConfigChange,
}: {
  ratio: string;
  template: string;
  config: PosterRenderOptions;
  onRatioChange: (ratio: string) => void;
  onTemplateChange: (template: string) => void;
  onConfigChange: (config: PosterRenderOptions) => void;
}) {
  const activeTemplate = posterTemplateRegistry.get(template) ?? posterTemplates[0];

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
      {!posterTemplateRegistry.has(template) && (
        <p className="notice">当前正在查看历史模板。选择下方风格后会使用新版排版。</p>
      )}
      <div className="template-options template-options--poster">
        {posterTemplates.map((item) => (
          <button
            type="button"
            aria-pressed={template === item.id}
            className={`${template === item.id ? 'selected' : ''} template-card template-card--poster`}
            key={item.id}
            onClick={() => onTemplateChange(item.id)}
          >
            <strong>{item.name}</strong>
            <small>{item.description}</small>
          </button>
        ))}
      </div>

      <div className="poster-style-options">
        <h3>05 / 配色</h3>
        <div className="palette-options" aria-label="模板配色">
          {activeTemplate.palettes.map((palette) => (
            <button
              type="button"
              key={palette.id}
              aria-pressed={config.palette === palette.id}
              className={config.palette === palette.id ? 'selected' : ''}
              onClick={() => onConfigChange({ ...config, palette: palette.id })}
            >
              <i style={{ background: palette.primary }} />
              <i style={{ background: palette.secondary }} />
              <span>{palette.label}</span>
            </button>
          ))}
        </div>
      </div>
    </section>
  );
}
