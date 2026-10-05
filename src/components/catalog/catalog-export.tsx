'use client';
import { useMemo, useRef, useState, useEffect } from 'react';
import { Download } from 'lucide-react';
import type { Product } from '../types';
import { Modal } from '../ui/sheet';
import { catalogExportPages, renderCatalogSheet } from '../../catalog/export';
import styles from './catalog-export.module.css';
import { preparePreviewFonts } from '../../poster/preview-fonts';

export default function CatalogExport({
  products,
  initialType,
}: {
  products: Product[];
  initialType?: string;
}) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <div className={styles.trigger}>
        <button className="small-btn" onClick={() => setOpen(true)} disabled={!products.length}>
          <Download size={16} /> 导出类型图鉴
        </button>
      </div>
      {open && (
        <ExportDialog
          products={products}
          initialType={initialType}
          onClose={() => setOpen(false)}
        />
      )}
    </>
  );
}
function ExportDialog({
  products,
  initialType,
  onClose,
}: {
  products: Product[];
  initialType?: string;
  onClose: () => void;
}) {
  const types = useMemo(
    () => [...new Map(products.map((p) => [p.productType, p.typeDefinition.name])).entries()],
    [products],
  );
  const [type, setType] = useState(
    initialType && types.some(([id]) => id === initialType) ? initialType : (types[0]?.[0] ?? ''),
  );
  const [character, setCharacter] = useState('');
  const [title, setTitle] = useState('');
  const [showDate, setShowDate] = useState(false);

  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState('');
  const [job, setJob] = useState('');
  const [download, setDownload] = useState('');
  const requestRef = useRef<AbortController | null>(null);
  useEffect(() => () => requestRef.current?.abort(), []);
  useEffect(() => {
    if (!job) return;
    const controller = new AbortController();
    let timer: ReturnType<typeof setTimeout>;
    async function poll() {
      try {
        const response = await fetch('/api/catalog-export/' + job, { signal: controller.signal });
        const result = await response.json();
        if (!response.ok) throw Error(result.error || '获取图鉴失败');
        if (result.status === 'ready') {
          setDownload(result.url);
          setStatus(
            '远端长图已就绪 · 更新于 ' + new Date(result.generatedAt).toLocaleString('zh-CN'),
          );
          setBusy(false);
        } else if (result.status === 'failed') {
          setStatus(result.error + '，后台会自动重试。');
          setBusy(false);
        } else {
          setStatus('后台正在生成长图，可以关闭窗口，稍后再来下载。');
          timer = setTimeout(poll, 3000);
        }
      } catch (error) {
        if (!controller.signal.aborted) {
          setStatus(error instanceof Error ? error.message : '读取失败');
          setBusy(false);
        }
      }
    }
    void poll();
    return () => {
      controller.abort();
      clearTimeout(timer);
    };
  }, [job]);
  const characters = useMemo(
    () => [
      ...new Map(
        products
          .filter((p) => p.productType === type)
          .map((p) => [p.series.character.id, p.series.character.name]),
      ).entries(),
    ],
    [products, type],
  );
  const pages = useMemo(
    () => catalogExportPages(products, type, character),
    [products, type, character],
  );
  const automaticTitle =
    (character
      ? (characters.find(([id]) => id === character)?.[1] ?? '')
      : characters.length === 1
        ? characters[0][1]
        : '') +
    (types.find(([id]) => id === type)?.[1] ?? '') +
    '图鉴';
  const heading = title.trim() || automaticTitle;
  const items = pages[0] ?? [];
  const preview = renderCatalogSheet(
    items.map((p) => ({
      name: p.name,
      date: p.releaseDate,
      image:
        p.thumbnailId || p.originalId
          ? '/api/images/' + (p.thumbnailId || p.originalId)
          : undefined,
    })),
    heading,
    1,
    pages.length,
    showDate,
  );
  useEffect(() => {
    void preparePreviewFonts(
      ['chineseHandwriting'],
      preview.replace(/<[^>]*>/g, ''),
      'catalog',
    ).catch(() => {
      // Keep the preview usable with its explicit system fallback if a font cannot load.
    });
  }, [preview]);
  function reset() {
    requestRef.current?.abort();
    setJob('');
    setStatus('');
    setDownload('');
    setBusy(false);
  }
  async function generate() {
    if (busy || !items.length || items.length > 500) return;
    reset();
    setBusy(true);
    setStatus('正在获取远端图鉴…');
    const controller = new AbortController();
    requestRef.current = controller;
    try {
      const response = await fetch('/api/catalog-export', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: controller.signal,
        body: JSON.stringify({
          type,
          character,
          ids: items.map((p) => p.id),
          title: heading,
          showDate,
        }),
      });
      const result = await response.json();
      if (!response.ok) throw Error(result.error || '获取图鉴失败');
      setJob(result.id);
      if (result.status === 'ready') {
        setDownload(result.url);
        setBusy(false);
        setStatus(
          '远端长图已就绪 · 更新于 ' + new Date(result.generatedAt).toLocaleString('zh-CN'),
        );
      } else setStatus('后台正在生成长图，可以关闭窗口，稍后再来下载。');
    } catch (error) {
      if (!controller.signal.aborted) {
        setStatus(error instanceof Error ? error.message : '获取图鉴失败');
        setBusy(false);
      }
    }
  }
  return (
    <Modal
      open
      title="导出类型图鉴"
      description="白底长图 · 远端预生成 · 每日更新"
      onClose={onClose}
      className={styles.panel}
    >
      <div className={styles.content}>
        <fieldset disabled={busy} style={{ border: 0, padding: 0, margin: 0, minWidth: 0 }}>
          <div className={styles.fields}>
            <label>
              周边类型
              <select
                aria-label="周边类型"
                value={type}
                onChange={(e) => {
                  setType(e.target.value);
                  setCharacter('');
                  reset();
                }}
              >
                {types.map(([id, name]) => (
                  <option key={id} value={id}>
                    {name}
                  </option>
                ))}
              </select>
            </label>
            <label>
              角色
              <select
                aria-label="角色"
                value={character}
                onChange={(e) => {
                  setCharacter(e.target.value);
                  reset();
                }}
              >
                <option value="">全部角色</option>
                {characters.map(([id, name]) => (
                  <option key={id} value={id}>
                    {name}
                  </option>
                ))}
              </select>
            </label>
            <label className={styles.title}>
              图鉴标题
              <input
                maxLength={100}
                value={title}
                placeholder={automaticTitle}
                onChange={(e) => {
                  setTitle(e.target.value);
                  reset();
                }}
              />
            </label>
          </div>
          <label className={styles.check}>
            <input
              type="checkbox"
              checked={showDate}
              onChange={(e) => {
                setShowDate(e.target.checked);
                reset();
              }}
            />
            显示发售日期
          </label>
        </fieldset>
        <p className={styles.hint}>
          沿用当前筛选，按发售时间倒序，共 {items.length} 款，导出为一张长图。
          常用类型和角色图鉴提前生成，每晚北京时间 03:00 检查更新；首次自定义筛选在后台生成后缓存。
          保留原图形状，不自动抠图。
        </p>
        {items.length > 500 && (
          <p role="alert">超过 500 款，请按角色或系列缩小范围，避免长图过大。</p>
        )}
        {items.length > 0 ? (
          <div className={styles.preview} dangerouslySetInnerHTML={{ __html: preview }} />
        ) : (
          <p>该类型下没有符合筛选的商品。</p>
        )}
        <div className={styles.actions}>
          {!download && (
            <button
              className="primary"
              disabled={busy || !items.length || items.length > 500}
              onClick={generate}
            >
              <Download size={17} />
              {busy ? '后台准备中…' : '获取长图'}
            </button>
          )}
          {download && (
            <a className="primary" href={download} download>
              <Download size={17} /> 下载长图 PNG
            </a>
          )}
        </div>
        <p role="status" aria-live="polite">
          {status}
        </p>
      </div>
    </Modal>
  );
}
