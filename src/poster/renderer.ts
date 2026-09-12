import { renderPoster as renderV2, templates as legacyTemplates } from './v2-renderer';
import { legacyTemplateIds, posterTemplateRegistry, posterTemplates } from './registry';
import type { PosterData } from './types';
import { choosePalette, ratios, resolveOptions, validatePoster } from './utils';

export type {
  PosterData,
  PosterDensity,
  PosterItemData,
  PosterPalette,
  PosterPriceStyle,
  PosterRenderOptions,
  PosterTemplate,
  PosterType,
} from './types';
export { ratios } from './utils';
export { posterTemplates } from './registry';

export const templates: Record<
  string,
  { background: string; accent: string; label: string; description: string }
> = {
  ...legacyTemplates,
  ...Object.fromEntries(
    posterTemplates.map((template) => [
      template.id,
      {
        background: template.palettes[0].background,
        accent: template.palettes[0].primary,
        label: template.name,
        description: template.description,
      },
    ]),
  ),
};

export function renderPoster(data: PosterData) {
  if (data.version === 1 || legacyTemplateIds.has(data.template)) {
    return renderV2(data);
  }

  validatePoster(data);
  const template = posterTemplateRegistry.get(data.template);
  const size = ratios[data.ratio];
  if (!template || !size) throw new Error('比例或模板无效');
  const options = resolveOptions(template.defaultOptions, data.config);
  const palette = choosePalette(template.palettes, options.palette);
  return template.render(data, options, palette, size[0], size[1]);
}
