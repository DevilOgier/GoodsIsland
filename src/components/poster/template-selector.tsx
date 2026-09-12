import { posterTemplateRegistry, posterTemplates } from '@/poster/registry';
import { renderPoster, ratios } from '@/poster/renderer';
import type { PosterRenderOptions } from '@/poster/types';

const sampleItems = [
  { productId: 'sample-1', name: '星月系列吧唧', quantity: 2, price: '35', note: '无伤优先' },
  { productId: 'sample-2', name: '夜航纪念立牌', quantity: 1, price: '68', note: '可小刀' },
];
const thumbnailCache = new Map<string, string>();

function templateThumbnail(template: string, config: PosterRenderOptions) {
  const key = `${template}:${config.palette}`;
  const cached = thumbnailCache.get(key);
  if (cached) return cached;
  const svg = renderPoster({
    title: '今日心动收藏',
    type: 'WANTED',
    ratio: '3:4',
    template,
    version: 3,
    config,
    items: sampleItems,
  });
  const uri = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
  thumbnailCache.set(key, uri);
  return uri;
}

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
            <span className="template-card__preview">
              <img
                src={templateThumbnail(item.id, item.defaultOptions)}
                alt=""
                loading="lazy"
                decoding="async"
              />
            </span>
            <strong>{item.name}</strong>
            <small>{item.description}</small>
            <em>{item.recommendedItems}</em>
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

        <h3>06 / 信息密度</h3>
        <div className="poster-option-row">
          {[
            ['IMAGE_FIRST', '图片优先'],
            ['BALANCED', '平衡'],
            ['INFO_FIRST', '信息优先'],
          ].map(([value, label]) => (
            <button
              type="button"
              key={value}
              className={config.density === value ? 'selected' : ''}
              aria-pressed={config.density === value}
              onClick={() =>
                onConfigChange({
                  ...config,
                  density: value as PosterRenderOptions['density'],
                })
              }
            >
              {label}
            </button>
          ))}
        </div>

        <h3>07 / 显示设置</h3>
        <div className="poster-option-row">
          {[
            ['PRICE_PROMINENT', '价格突出'],
            ['PRICE_NORMAL', '价格普通'],
            ['PRICE_HIDDEN', '隐藏价格'],
          ].map(([value, label]) => (
            <button
              type="button"
              key={value}
              className={config.priceStyle === value ? 'selected' : ''}
              aria-pressed={config.priceStyle === value}
              onClick={() =>
                onConfigChange({
                  ...config,
                  priceStyle: value as PosterRenderOptions['priceStyle'],
                })
              }
            >
              {label}
            </button>
          ))}
        </div>
        <label className="poster-note-toggle">
          <input
            type="checkbox"
            checked={config.showNote}
            onChange={(event) => onConfigChange({ ...config, showNote: event.target.checked })}
          />
          海报中显示备注
        </label>
      </div>
    </section>
  );
}
