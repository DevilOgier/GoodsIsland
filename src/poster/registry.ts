import type { PosterTemplate } from './types';
import { ginghamTemplate } from './templates/gingham';
import { invitationTemplate } from './templates/invitation';
import { polaroidTemplate } from './templates/polaroid';
import { resumeTemplate } from './templates/resume';

export const posterTemplates = [
  polaroidTemplate,
  invitationTemplate,
  ginghamTemplate,
  resumeTemplate,
] as const satisfies readonly PosterTemplate[];

export const posterTemplateRegistry = new Map<string, PosterTemplate>(
  posterTemplates.map((template) => [template.id, template]),
);

export const legacyTemplateIds = new Set(['cute', 'simple', 'retro', 'minimal']);
