'use client';
import { useState } from 'react';
import { Upload, X, Plus } from 'lucide-react';
import type { Snapshot } from './types';
import { uploadProductImage } from '@/lib/image-upload';
export default function ProductEditor({
  data,
  id,
  onClose,
  onSave,
  onRefresh,
}: {
  data: Snapshot;
  id?: string;
  onClose: () => void;
  onSave: (op: string, payload: Record<string, unknown>) => Promise<unknown>;
  onRefresh: () => Promise<void>;
}) {
  const existing = data.products.find((p) => p.id === id);
  const [series, setSeries] = useState(existing?.seriesId ?? data.series[0]?.id ?? '');
  const [type, setType] = useState(existing?.productType ?? data.productTypes[0]?.key ?? '');
  const [newType, setNewType] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [savedId, setSavedId] = useState<string | undefined>(id);
  const selectedSeries = data.series.find((s) => s.id === series);
  const char = data.characters.find((c) => c.id === selectedSeries?.characterId);
  const typeName = data.productTypes.find((t) => t.key === type)?.name;
  const name = [char?.name, selectedSeries?.name, typeName].filter(Boolean).join(' · ');
  return (
    <div className="modal-backdrop">
      <section
        className="modal product-editor"
        role="dialog"
        aria-modal="true"
        aria-label={id ? '编辑图鉴商品' : '添加图鉴商品'}
      >
        <header>
          <div>
            <span className="eyebrow">ADD TO YOUR ENCYCLOPEDIA</span>
            <h2>{id ? '编辑图鉴商品' : '添加图鉴商品'}</h2>
          </div>
          <button className="icon-btn" onClick={onClose} disabled={busy} aria-label="关闭">
            <X />
          </button>
        </header>
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            setBusy(true);
            setError('');
            const f = new FormData(e.currentTarget);
            try {
              const result = (await onSave(savedId ? 'catalog.product-update' : 'catalog.product', {
                ...(savedId ? { id: savedId } : {}),
                seriesId: series,
                productType: type,
                appearanceKey: f.get('appearanceKey'),
                description: f.get('description'),
              })) as { id: string };
              setSavedId(result.id);
              if (file) {
                try {
                  await uploadProductImage(file, result.id);
                } catch (e) {
                  throw Error(
                    '商品已保存，图片尚未上传：' + (e as Error).message + '。可以直接重试保存。',
                  );
                }
              }
              await onRefresh();
              onClose();
            } catch (e) {
              setError((e as Error).message);
            } finally {
              setBusy(false);
            }
          }}
        >
          <label className="product-upload-zone">
            {preview ? (
              <img src={preview} alt="待上传商品预览" />
            ) : existing?.originalId ? (
              <img src={'/api/images/' + existing.originalId} alt="当前原图" />
            ) : (
              <Upload size={32} />
            )}
            <strong>{file ? '已选图片 · 点击更换' : '上传商品图片'}</strong>
            <small>PNG / JPG / WebP · 原图独立保存</small>
            <input
              aria-label="商品图片"
              type="file"
              accept="image/png,image/jpeg,image/webp"
              onChange={(e) => {
                const f = e.target.files?.[0] ?? null;
                setFile(f);
                if (f) {
                  const reader = new FileReader();
                  reader.onload = () => setPreview(String(reader.result));
                  reader.readAsDataURL(f);
                }
              }}
            />
          </label>
          <div className="form-grid">
            <label>
              所属系列
              <select required value={series} onChange={(e) => setSeries(e.target.value)}>
                {data.series.map((s) => (
                  <option key={s.id} value={s.id}>
                    {data.characters.find((c) => c.id === s.characterId)?.name} · {s.name}
                  </option>
                ))}
              </select>
            </label>
            <label>
              谷子类型
              <select
                required
                aria-label="谷子类型"
                value={type}
                onChange={(e) => setType(e.target.value)}
              >
                {data.productTypes.map((t) => (
                  <option key={t.key} value={t.key}>
                    {t.name}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <div className="inline-type">
            <input
              aria-label="新类型名称"
              placeholder="没有合适的类型？例如：色纸、拍立得"
              maxLength={30}
              value={newType}
              onChange={(e) => setNewType(e.target.value)}
            />
            <button
              type="button"
              disabled={busy || !newType.trim()}
              onClick={async () => {
                setBusy(true);
                setError('');
                try {
                  const t = (await onSave('catalog.type', { name: newType.trim() })) as {
                    key: string;
                  };
                  setType(t.key);
                  setNewType('');
                } catch (e) {
                  setError((e as Error).message);
                } finally {
                  setBusy(false);
                }
              }}
            >
              <Plus size={15} /> 新增类型
            </button>
          </div>
          <div className="auto-name">
            <small>自动生成的商品名</small>
            <strong>{name || '选择系列与类型后生成'}</strong>
          </div>
          <label>
            形象标识
            <input
              name="appearanceKey"
              defaultValue={existing?.appearanceKey ?? 'default'}
              required
              maxLength={100}
            />
          </label>
          <label>
            描述
            <input name="description" defaultValue={existing?.description ?? ''} maxLength={2000} />
          </label>
          {error && (
            <p className="error" role="alert">
              {error}
            </p>
          )}
          <footer>
            <button type="button" onClick={onClose} disabled={busy}>
              取消
            </button>
            <button className="primary" disabled={busy || !series || !type}>
              {busy ? '正在保存…' : '保存商品'}
            </button>
          </footer>
        </form>
      </section>
    </div>
  );
}
