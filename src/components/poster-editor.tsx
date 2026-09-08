'use client';
import { useMemo, useState } from 'react';
import { Download, Palette, Save, Plus, X } from 'lucide-react';
import type { Snapshot } from './types';
import { renderPoster, templates, ratios } from '@/poster/renderer';
import type { PosterItemData } from '@/poster/renderer';
export default function PosterEditor({
  data,
  onSaved,
}: {
  data: Snapshot;
  onSaved: () => Promise<void>;
}) {
  const [type, setType] = useState<'SALE' | 'WANTED'>('SALE');
  const [title, setTitle] = useState('出一些心动收藏');
  const [ratio, setRatio] = useState('1:1');
  const [template, setTemplate] = useState('cute');
  const [items, setItems] = useState<PosterItemData[]>([]);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const rendered = useMemo(() => {
    try {
      return { svg: renderPoster({ title, type, ratio, template, items }), error: '' };
    } catch (e) {
      return { svg: '', error: (e as Error).message };
    }
  }, [title, type, ratio, template, items]);
  async function assetData(id: string) {
    const r = await fetch('/api/images/' + id);
    if (!r.ok) throw Error('商品图片加载失败');
    const blob = await r.blob();
    return await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result));
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  }
  async function add(productId: string) {
    if (!productId || items.some((i) => i.productId === productId)) return;
    const p = data.products.find((p) => p.id === productId)!;
    setError('');
    try {
      const asset = p.selectedSource === 'ENHANCED' && p.enhancedId ? p.enhancedId : p.originalId;
      const image = asset ? await assetData(asset) : undefined;
      setItems((old) => [
        ...old,
        { productId, name: p.name, quantity: 1, price: '', note: '', image },
      ]);
    } catch (e) {
      setError((e as Error).message);
    }
  }
  async function exportImage(format: 'png' | 'jpeg') {
    setBusy(true);
    setError('');
    try {
      if (!rendered.svg) throw Error(rendered.error);
      await document.fonts.ready;
      const url = URL.createObjectURL(
        new Blob([rendered.svg], { type: 'image/svg+xml;charset=utf-8' }),
      );
      try {
        const image = new Image();
        await new Promise<void>((resolve, reject) => {
          image.onload = () => resolve();
          image.onerror = () => reject(Error('海报渲染失败'));
          image.src = url;
        });
        const canvas = document.createElement('canvas');
        canvas.width = image.width;
        canvas.height = image.height;
        const ctx = canvas.getContext('2d')!;
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(image, 0, 0);
        const blob = await new Promise<Blob>((resolve, reject) =>
          canvas.toBlob(
            (b) => (b ? resolve(b) : reject(Error('图片导出失败'))),
            'image/' + format,
            0.95,
          ),
        );
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download =
          '谷屿-' +
          (type === 'SALE' ? '出物' : '收物') +
          '.' +
          (format === 'jpeg' ? 'jpg' : format);
        link.click();
        setTimeout(() => URL.revokeObjectURL(link.href), 1000);
      } finally {
        URL.revokeObjectURL(url);
      }
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  const products = data.products.filter(
    (p) =>
      type === 'WANTED' ||
      data.inventory.some((i) => i.productId === p.id && i.currentQuantity > 0),
  );
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
            <input maxLength={24} value={title} onChange={(e) => setTitle(e.target.value)} />
          </label>
          <h3>02 / 放进你的喜欢</h3>
          <select aria-label="添加海报商品" value="" onChange={(e) => void add(e.target.value)}>
            <option value="">＋ 选择商品</option>
            {products.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
          {items.map((item, i) => (
            <div className="poster-item" key={item.productId}>
              <div>
                <strong>{item.name}</strong>
                <button
                  className="icon-btn"
                  aria-label={'移除' + item.name}
                  onClick={() => setItems(items.filter((_, n) => n !== i))}
                >
                  <X size={15} />
                </button>
              </div>
              <div className="form-grid">
                <label>
                  数量
                  <input
                    aria-label={'海报数量' + i}
                    type="number"
                    min="1"
                    value={item.quantity}
                    onChange={(e) =>
                      setItems(
                        items.map((v, n) =>
                          n === i ? { ...v, quantity: Number(e.target.value) } : v,
                        ),
                      )
                    }
                  />
                </label>
                <label>
                  单价
                  <input
                    placeholder="可议"
                    value={item.price}
                    onChange={(e) =>
                      setItems(items.map((v, n) => (n === i ? { ...v, price: e.target.value } : v)))
                    }
                  />
                </label>
              </div>
              <input
                placeholder="备注（可选）"
                maxLength={80}
                value={item.note}
                onChange={(e) =>
                  setItems(items.map((v, n) => (n === i ? { ...v, note: e.target.value } : v)))
                }
              />
            </div>
          ))}
          <h3>03 / 选择纸张和风格</h3>
          <div className="ratio-options">
            {Object.keys(ratios).map((r) => (
              <button className={ratio === r ? 'selected' : ''} key={r} onClick={() => setRatio(r)}>
                {r}
              </button>
            ))}
          </div>
          <div className="template-options">
            {Object.entries(templates).map(([key, t]) => (
              <button
                className={template === key ? 'selected' : ''}
                style={{ background: t.background }}
                key={key}
                onClick={() => setTemplate(key)}
              >
                {t.label}
              </button>
            ))}
          </div>
          <p className="muted">导出海报不会挂出或扣库存。挂出请在“正在出物”中操作。</p>
          <button
            disabled={busy || !rendered.svg}
            onClick={async () => {
              setBusy(true);
              setError('');
              try {
                const r = await fetch('/api/posters', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    title,
                    type,
                    ratio,
                    template,
                    items: items.map(({ productId, quantity, price, note }) => ({
                      productId,
                      quantity,
                      price,
                      note,
                    })),
                  }),
                });
                const j = await r.json();
                if (!r.ok) throw Error(j.error);
                await onSaved();
                setError('海报已保存到作品集');
              } catch (e) {
                setError((e as Error).message);
              } finally {
                setBusy(false);
              }
            }}
          >
            <Save size={16} /> 保存到作品集
          </button>
        </section>
        <section className="poster-preview-panel">
          <div className="preview-heading">
            <span>实时预览</span>
            <small>
              {ratio} · {templates[template].label}
            </small>
          </div>
          <div className="poster-preview">
            {rendered.svg ? (
              <img
                src={'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(rendered.svg)}
                alt="海报实时预览"
              />
            ) : (
              <div className="empty">
                <Plus size={32} />
                <p>{rendered.error}</p>
              </div>
            )}
          </div>
          {error && (
            <p role="status" className="notice">
              {error}
            </p>
          )}
          <div className="export-actions">
            <button
              className="primary"
              disabled={busy || !rendered.svg}
              onClick={() => exportImage('png')}
            >
              <Download size={16} /> 导出 PNG
            </button>
            <button disabled={busy || !rendered.svg} onClick={() => exportImage('jpeg')}>
              导出 JPG
            </button>
          </div>
        </section>
      </div>
      <section className="section-heading">
        <h2>我的作品集</h2>
        <span>{data.posters.length} 张</span>
      </section>
      <div className="saved-posters">
        {data.posters.map((p) => (
          <button
            key={p.id}
            onClick={async () => {
              setType(p.type as 'SALE' | 'WANTED');
              setTitle(p.title);
              setRatio(p.ratio);
              setTemplate(p.template.key);
              try {
                const loaded = await Promise.all(
                  p.items.map(async (i) => ({
                    productId: i.productId,
                    name: (i.productSnapshot as { name: string }).name,
                    quantity: i.quantity,
                    price: i.price ?? '',
                    note: i.note,
                    image: i.imageAssetId ? await assetData(i.imageAssetId) : undefined,
                  })),
                );
                setItems(loaded);
              } catch (e) {
                setError((e as Error).message);
              }
            }}
          >
            <Palette size={20} />
            <strong>{p.title}</strong>
            <small>
              {p.ratio} · {p.items.length} 件
            </small>
          </button>
        ))}
      </div>
    </>
  );
}
