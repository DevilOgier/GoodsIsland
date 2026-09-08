import { z } from 'zod';
export const amount = z.string().regex(/^\d{1,10}(\.\d{1,2})?$/, '请输入有效金额，最多两位小数');
export const quantity = z.coerce.number().int().min(1).max(100000);
export const uuid = z.uuid();
export const purchaseSchema = z.object({
  productId: uuid,
  quantity,
  unitPrice: amount,
  domesticShipping: amount.default('0'),
  internationalShipping: amount.default('0'),
  otherFee: amount.default('0'),
  purchaseChannel: z.string().min(1).max(40),
  purchaseDate: z.iso.date(),
  arrivalStatus: z.enum(['PENDING', 'SHIPPED', 'ARRIVED']).default('PENDING'),
  groupBuyItemId: uuid.optional(),
  wantedId: uuid.optional(),
  updateWanted: z.boolean().default(false),
  notes: z.string().max(2000).default(''),
});
export const saleSchema = z.object({
  productId: uuid,
  quantity,
  unitPrice: amount,
  listingId: uuid.optional(),
  saleChannel: z.string().min(1).max(40),
  saleDate: z.iso.date(),
  notes: z.string().max(2000).default(''),
});
export const feeSchema = z.object({
  purchaseId: uuid,
  domesticShipping: amount.default('0'),
  internationalShipping: amount.default('0'),
  otherFee: amount.default('0'),
  reason: z.string().min(1, '请填写补费原因').max(500),
});
export const productSchema = z.object({
  seriesId: uuid,
  productType: z.string().min(1).max(100),
  appearanceKey: z.string().min(1).max(100).default('default'),
  description: z.string().max(2000).default(''),
  tagIds: z.array(uuid).max(20).default([]),
});
