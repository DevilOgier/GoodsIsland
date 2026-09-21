'use client';

import { fontFaceCss, posterFontAssets, type PosterFontRole } from './fonts';

const blobCache = new Map<string, Promise<Blob>>();
const dataUrlCache = new Map<string, Promise<string>>();
const fontCssCache = new Map<string, Promise<string>>();
const exportImageCache = new Map<string, Promise<CachedExportImage>>();
const posterExportCache = new Map<string, Blob>();
const maxPosterExports = 6;

export type ExportImageMetrics = {
  imageDownload: number;
  imageResize: number;
  imageToDataURL: number;
};

export type PreparedExportImage = {
  dataUrl: string;
  sourceWidth: number;
  sourceHeight: number;
  outputWidth: number;
  outputHeight: number;
  cacheHit: boolean;
  metrics: ExportImageMetrics;
};

type CachedExportImage = Omit<PreparedExportImage, 'cacheHit' | 'metrics'> & {
  creationMetrics: ExportImageMetrics;
};

async function fetchBlob(url: string, errorMessage: string) {
  const cached = blobCache.get(url);
  if (cached) return cached;
  const request = fetch(url)
    .then(async (response) => {
      if (!response.ok) throw new Error(errorMessage);
      return response.blob();
    })
    .catch((error) => {
      blobCache.delete(url);
      throw error;
    });
  blobCache.set(url, request);
  return request;
}

function blobToDataUrl(blob: Blob, errorMessage: string) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error(errorMessage));
    reader.readAsDataURL(blob);
  });
}

async function blobData(url: string, errorMessage: string) {
  const cached = dataUrlCache.get(url);
  if (cached) return cached;
  const request = fetchBlob(url, errorMessage)
    .then((blob) => blobToDataUrl(blob, errorMessage))
    .catch((error) => {
      dataUrlCache.delete(url);
      throw error;
    });
  dataUrlCache.set(url, request);
  return request;
}

export function assetData(id: string) {
  return blobData(`/api/images/${id}`, '商品图片加载失败');
}

async function decodeImage(blob: Blob) {
  if ('createImageBitmap' in window) {
    try {
      const bitmap = await createImageBitmap(blob);
      return {
        source: bitmap as CanvasImageSource,
        width: bitmap.width,
        height: bitmap.height,
        dispose: () => bitmap.close(),
      };
    } catch {
      // Safari can reject a bitmap for a format that an HTMLImageElement still supports.
    }
  }
  const url = URL.createObjectURL(blob);
  const image = new Image();
  try {
    await new Promise<void>((resolve, reject) => {
      image.onload = () => resolve();
      image.onerror = () => reject(new Error('商品图片解码失败'));
      image.src = url;
    });
    return {
      source: image as CanvasImageSource,
      width: image.naturalWidth,
      height: image.naturalHeight,
      dispose: () => URL.revokeObjectURL(url),
    };
  } catch (error) {
    URL.revokeObjectURL(url);
    throw error;
  }
}

function canvasBlob(canvas: HTMLCanvasElement, mimeType: string, quality?: number) {
  return new Promise<Blob>((resolve, reject) =>
    canvas.toBlob(
      (value) => (value ? resolve(value) : reject(new Error('商品图片缩放失败'))),
      mimeType,
      quality,
    ),
  );
}

export async function getExportImage(
  id: string,
  displayWidth: number,
  displayHeight: number,
  pixelRatio = 2,
): Promise<PreparedExportImage> {
  const targetWidth = Math.max(1, Math.ceil(displayWidth * pixelRatio));
  const targetHeight = Math.max(1, Math.ceil(displayHeight * pixelRatio));
  const key = `${id}:${targetWidth}x${targetHeight}@${pixelRatio}`;
  const cached = exportImageCache.get(key);
  if (cached) {
    const value = await cached;
    return {
      ...value,
      cacheHit: true,
      metrics: { imageDownload: 0, imageResize: 0, imageToDataURL: 0 },
    };
  }

  const request = (async (): Promise<CachedExportImage> => {
    const downloadStart = performance.now();
    const original = await fetchBlob(`/api/images/${id}`, '商品图片加载失败');
    const imageDownload = performance.now() - downloadStart;

    const resizeStart = performance.now();
    const decoded = await decodeImage(original);
    let output = original;
    let outputWidth = decoded.width;
    let outputHeight = decoded.height;
    try {
      const scale = Math.min(1, targetWidth / decoded.width, targetHeight / decoded.height);
      if (scale < 1) {
        outputWidth = Math.max(1, Math.round(decoded.width * scale));
        outputHeight = Math.max(1, Math.round(decoded.height * scale));
        const canvas = document.createElement('canvas');
        canvas.width = outputWidth;
        canvas.height = outputHeight;
        const context = canvas.getContext('2d');
        if (!context) throw new Error('浏览器无法处理商品图片');
        context.clearRect(0, 0, outputWidth, outputHeight);
        context.imageSmoothingEnabled = true;
        context.imageSmoothingQuality = 'high';
        context.drawImage(decoded.source, 0, 0, outputWidth, outputHeight);
        const sourceIsJpeg = original.type === 'image/jpeg';
        output = await canvasBlob(canvas, sourceIsJpeg ? 'image/jpeg' : 'image/png', 0.95);
        canvas.width = 1;
        canvas.height = 1;
      }
    } finally {
      decoded.dispose();
    }
    const imageResize = performance.now() - resizeStart;

    const conversionStart = performance.now();
    const dataUrl = await blobToDataUrl(output, '商品图片转换失败');
    const imageToDataURL = performance.now() - conversionStart;
    return {
      dataUrl,
      sourceWidth: decoded.width,
      sourceHeight: decoded.height,
      outputWidth,
      outputHeight,
      creationMetrics: { imageDownload, imageResize, imageToDataURL },
    };
  })().catch((error) => {
    exportImageCache.delete(key);
    throw error;
  });
  exportImageCache.set(key, request);
  const value = await request;
  return { ...value, cacheHit: false, metrics: value.creationMetrics };
}

export function getCachedPosterExport(key: string) {
  const cached = posterExportCache.get(key);
  if (!cached) return undefined;
  posterExportCache.delete(key);
  posterExportCache.set(key, cached);
  return cached;
}

export function cachePosterExport(key: string, blob: Blob) {
  posterExportCache.set(key, blob);
  while (posterExportCache.size > maxPosterExports) {
    const oldest = posterExportCache.keys().next().value as string | undefined;
    if (!oldest) break;
    posterExportCache.delete(oldest);
  }
}

export function posterFontCss(roles: PosterFontRole[]) {
  const uniqueRoles = [...new Set(roles)].sort();
  const key = uniqueRoles.join('|');
  const cached = fontCssCache.get(key);
  if (cached) return cached;
  const request = Promise.all(
    uniqueRoles.map(
      async (role) =>
        [role, await blobData(posterFontAssets[role], '海报字体加载失败')] as const,
    ),
  )
    .then((entries) => fontFaceCss(Object.fromEntries(entries)))
    .catch((error) => {
      fontCssCache.delete(key);
      throw error;
    });
  fontCssCache.set(key, request);
  return request;
}

export function embedPosterFonts(svg: string, css: string) {
  if (!css) return svg;
  return svg.replace('<defs>', `<defs><style>${css}</style>`);
}

export async function mapWithConcurrency<T, R>(
  values: T[],
  limit: number,
  mapper: (value: T, index: number) => Promise<R>,
) {
  const results = new Array<R>(values.length);
  let nextIndex = 0;
  async function worker() {
    while (nextIndex < values.length) {
      const index = nextIndex++;
      results[index] = await mapper(values[index], index);
    }
  }
  await Promise.all(Array.from({ length: Math.min(Math.max(limit, 1), values.length) }, worker));
  return results;
}
