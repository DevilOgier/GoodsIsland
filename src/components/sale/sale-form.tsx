'use client';

import ProductRecordForm, { type RecordField } from '../forms/product-record-form';
import type { Snapshot } from '../types';

export default function SaleForm({
  data,
  productId,
  listingId,
  onClose,
  onSave,
}: {
  data: Snapshot;
  productId?: string;
  listingId?: string;
  onClose: () => void;
  onSave: (operation: string, payload: Record<string, unknown>) => Promise<unknown>;
}) {
  const date = new Date().toLocaleDateString('sv-SE');
  const fields: RecordField[] = [
    { name: 'quantity', label: '数量', kind: 'number', value: '1', min: '1' },
    { name: 'unitPrice', label: '单价（元）', kind: 'number', value: '0', min: '0' },
    {
      name: 'saleChannel',
      label: '出物渠道',
      options: ['闲鱼', '面交', '群内', '朋友', '其他'].map((value) => [value, value]),
    },
    { name: 'saleDate', label: '成交日期', kind: 'date', value: date },
    { name: 'notes', label: '备注', required: false },
  ];
  return (
    <ProductRecordForm
      data={data}
      title="确认真正卖出"
      operation="sale.create"
      formType="sale"
      fields={fields}
      initialProductId={productId}
      lockProduct={Boolean(listingId)}
      allowedIds={data.inventory
        .filter((item) => item.currentQuantity > 0)
        .map((item) => item.productId)}
      onClose={onClose}
      onSave={onSave}
      preparePayload={(payload) => {
        if (listingId) payload.listingId = listingId;
      }}
    />
  );
}
