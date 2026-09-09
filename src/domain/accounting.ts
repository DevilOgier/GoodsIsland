import type { Snapshot } from '@/components/types';
export type AccountFilter = {
  month?: string;
  ip?: string;
  character?: string;
  series?: string;
  type?: string;
  status?: string;
};
export function cents(value: string | number) {
  const text = String(value);
  if (!/^-?\d+(\.\d{1,2})?$/.test(text)) throw Error('Invalid money');
  const negative = text.startsWith('-');
  const [whole, part = ''] = text.replace('-', '').split('.');
  return (BigInt(whole) * 100n + BigInt(part.padEnd(2, '0'))) * (negative ? -1n : 1n);
}
export function fixed(value: bigint) {
  const sign = value < 0n ? '-' : '';
  const n = value < 0n ? -value : value;
  return sign + String(n / 100n) + '.' + String(n % 100n).padStart(2, '0');
}
export function localDate(value: string) {
  return new Intl.DateTimeFormat('sv-SE', {
    timeZone: 'Asia/Shanghai',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date(value));
}
export function accounting(data: Snapshot, filter: AccountFilter) {
  const products = data.products.filter(
    (p) =>
      (!filter.ip || p.series.character.ipId === filter.ip) &&
      (!filter.character || p.series.characterId === filter.character) &&
      (!filter.series || p.seriesId === filter.series) &&
      (!filter.type || p.productType === filter.type),
  );
  const ids = new Set(products.map((p) => p.id));
  const purchases = data.purchases.filter(
    (p) => ids.has(p.productId) && p.arrivalStatus !== 'CANCELLED',
  );
  const sales = data.sales.filter((s) => ids.has(s.productId));
  const inventory = data.inventory.filter((i) => ids.has(i.productId));
  type Row = {
    id: string;
    date: string;
    productId: string;
    kind: string;
    channel: string;
    status: string;
    quantity: number;
    income: bigint;
    expense: bigint;
    notes: string;
  };
  const ledger: Row[] = [];
  for (const p of purchases) {
    const base =
      cents(p.productAmount) +
      cents(p.domesticShipping) +
      cents(p.internationalShipping) +
      cents(p.otherFee);
    ledger.push({
      id: p.id,
      date: p.purchaseDate.slice(0, 10),
      productId: p.productId,
      kind: '购入',
      channel: p.purchaseChannel,
      status: p.arrivalStatus,
      quantity: p.quantity,
      income: 0n,
      expense: base,
      notes: p.notes,
    });
    for (const fee of p.adjustments)
      ledger.push({
        id: fee.id,
        date: localDate(fee.createdAt),
        productId: p.productId,
        kind: '补费',
        channel: p.purchaseChannel,
        status: p.arrivalStatus,
        quantity: 0,
        income: 0n,
        expense: cents(fee.amount),
        notes: fee.reason,
      });
  }
  for (const s of sales)
    ledger.push({
      id: s.id,
      date: s.saleDate.slice(0, 10),
      productId: s.productId,
      kind: '卖出',
      channel: s.saleChannel,
      status: 'SOLD',
      quantity: s.quantity,
      income: cents(s.totalAmount),
      expense: 0n,
      notes: s.notes,
    });
  const rows = ledger
    .filter(
      (r) =>
        (!filter.month || r.date.startsWith(filter.month)) &&
        (!filter.status || r.status === filter.status),
    )
    .sort((a, b) => b.date.localeCompare(a.date) || a.id.localeCompare(b.id));
  const income = rows.reduce((n, r) => n + r.income, 0n),
    expense = rows.reduce((n, r) => n + r.expense, 0n);
  const currentCost = inventory.reduce((n, i) => n + cents(i.currentCost), 0n);
  const pending = purchases.filter((p) => p.arrivalStatus !== 'ARRIVED');
  const bought = purchases.reduce((n, p) => n + p.quantity, 0),
    sold = sales.reduce((n, s) => n + s.quantity, 0);
  const breakdown = new Map<
    string,
    {
      id: string;
      name: string;
      spent: bigint;
      arrived: bigint;
      pending: bigint;
      stock: bigint;
      income: bigint;
      bought: number;
      sold: number;
    }
  >();
  for (const p of products) {
    const key = p.seriesId;
    if (!breakdown.has(key))
      breakdown.set(key, {
        id: key,
        name: p.series.character.name + ' · ' + p.series.name,
        spent: 0n,
        arrived: 0n,
        pending: 0n,
        stock: 0n,
        income: 0n,
        bought: 0,
        sold: 0,
      });
  }
  const byProduct = new Map(products.map((p) => [p.id, breakdown.get(p.seriesId)!]));
  for (const p of purchases) {
    const b = byProduct.get(p.productId)!;
    b.spent += cents(p.actualCost);
    b.bought += p.quantity;
    if (p.arrivalStatus === 'ARRIVED') b.arrived += cents(p.actualCost);
    else b.pending += cents(p.actualCost);
  }
  for (const i of inventory) byProduct.get(i.productId)!.stock += cents(i.currentCost);
  for (const s of sales) {
    const b = byProduct.get(s.productId)!;
    b.income += cents(s.totalAmount);
    b.sold += s.quantity;
  }
  return {
    rows,
    income,
    expense,
    net: income - expense,
    currentCost,
    bought,
    sold,
    stock: inventory.reduce((n, i) => n + i.currentQuantity, 0),
    pendingCost: pending.reduce((n, p) => n + cents(p.actualCost), 0n),
    pendingQuantity: pending.reduce((n, p) => n + p.quantity, 0),
    arrivedCost: purchases
      .filter((p) => p.arrivalStatus === 'ARRIVED')
      .reduce((n, p) => n + cents(p.actualCost), 0n),
    totalSpent: purchases.reduce((n, p) => n + cents(p.actualCost), 0n),
    totalIncome: sales.reduce((n, s) => n + cents(s.totalAmount), 0n),
    profit: sales.reduce(
      (n, s) =>
        n +
        cents(s.totalAmount) -
        cents(s.allocatedActualCost) -
        s.costAdjustments.reduce((a, c) => a + cents(c.amount), 0n),
      0n,
    ),
    breakdown: [...breakdown.values()].filter((b) => b.bought || b.sold || b.stock !== 0n),
  };
}
