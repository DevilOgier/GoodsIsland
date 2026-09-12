'use client';

import { useMemo } from 'react';
import type { Snapshot } from '@/components/types';
import { buildSnapshotIndex } from '@/lib/snapshot-index';

export function useSnapshotIndex(data: Snapshot | null) {
  return useMemo(() => (data ? buildSnapshotIndex(data) : null), [data]);
}
