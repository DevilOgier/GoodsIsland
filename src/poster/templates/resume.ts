import { fontRoles } from '../fonts';
import type { PosterTemplate } from '../types';
import { renderDossier } from './dossier-layout';

export const resumeTemplate: PosterTemplate = {
  id: 'resume',
  name: '收藏档案',
  description: '档案排版 · 信息清晰',
  recommendedItems: '4–12 件',
  typography: {
    display: fontRoles.serif,
    title: fontRoles.sans,
    body: fontRoles.sans,
    numeric: fontRoles.mono,
    handwriting: fontRoles.sans,
  },
  previewFonts: ['chineseSerif', 'serif', 'handwriting', 'sans'],
  exportFonts: ['chineseSerif', 'serif', 'handwriting', 'sans'],
  palettes: [
    {
      id: 'paper',
      label: '暖米白',
      background: '#f4f0e5',
      surface: '#faf7ee',
      primary: '#7d8c70',
      secondary: '#ddd7c8',
      text: '#46473a',
      muted: '#918976',
      price: '#795b4a',
    },
    {
      id: 'slate',
      label: '浅灰蓝',
      background: '#e8edf0',
      surface: '#f9fbfc',
      primary: '#506978',
      secondary: '#c8d4db',
      text: '#26343c',
      muted: '#6e7e87',
      price: '#365b70',
    },
    {
      id: 'mono',
      label: '黑白',
      background: '#eeeeeb',
      surface: '#ffffff',
      primary: '#343936',
      secondary: '#d5d7d5',
      text: '#202321',
      muted: '#707471',
      price: '#202321',
    },
  ],
  defaultOptions: {
    palette: 'paper',
    density: 'INFO_FIRST',
    priceStyle: 'PRICE_PROMINENT',
    showNote: true,
  },
  render: renderDossier,
};
