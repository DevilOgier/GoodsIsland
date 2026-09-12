export type PosterType = 'SALE' | 'WANTED';
export type PosterDensity = 'IMAGE_FIRST' | 'BALANCED' | 'INFO_FIRST';
export type PosterPriceStyle = 'PRICE_PROMINENT' | 'PRICE_NORMAL' | 'PRICE_HIDDEN';

export type PosterItemData = {
  productId: string;
  name: string;
  quantity: number;
  price: string;
  note: string;
  image?: string;
  previewAssetId?: string;
  exportAssetId?: string;
};

export type PosterRenderOptions = {
  palette: string;
  density: PosterDensity;
  priceStyle: PosterPriceStyle;
  showNote: boolean;
};

export type PosterData = {
  title: string;
  type: PosterType;
  ratio: string;
  template: string;
  items: PosterItemData[];
  version?: number;
  config?: Partial<PosterRenderOptions>;
};

export type PosterPalette = {
  id: string;
  label: string;
  background: string;
  surface: string;
  primary: string;
  secondary: string;
  text: string;
  muted: string;
  price: string;
};

export type PosterTypography = {
  display: string;
  title: string;
  body: string;
  numeric: string;
  handwriting: string;
};

export type PosterTemplate = {
  id: string;
  name: string;
  description: string;
  palettes: PosterPalette[];
  typography: PosterTypography;
  defaultOptions: PosterRenderOptions;
  recommendedItems: string;
  render: (
    data: PosterData,
    options: PosterRenderOptions,
    palette: PosterPalette,
    width: number,
    height: number,
  ) => string;
};
