'use client';

import ProductRecordForm, { type RecordField } from '../forms/product-record-form';
import type { Snapshot } from '../types';

export default function WantedForm({
  data,
  id,
  productId,
  onClose,
  onSave,
}: {
  data: Snapshot;
  id?: string;
  productId?: string;
  onClose: () => void;
  onSave: (operation: string, payload: Record<string, unknown>) => Promise<unknown>;
}) {
  const wanted = id ? data.wanted.find((item) => item.id === id) : undefined;
  const fields: RecordField[] = [
    {
      name: 'wantedQuantity',
      label: '想收数量',
      kind: 'number',
      value: String(wanted?.wantedQuantity ?? 1),
      min: '1',
    },
    {
      name: 'targetPrice',
      label: '心理单价（元）',
      kind: 'number',
      value: String(wanted?.targetPrice ?? 0),
      min: '0',
    },
    {
      name: 'priority',
      label: '优先级',
      value: wanted?.priority,
      options: [
        ['NORMAL', '慢慢收'],
        ['HIGH', '很想拥有'],
        ['LOW', '随缘收'],
      ],
    },
    { name: 'notes', label: '备注', value: wanted?.notes, required: false },
  ];
  return (
    <ProductRecordForm
      data={data}
      title={wanted ? '修改收物心愿' : '添一份收物心愿'}
      operation={wanted ? 'wanted.update' : 'wanted.create'}
      formType={wanted ? 'wantedEdit' : 'wanted'}
      fields={fields}
      initialProductId={wanted?.productId ?? productId}
      lockProduct={Boolean(wanted)}
      onClose={onClose}
      onSave={onSave}
      preparePayload={(payload) => {
        if (wanted) payload.id = wanted.id;
      }}
    />
  );
}
