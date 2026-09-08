import type { Prisma } from '@prisma/client';
import type { snapshot } from '@/domain/query-service';
type Serialized<T> = T extends Date | Prisma.Decimal
  ? string
  : T extends Array<infer U>
    ? Serialized<U>[]
    : T extends object
      ? { [K in keyof T]: Serialized<T[K]> }
      : T;
export type Snapshot = Serialized<Awaited<ReturnType<typeof snapshot>>>;
export type Product = Snapshot['products'][number];
export const typeNames: Record<string, string> = {
  BADGE: '徽章 / 吧唧',
  STANDEE: '亚克力立牌',
  POSTCARD: '明信片',
  BONUS: '特典',
  KEYCHAIN: '钥匙扣',
  PLUSH: '毛绒',
  OTHER: '其他',
};
export const statusNames: Record<string, string> = {
  PENDING: '待到货',
  SHIPPED: '运输中',
  ARRIVED: '已到货',
  CANCELLED: '已取消',
  ACTIVE: '正在出',
  COMPLETED: '已完成',
  OPEN: '开团中',
  CLOSED: '已截团',
  WANTED: '正在收',
  PARTIAL: '部分收到',
  FULFILLED: '已收齐',
  QUEUED: '等待增强',
  RUNNING: '增强中',
  FAILED: '增强失败',
  UNKNOWN: '待核对',
  SUCCEEDED: '增强完成',
};
export const price = (n: string | number) =>
  '¥' + Number(n).toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
