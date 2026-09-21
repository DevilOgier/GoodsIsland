'use client';

import { useEffect, useMemo, useState } from 'react';
import { Download, Palette, Plus, Save } from 'lucide-react';
import type { Snapshot } from './types';
import { posterImageTargets, renderPoster, templates } from '@/poster/renderer';
import type { PosterData, PosterItemData } from '@/poster/renderer';
import {
  assetData,
  cachePosterExport,
  embedPosterFonts,
  getCachedPosterExport,
  getExportImage,
  mapWithConcurrency,
  posterFontCss,
} from '@/poster/assets';
import { posterTemplateRegistry, posterTemplates } from '@/poster/registry';
import type { PosterRenderOptions } from '@/poster/types';
import { resolveOptions } from '@/poster/utils';
import { posterPrefill } from '@/domain/poster-prefill';
import ProductPicker from './product-picker';
import { TemplateSelector } from './poster/template-selector';
import { PosterPreview } from './poster/poster-preview';
import { PosterItemList } from './poster/poster-item-list';

function exportAssetId(product: Snapshot['products'][number]) {
  return product.selectedSource === 'ENHANCED' && product.enhancedId
    ? product.enhancedId
    : product.originalId || undefined;
}

async function loadPreview(item: PosterItemData) {
  if (!item.previewAssetId) return item;
  try {
    return { ...item, image: await assetData(item.previewAssetId) };
  } catch {
    return item;
  }
}

const exportPixelRatio = 2;

function posterExportKey(format: 'png' | 'jpeg', data: PosterData) {
  return JSON.stringify({
    format,
    title: data.title,
    type: data.type,
    ratio: data.ratio,
    template: data.template,
    version: data.version,
    config: data.config,
    items: data.items.map(
      ({ productId, name, quantity, price, note, exportAssetId }) => ({
        productId,
        name,
        quantity,
        price,
        note,
        exportAssetId,
      }),
    ),
  });
}

function downloadPoster(blob: Blob, format: 'png' | 'jpeg', type: 'SALE' | 'WANTED') {
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = `谷屿-${type === 'SALE' ? '出物' : '收物'}.${format === 'jpeg' ? 'jpg' : format}`;
  link.click();
  setTimeout(() => URL.revokeObjectURL(link.href), 1000);
}

export default function PosterEditor({
  data,
  onSaved,
  source,
  sourceId,
}: {
  data: Snapshot;
  onSaved: () => Promise<void>;
  source?: string;
  sourceId?: string;
}) {
  const [initial] = useState(() => posterPrefill(data, source, sourceId));
  const [type, setType] = useState<'SALE' | 'WANTED'>(initial.type);
  const [version, setVersion] = useState(3);
  const [picking, setPicking] = useState(false);
  const [previewLoading, setPreviewLoading] = useState(
    initial.items.some((item) => Boolean(item.previewAssetId)),
  );
  const [title, setTitle] = useState(initial.title);
  const [ratio, setRatio] = useState('1:1');
  const [template, setTemplate] = useState('polaroid');
  const [config, setConfig] = useState<PosterRenderOptions>({
    ...posterTemplates[0].defaultOptions,
  });
  const [items, setItems] = useState<PosterItemData[]>(initial.items);
  const [status, setStatus] = useState('');
  const [busy, setBusy] = useState(false);
  const [posterFontReady, setPosterFontReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    document.fonts
      .load("400 32px 'Goods Island Chinese Hand'", '出一些心动收藏谷子名称价格')
      .then(() => {
        if (!cancelled) setPosterFontReady(true);
      })
      .catch(() => {
        if (!cancelled) setPosterFontReady(true);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const activeTemplate = posterTemplateRegistry.get(template);
    if (!activeTemplate) return;
    const warmFonts = () => {
      void posterFontCss(activeTemplate.exportFonts ?? ['sans']).catch(() => undefined);
    };
    if ('requestIdleCallback' in window) {
      const idleId = window.requestIdleCallback(warmFonts, { timeout: 1200 });
      return () => window.cancelIdleCallback(idleId);
    }
    const timeoutId = setTimeout(warmFonts, 250);
    return () => clearTimeout(timeoutId);
  }, [template]);

  const productMap = useMemo(
    () => new Map(data.products.map((product) => [product.id, product])),
    [data.products],
  );
  const availableInventoryIds = useMemo(
    () =>
      new Set(
        data.inventory
          .filter((inventory) => inventory.currentQuantity > 0)
          .map((inventory) => inventory.productId),
      ),
    [data.inventory],
  );
  const products = useMemo(
    () =>
      data.products.filter((product) => type === 'WANTED' || availableInventoryIds.has(product.id)),
    [availableInventoryIds, data.products, type],
  );
  const allowedIds = useMemo(() => {
    const selected = new Set(items.map((item) => item.productId));
    return products.filter((product) => !selected.has(product.id)).map((product) => product.id);
  }, [items, products]);

  const rendered = useMemo(() => {
    try {
      return {
        svg: renderPoster({ title, type, ratio, template, items, version, config }),
        error: '',
      };
    } catch (error) {
      return { svg: '', error: (error as Error).message };
    }
  }, [config, items, ratio, template, title, type, version]);

  const exportData = useMemo<PosterData>(
    () => ({
      title,
      type,
      ratio,
      template,
      version,
      config,
      items: items.map((item) => ({ ...item, image: undefined })),
    }),
    [config, items, ratio, template, title, type, version],
  );
  const exportAssetPlan = useMemo(() => {
    if (!exportData.items.length) return [];
    const targets = posterImageTargets(exportData);
    return exportData.items.flatMap((item) => {
      const target = targets.get(item.productId);
      return item.exportAssetId && target ? [{ item, target }] : [];
    });
  }, [exportData]);

  useEffect(() => {
    if (!exportAssetPlan.length) return;
    let cancelled = false;
    let idleId: number | undefined;
    const prepare = () => {
      if (cancelled) return;
      void mapWithConcurrency(exportAssetPlan, 2, async ({ item, target }) => {
        if (cancelled || !item.exportAssetId) return;
        await getExportImage(
          item.exportAssetId,
          target.displayWidth,
          target.displayHeight,
          exportPixelRatio,
        );
      }).catch(() => undefined);
    };
    const timeoutId = window.setTimeout(() => {
      if ('requestIdleCallback' in window) {
        idleId = window.requestIdleCallback(prepare, { timeout: 1500 });
      } else {
        prepare();
      }
    }, 350);
    return () => {
      cancelled = true;
      window.clearTimeout(timeoutId);
      if (idleId !== undefined) window.cancelIdleCallback(idleId);
    };
  }, [exportAssetPlan]);

  useEffect(() => {
    let cancelled = false;
    if (!initial.items.some((item) => item.previewAssetId)) return;
    Promise.all(initial.items.map(loadPreview))
      .then((loaded) => {
        if (!cancelled) setItems(loaded);
      })
      .finally(() => {
        if (!cancelled) setPreviewLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [initial]);

  function add(productId: string) {
    if (!productId || items.some((item) => item.productId === productId)) return;
    const product = productMap.get(productId);
    if (!product) return;

    setStatus('');
    const item: PosterItemData = {
      productId,
      name: product.name,
      quantity: 1,
      price: '',
      note: '',
      previewAssetId: product.thumbnailId || product.originalId || undefined,
      exportAssetId: exportAssetId(product),
    };
    setItems((current) =>
      current.some((value) => value.productId === productId) ? current : [...current, item],
    );

    if (item.previewAssetId) {
      void loadPreview(item).then((loaded) => {
        setItems((current) =>
          current.map((value) =>
            value.productId === productId ? { ...value, image: loaded.image } : value,
          ),
        );
      });
    }
  }

  async function exportImage(format: 'png' | 'jpeg') {
    setBusy(true);
    setStatus('正在准备导出图片...');
    const totalStart = performance.now();
    const timings = {
      prepareImages: 0,
      imageDownload: 0,
      imageResize: 0,
      imageToDataURL: 0,
      fontPrepare: 0,
      svgGenerate: 0,
      svgToImage: 0,
      canvasDraw: 0,
      canvasEncode: 0,
      totalExport: 0,
    };
    let cacheHit = false;
    try {
      const cacheKey = posterExportKey(format, exportData);
      const cachedPoster = getCachedPosterExport(cacheKey);
      if (cachedPoster) {
        cacheHit = true;
        downloadPoster(cachedPoster, format, type);
        setStatus('海报已导出');
        return;
      }

      const activeTemplate = posterTemplateRegistry.get(template);
      const exportFonts = activeTemplate?.exportFonts ?? ['sans'];
      const targets = posterImageTargets(exportData);
      const imageStart = performance.now();
      const imagesPromise = mapWithConcurrency(exportData.items, 2, async (item) => {
        if (!item.exportAssetId) return { item: { ...item, image: undefined }, metrics: null };
        const target = targets.get(item.productId);
        if (!target) return { item: { ...item, image: undefined }, metrics: null };
        try {
          const prepared = await getExportImage(
            item.exportAssetId,
            target.displayWidth,
            target.displayHeight,
            exportPixelRatio,
          );
          return { item: { ...item, image: prepared.dataUrl }, metrics: prepared.metrics };
        } catch {
          throw new Error(`“${item.name}”高清图加载失败，请稍后重试`);
        }
      }).then((prepared) => {
        timings.prepareImages = performance.now() - imageStart;
        for (const result of prepared) {
          if (!result.metrics) continue;
          timings.imageDownload += result.metrics.imageDownload;
          timings.imageResize += result.metrics.imageResize;
          timings.imageToDataURL += result.metrics.imageToDataURL;
        }
        return prepared.map((result) => result.item);
      });
      const fontStart = performance.now();
      const fontsPromise = posterFontCss(exportFonts).then((value) => {
        timings.fontPrepare = performance.now() - fontStart;
        return value;
      });
      const [exportItems, embeddedFontCss] = await Promise.all([imagesPromise, fontsPromise]);

      setStatus('正在生成海报...');
      const renderStart = performance.now();
      const svg = embedPosterFonts(
        renderPoster({
          ...exportData,
          items: exportItems,
        }),
        embeddedFontCss,
      );
      timings.svgGenerate = performance.now() - renderStart;

      const url = URL.createObjectURL(new Blob([svg], { type: 'image/svg+xml;charset=utf-8' }));
      try {
        const image = new Image();
        const decodeStart = performance.now();
        await new Promise<void>((resolve, reject) => {
          image.onload = () => resolve();
          image.onerror = () => reject(new Error('海报渲染失败'));
          image.src = url;
        });
        timings.svgToImage = performance.now() - decodeStart;

        const drawStart = performance.now();
        const canvas = document.createElement('canvas');
        canvas.width = image.width;
        canvas.height = image.height;
        const context = canvas.getContext('2d');
        if (!context) throw new Error('浏览器无法创建海报画布');
        context.fillStyle = '#ffffff';
        context.fillRect(0, 0, canvas.width, canvas.height);
        context.drawImage(image, 0, 0);
        timings.canvasDraw = performance.now() - drawStart;
        const blobStart = performance.now();
        const blob = await new Promise<Blob>((resolve, reject) =>
          canvas.toBlob(
            (value) => (value ? resolve(value) : reject(new Error('图片导出失败'))),
            `image/${format}`,
            0.95,
          ),
        );
        timings.canvasEncode = performance.now() - blobStart;
        canvas.width = 1;
        canvas.height = 1;
        cachePosterExport(cacheKey, blob);
        downloadPoster(blob, format, type);
        setStatus('海报已导出');
      } finally {
        URL.revokeObjectURL(url);
      }
    } catch (error) {
      setStatus((error as Error).message);
    } finally {
      timings.totalExport = performance.now() - totalStart;
      if (process.env.NODE_ENV !== 'production') {
        console.info('[poster-export]', { ...timings, cacheHit });
      }
      setBusy(false);
    }
  }

  async function loadSavedPoster(poster: Snapshot['posters'][number]) {
    setType(poster.type as 'SALE' | 'WANTED');
    setTitle(poster.title);
    setRatio(poster.ratio);
    setTemplate(poster.template.key);
    setVersion(poster.template.version);
    const nextTemplate = posterTemplateRegistry.get(poster.template.key);
    if (nextTemplate) {
      setConfig(
        resolveOptions(
          nextTemplate.defaultOptions,
          poster.templateConfig as Partial<PosterRenderOptions>,
        ),
      );
    }
    setStatus('');

    const baseItems: PosterItemData[] = poster.items.map((item) => {
      const product = productMap.get(item.productId);
      return {
        productId: item.productId,
        name: (item.productSnapshot as { name: string }).name,
        quantity: item.quantity,
        price: item.price ?? '',
        note: item.note,
        previewAssetId: product?.thumbnailId || product?.originalId || undefined,
        exportAssetId: item.imageAssetId || (product ? exportAssetId(product) : undefined),
      };
    });
    setItems(baseItems);
    setPreviewLoading(baseItems.some((item) => Boolean(item.previewAssetId)));
    const loaded = await Promise.all(baseItems.map(loadPreview));
    setItems(loaded);
    setPreviewLoading(false);
  }

  return (
    <>
      <div className="page-intro">
        <span className="eyebrow">MADE WITH LITTLE JOYS</span>
        <h1>
          海报工坊 <Palette size={28} />
        </h1>
        <p>选几件喜欢，做一张属于你的收出物图。</p>
      </div>
      <div className="poster-workspace">
        <section className="poster-settings">
          <h3>01 / 想做哪一种？</h3>
          <div className="segmented">
            <button
              className={type === 'SALE' ? 'selected' : ''}
              onClick={() => {
                setType('SALE');
                setTitle('出一些心动收藏');
                setItems([]);
              }}
            >
              出物图
            </button>
            <button
              className={type === 'WANTED' ? 'selected' : ''}
              onClick={() => {
                setType('WANTED');
                setTitle('收一些心动收藏');
                setItems([]);
              }}
            >
              收物图
            </button>
          </div>
          <label>
            海报标题
            <input
              maxLength={24}
              value={title}
              onChange={(event) => setTitle(event.target.value)}
            />
          </label>
          <h3>02 / 放进你的喜欢</h3>
          <button className="poster-picker-button" onClick={() => setPicking(true)}>
            <Plus size={16} /> 从系列图鉴添加
          </button>
          {source && (
            <p className="notice">
              已带入{source === 'wanted' ? '未收齐心愿' : '剩余挂出'}
              的商品、数量、价格和备注，可以继续编辑。
            </p>
          )}
          {previewLoading && <p className="muted">正在准备预览缩略图，不影响继续编辑。</p>}
          <PosterItemList items={items} onChange={setItems} />
          <TemplateSelector
            ratio={ratio}
            template={template}
            config={config}
            onRatioChange={setRatio}
            onTemplateChange={(key) => {
              const nextTemplate = posterTemplateRegistry.get(key);
              if (!nextTemplate) return;
              setTemplate(key);
              setConfig({ ...nextTemplate.defaultOptions });
              setVersion(3);
            }}
            onConfigChange={setConfig}
          />
          <p className="muted">导出海报不会挂出或扣库存。挂出请在“正在出物”中操作。</p>
          <button
            disabled={busy || !rendered.svg}
            onClick={async () => {
              setBusy(true);
              setStatus('');
              try {
                const response = await fetch('/api/posters', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    title,
                    type,
                    ratio,
                    template,
                    templateVersion: version,
                    templateConfig: config,
                    items: items.map(({ productId, quantity, price, note }) => ({
                      productId,
                      quantity,
                      price,
                      note,
                    })),
                  }),
                });
                const body = await response.json();
                if (!response.ok) throw new Error(body.error);
                await onSaved();
                setStatus('海报已保存到作品集');
              } catch (error) {
                setStatus((error as Error).message);
              } finally {
                setBusy(false);
              }
            }}
          >
            <Save size={16} /> 保存到作品集
          </button>
        </section>
        <PosterPreview
          key={posterFontReady ? 'poster-font-ready' : 'poster-font-loading'}
          svg={rendered.svg}
          error={rendered.error}
          ratio={ratio}
          templateLabel={templates[template]?.label ?? '历史模板'}
          status={status}
        >
          <button
            className="primary"
            disabled={busy || !rendered.svg}
            onClick={() => exportImage('png')}
          >
            <Download size={16} /> {busy ? '正在生成…' : '导出 PNG'}
          </button>
          <button disabled={busy || !rendered.svg} onClick={() => exportImage('jpeg')}>
            导出 JPG
          </button>
        </PosterPreview>
      </div>
      {picking && (
        <ProductPicker
          data={data}
          allowedIds={allowedIds}
          onClose={() => setPicking(false)}
          onSelect={(product) => {
            add(product.id);
            setPicking(false);
          }}
        />
      )}
      <section className="section-heading">
        <h2>我的作品集</h2>
        <span>{data.posters.length} 张</span>
      </section>
      <div className="saved-posters">
        {data.posters.map((poster) => (
          <button key={poster.id} onClick={() => void loadSavedPoster(poster)}>
            <Palette size={20} />
            <strong>{poster.title}</strong>
            <small>
              {poster.ratio} · {poster.items.length} 件
            </small>
          </button>
        ))}
      </div>
    </>
  );
}
