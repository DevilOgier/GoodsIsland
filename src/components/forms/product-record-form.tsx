'use client';

import { useState } from 'react';
import { Images, X } from 'lucide-react';
import ProductArt from '../product-art';
import ProductPicker from '../product-picker';
import type { Snapshot } from '../types';

export type RecordField = {
  name: string;
  label: string;
  kind?: string;
  options?: [string, string][];
  value?: string;
  required?: boolean;
  min?: string;
};

type ProductRecordFormProps = {
  data: Snapshot;
  title: string;
  operation: string;
  formType: string;
  fields: RecordField[];
  initialProductId?: string;
  lockProduct?: boolean;
  allowedIds?: string[];
  onClose: () => void;
  onSave: (operation: string, payload: Record<string, unknown>) => Promise<unknown>;
  preparePayload?: (payload: Record<string, unknown>) => void;
};

export default function ProductRecordForm({
  data,
  title,
  operation,
  formType,
  fields,
  initialProductId,
  lockProduct = false,
  allowedIds,
  onClose,
  onSave,
  preparePayload,
}: ProductRecordFormProps) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [pickedId, setPickedId] = useState(initialProductId ?? '');
  const [picking, setPicking] = useState(false);
  const picked = data.products.find((product) => product.id === pickedId);

  return (
    <div
      className={`modal-backdrop action-form-backdrop action-form-backdrop--${formType}`}
      onClick={(event) => {
        if (event.target === event.currentTarget && !busy) onClose();
      }}
    >
      <section
        className={`modal action-form action-form--${formType}`}
        role="dialog"
        aria-modal="true"
        aria-label={title}
      >
        <header>
          <div>
            <span className="eyebrow">A NEW LITTLE STORY</span>
            <h2>{title}</h2>
          </div>
          <button className="icon-btn" onClick={onClose} aria-label="关闭">
            <X />
          </button>
        </header>
        <form
          onSubmit={async (event) => {
            event.preventDefault();
            setBusy(true);
            setError('');
            const payload: Record<string, unknown> = Object.fromEntries(
              new FormData(event.currentTarget),
            );
            for (const key of ['quantity', 'wantedQuantity'])
              if (payload[key]) payload[key] = Number(payload[key]);
            preparePayload?.(payload);
            try {
              if (!pickedId) throw Error('请先从系列图鉴选择谷子');
              await onSave(operation, payload);
              onClose();
            } catch (cause) {
              setError((cause as Error).message);
            } finally {
              setBusy(false);
            }
          }}
        >
          <div className="form-grid">
            <div className="chosen-product">
              <span>选择谷子</span>
              <input type="hidden" name="productId" value={pickedId} />
              <button
                type="button"
                aria-label="从系列图鉴选择谷子"
                disabled={lockProduct}
                onClick={() => setPicking(true)}
              >
                {picked ? (
                  <>
                    <ProductArt product={picked} />
                    <span>
                      <strong>{picked.name}</strong>
                      <small>点击更换系列 / 类型</small>
                    </span>
                  </>
                ) : (
                  <>
                    <Images />
                    <span>浏览系列图鉴，选择买到的谷子</span>
                  </>
                )}
              </button>
            </div>
            {fields.map((field) => (
              <label key={field.name}>
                {field.label}
                {field.options ? (
                  <select
                    aria-label={field.label}
                    name={field.name}
                    defaultValue={field.value ?? field.options[0]?.[0]}
                    required={field.required !== false}
                  >
                    {field.options.map(([value, label]) => (
                      <option key={value} value={value}>
                        {label}
                      </option>
                    ))}
                  </select>
                ) : (
                  <input
                    name={field.name}
                    type={field.kind ?? 'text'}
                    defaultValue={field.value ?? ''}
                    step={
                      field.kind === 'number'
                        ? field.name.includes('Quantity') || field.name === 'quantity'
                          ? '1'
                          : '0.01'
                        : undefined
                    }
                    min={field.min}
                    required={field.required !== false}
                    maxLength={field.kind ? undefined : 2000}
                  />
                )}
              </label>
            ))}
          </div>
          {error && (
            <p role="alert" className="error">
              {error}
            </p>
          )}
          <footer>
            <button type="button" onClick={onClose}>
              取消
            </button>
            <button className="primary" disabled={busy}>
              {busy ? '正在保存…' : '确认保存'}
            </button>
          </footer>
        </form>
      </section>
      {picking && (
        <ProductPicker
          data={data}
          selectedId={pickedId}
          allowedIds={allowedIds}
          onClose={() => setPicking(false)}
          onSelect={(product) => {
            setPickedId(product.id);
            setPicking(false);
          }}
        />
      )}
    </div>
  );
}
