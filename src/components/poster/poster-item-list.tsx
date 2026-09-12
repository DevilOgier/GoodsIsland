'use client';

import { X } from 'lucide-react';
import type { PosterItemData } from '@/poster/renderer';

export function PosterItemList({
  items,
  onChange,
}: {
  items: PosterItemData[];
  onChange: (items: PosterItemData[]) => void;
}) {
  return items.map((item, index) => (
    <div className="poster-item" key={item.productId}>
      <div>
        <strong>{item.name}</strong>
        <button
          className="icon-btn"
          aria-label={`移除${item.name}`}
          onClick={() => onChange(items.filter((_, position) => position !== index))}
        >
          <X size={15} />
        </button>
      </div>
      <div className="form-grid">
        <label>
          数量
          <input
            aria-label={`海报数量${index}`}
            type="number"
            min="1"
            value={item.quantity}
            onChange={(event) =>
              onChange(
                items.map((value, position) =>
                  position === index ? { ...value, quantity: Number(event.target.value) } : value,
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
            onChange={(event) =>
              onChange(
                items.map((value, position) =>
                  position === index ? { ...value, price: event.target.value } : value,
                ),
              )
            }
          />
        </label>
      </div>
      <input
        placeholder="备注（可选）"
        maxLength={80}
        value={item.note}
        onChange={(event) =>
          onChange(
            items.map((value, position) =>
              position === index ? { ...value, note: event.target.value } : value,
            ),
          )
        }
      />
    </div>
  ));
}
