'use client';
import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import {
  Flower2,
  Users,
  Search,
  Plus,
  SlidersHorizontal,
  ChevronRight,
  Package,
  ArrowRight,
  X,
  Sparkles,
  Upload,
  RefreshCw,
  Trash2,
  LoaderCircle,
} from 'lucide-react';
import type { Snapshot, Product } from './types';
import { createSnapshotCache } from '@/lib/snapshot-cache';
const snapshotCache = createSnapshotCache<Snapshot>();
import { price, statusNames } from './types';
import ProductArt from './product-art';
import ActionForm from './action-form';
import type { Dialog } from './action-form';
import PosterEditor from './poster-editor';
import CollectionGallery from './collection-gallery';
import AccountingPanel from './accounting-panel';
import AccountPanel from './account-panel';
import { AppShell, appNavigation, MoreMenu } from './layout';
import { EmptyState, Toast } from './ui';
import type { QuickAction } from './layout/quick-action-sheet';
import { useSnapshotIndex } from '@/hooks/use-snapshot-index';
import DashboardPage from './dashboard/dashboard-page';
import CatalogPage from './catalog/catalog-page';
import InventoryPage from './inventory/inventory-page';
import PurchasePage, { PurchaseList } from './purchase/purchase-page';
import SalePage, { SaleList } from './sale/sale-page';
import WantedPage from './wanted/wanted-page';
export default function Cabinet({
  user,
}: {
  user: { id: string; name: string; email: string; role: string };
}) {
  const router = useRouter();
  const path = usePathname();
  const searchParams = useSearchParams();
  const groupView = searchParams.get('view') ?? '';
  const [data, setData] = useState<Snapshot | null>(null);
  const snapshotIndex = useSnapshotIndex(data);
  const [error, setError] = useState('');
  const [toast, setToast] = useState<{
    message: string;
    tone: 'success' | 'error' | 'info';
  } | null>(null);
  const [pendingAction, setPendingAction] = useState('');
  const [dialog, setDialog] = useState<Dialog | null>(null);
  const [q, setQ] = useState(searchParams.get('q') ?? '');
  const [filter, setFilter] = useState(false);
  const [ip, setIp] = useState(searchParams.get('ip') ?? '');
  const [character, setCharacter] = useState(searchParams.get('character') ?? '');
  const [series, setSeries] = useState(searchParams.get('series') ?? '');
  const [tag, setTag] = useState(searchParams.get('tag') ?? '');
  const [type, setType] = useState(searchParams.get('type') ?? '');
  const [status, setStatus] = useState(searchParams.get('status') ?? '');
  const [imageBusy, setImageBusy] = useState(false);
  const [adminTab, setAdminTab] = useState<
    'product' | 'ip' | 'character' | 'series' | 'productType' | 'tag'
  >('product');
  const load = useCallback(
    async (force = true) => {
      try {
        const value = await snapshotCache.load(
          user.id,
          async () => {
            const r = await fetch('/api/data', { cache: 'no-store' });
            if (r.status === 401) {
              snapshotCache.clear();
              router.replace('/login');
              router.refresh();
              throw Error('请重新登录');
            }
            const j = await r.json();
            if (!r.ok) throw Error(j.error);
            return j as Snapshot;
          },
          force,
        );
        setData(value);
        setError('');
      } catch (e) {
        setError((e as Error).message);
      }
    },
    [router, user.id],
  );
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- load updates state only after the asynchronous network response.
    void load(false);
    if ('serviceWorker' in navigator && process.env.NODE_ENV === 'production')
      navigator.serviceWorker.register('/sw.js').catch(() => {});
  }, [load]);
  useEffect(() => {
    if (!data?.jobs.some((j) => ['QUEUED', 'RUNNING'].includes(j.status))) return;
    const interval = setInterval(() => void load(), 2500);
    return () => clearInterval(interval);
  }, [data, load]);
  useEffect(() => {
    const refresh = () => {
      if (document.visibilityState === 'visible') void load();
    };
    window.addEventListener('focus', refresh);
    document.addEventListener('visibilitychange', refresh);
    const timer = window.setInterval(refresh, 30_000);
    return () => {
      window.removeEventListener('focus', refresh);
      document.removeEventListener('visibilitychange', refresh);
      window.clearInterval(timer);
    };
  }, [load]);
  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(null), 4000);
    return () => window.clearTimeout(timer);
  }, [toast]);
  const notify = (message: string, tone: 'success' | 'error' | 'info' = 'success') => {
    setToast({ message, tone });
  };
  const logout = async () => {
    await fetch('/api/auth', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'logout' }),
    });
    snapshotCache.clear();
    router.replace('/login');
    router.refresh();
  };
  const save = async (
    op: string,
    payload: Record<string, unknown>,
    successMessage = '已保存，收藏柜已更新',
  ) => {
    const r = await fetch('/api/commands', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Idempotency-Key': Array.from(crypto.getRandomValues(new Uint8Array(16)), (b) =>
          b.toString(16).padStart(2, '0'),
        ).join(''),
      },
      body: JSON.stringify({ operation: op, data: payload }),
    });
    const j = await r.json();
    if (!r.ok) throw Error(j.error);
    await load();
    notify(successMessage);
    return j;
  };
  const act = async (
    op: string,
    payload: Record<string, unknown>,
    successMessage?: string,
    actionKey = op,
  ) => {
    if (pendingAction) return;
    setPendingAction(actionKey);
    try {
      await save(op, payload, successMessage);
    } catch (e) {
      notify((e as Error).message, 'error');
    } finally {
      setPendingAction('');
    }
  };
  const removeCatalog = async (
    entity: 'product' | 'ip' | 'character' | 'series' | 'tag' | 'productType',
    id: string,
    name: string,
  ) => {
    const scope = ['ip', 'character', 'series'].includes(entity)
      ? '以及其下没有业务记录的图鉴内容'
      : '';
    if (!window.confirm(`确定永久删除「${name}」${scope}吗？此操作不能撤销。`)) return;
    await act('catalog.delete', { entity, id });
  };
  const removePurchase = async (id: string, name: string) => {
    if (
      !window.confirm(
        `确定删除「${name}」的这条买入记录吗？库存和成本会同步重算；如果来自拼团，关联团项也会一起删除。`,
      )
    )
      return;
    await act('purchase.delete', { id }, '买入记录已删除，库存与关联拼团已同步');
  };
  const removeWanted = async (id: string, name: string) => {
    if (!window.confirm(`确定删除「${name}」的收物心愿吗？`)) return;
    await act('wanted.delete', { id }, '收物心愿已删除');
  };
  const imageAction = async (action: string, id: string, source?: string) => {
    setImageBusy(true);
    try {
      const r = await fetch('/api/images', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, id, source }),
      });
      const j = await r.json();
      if (!r.ok) throw Error(j.error);
      await load();
      notify(action === 'enhance' ? '已加入增强任务，完成后可切换原图' : '图片已更新');
    } catch (e) {
      notify((e as Error).message, 'error');
    } finally {
      setImageBusy(false);
    }
  };
  const upload = async (file: File, productId: string) => {
    setImageBusy(true);
    try {
      if (file.size > 20 * 1024 * 1024) throw Error('图片不能超过20MB');
      const r = await fetch('/api/images', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'upload', id: productId, mime: file.type }),
      });
      const j = await r.json();
      if (!r.ok) throw Error(j.error);
      const put = await fetch(j.url, {
        method: 'PUT',
        headers: { 'Content-Type': file.type },
        body: file,
      });
      if (!put.ok) throw Error('对象存储上传失败');
      const complete = await fetch('/api/images', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'complete', id: j.id }),
      });
      const done = await complete.json();
      if (!complete.ok) throw Error(done.error);
      await load();
      notify('原图已安全保存');
    } catch (e) {
      notify((e as Error).message, 'error');
    } finally {
      setImageBusy(false);
    }
  };
  const selected = path.startsWith('/products/')
    ? snapshotIndex?.productById.get(path.split('/')[2])
    : undefined;
  const groupDetail = path.startsWith('/groups/')
    ? data?.groups.find((g) => g.id === path.split('/')[2])
    : undefined;
  const section =
    (path === '/me' ? '我的账号' : appNavigation.find((item) => item.href === path)?.label) ??
    (selected ? '谷子详情' : groupDetail ? '拼团详情' : '我的小岛');
  const all = data?.products ?? [];
  const filtered = all.filter(
    (p) =>
      (!q ||
        (p.name + p.series.name + p.series.character.name)
          .toLowerCase()
          .includes(q.toLowerCase())) &&
      (!ip || p.series.character.ipId === ip) &&
      (!character || p.series.character.id === character) &&
      (!series || p.seriesId === series) &&
      (!tag || p.tags.some((t) => t.tagId === tag)) &&
      (!type || p.productType === type),
  );
  const productById = (id: string) => snapshotIndex?.productById.get(id);
  const invFor = (id: string) => snapshotIndex?.inventoryByProductId.get(id);
  const awaitingArrivalFor = (id: string) => snapshotIndex?.awaitingArrivalQuantity(id) ?? 0;
  const listingCount = (id: string) => snapshotIndex?.activeListingQuantity(id) ?? 0;
  function cards(products: Product[], inventory = false) {
    return (
      <div className="product-grid">
        {products.map((p) => {
          const inv = invFor(p.id);
          return (
            <article className="product-card" key={p.id}>
              <Link href={'/products/' + p.id}>
                <ProductArt product={p} />
              </Link>
              <div className="card-info">
                <span className="card-kicker">
                  {p.series.character.name} <span> / </span> {p.series.name}
                </span>
                <Link className="card-title" href={'/products/' + p.id}>
                  {p.name}
                </Link>
                <div className="card-bottom">
                  <span className="type-tag">{p.typeDefinition.name}</span>
                  <span className="stock">
                    {inv?.currentQuantity ?? 0}
                    <small> 件在手</small>
                  </span>
                </div>
                {inventory && (
                  <div className="inventory-meta">
                    <span>
                      均价{' '}
                      {price(
                        inv?.currentQuantity ? Number(inv.currentCost) / inv.currentQuantity : 0,
                      )}
                    </span>
                    <span>挂出 {listingCount(p.id)} 件</span>
                  </div>
                )}
              </div>
            </article>
          );
        })}
      </div>
    );
  }
  const empty = (text: string, button?: string, onClick?: () => void) => (
    <EmptyState
      icon={<Flower2 size={34} strokeWidth={1.2} />}
      title={text}
      description="慢慢来，把每一份喜欢放进这里。"
      action={
        button ? (
          <button className="primary" onClick={onClick}>
            {button}
            <Plus size={16} />
          </button>
        ) : undefined
      }
    />
  );
  const matches = (id: string) => filtered.some((p) => p.id === id);
  const actionButton = (kind: string, label: string, id?: string, productId?: string) => (
    <button className="small-btn" onClick={() => setDialog({ type: kind, id, productId })}>
      {label}
    </button>
  );
  const recordProduct = (id: string) => (
    <Link href={`/products/${id}`} className="record-product">
      {productById(id) && <ProductArt product={productById(id)!} />}
      <strong>{productById(id)?.name ?? '商品'}</strong>
    </Link>
  );
  let content: React.ReactNode = null;
  if (data) {
    const visible = filtered.filter((p) => p.status === 'ACTIVE');
    const owned = visible.filter((p) => {
      const quantity = invFor(p.id)?.currentQuantity ?? 0;
      const pending = awaitingArrivalFor(p.id);
      if (status === 'stock') return quantity > 0;
      if (status === 'IN_TRANSIT') return pending > 0;
      if (status === 'empty') return quantity === 0 && pending === 0;
      if (status) return listingCount(p.id) > 0;
      return quantity > 0 || pending > 0;
    });
    const groupEntries = data.groups.flatMap((group) =>
      group.items.map((item) => ({ group, item })),
    );
    const groupTasks = groupEntries.filter(({ item }) => {
      if (groupView === 'unpaid') return item.paymentStatus === 'UNPAID';
      if (groupView === 'transit')
        return !!item.purchase && ['PENDING', 'SHIPPED'].includes(item.purchase.arrivalStatus);
      if (groupView === 'dispatch')
        return (
          item.paymentStatus === 'PAID' &&
          item.dispatchStatus === 'NOT_DISPATCHED' &&
          !!item.purchase &&
          item.purchase.arrivalStatus !== 'CANCELLED'
        );
      return false;
    });
    if (path === '/')
      content = (
        <DashboardPage
          data={data}
          index={snapshotIndex!}
          userName={user.name}
          onPurchase={(productId) => setDialog({ type: 'purchase', productId })}
          onInventoryStatus={setStatus}
        />
      );
    else if (selected) {
      const inv = invFor(selected.id);

      content = (
        <>
          <Link className="back-link" href="/products">
            ← 返回图鉴
          </Link>
          <section className="product-detail">
            <ProductArt product={selected} large />
            <div className="detail-copy">
              <span className="eyebrow">{selected.series.character.ip.name}</span>
              <h1>{selected.name}</h1>
              <p className="muted">
                {selected.series.character.name} · {selected.series.name} ·{' '}
                {selected.typeDefinition.name}
              </p>
              <p>{selected.description}</p>
              <div className="tag-row">
                {selected.tags.map((t) => (
                  <span className="pill" key={t.id}>
                    {t.tag.name}
                  </span>
                ))}
              </div>
              <div className="detail-stats">
                <div>
                  <small>在手数量</small>
                  <strong>
                    {inv?.currentQuantity ?? 0}
                    <small> 件</small>
                  </strong>
                </div>
                <div>
                  <small>等待到货</small>
                  <strong>
                    {awaitingArrivalFor(selected.id)}
                    <small> 件</small>
                  </strong>
                </div>
                <div>
                  <small>平均成本</small>
                  <strong>
                    {price(
                      inv?.currentQuantity ? Number(inv.currentCost) / inv.currentQuantity : 0,
                    )}
                  </strong>
                </div>
                <div>
                  <small>挂出数量</small>
                  <strong>{listingCount(selected.id)}</strong>
                </div>
              </div>
              <div className="button-row">
                <button
                  className="primary"
                  onClick={() => setDialog({ type: 'purchase', productId: selected.id })}
                >
                  <Plus size={16} /> 记录买入
                </button>
                {actionButton('wanted', '我想收', undefined, selected.id)}
                {actionButton('listing', '准备出物', undefined, selected.id)}
              </div>
            </div>
          </section>
          <section className="section-heading">
            <h2>买入与费用</h2>
          </section>
          <PurchaseList
            items={snapshotIndex?.purchasesByProductId.get(selected.id) ?? []}
            status={status}
            showImages={false}
            productFor={productById}
            onAction={(operation, payload) => void act(operation, payload)}
            onEdit={(id, productId) => setDialog({ type: 'purchaseEdit', id, productId })}
            onFees={(id) => setDialog({ type: 'fees', id })}
            onRemove={(id, name) => void removePurchase(id, name)}
          />
          <section className="section-heading">
            <h2>卖出记录</h2>
          </section>
          <SaleList
            items={snapshotIndex?.salesByProductId.get(selected.id) ?? []}
            productFor={productById}
          />
          <section className="section-heading">
            <h2>库存流水</h2>
          </section>
          <div className="mini-panel">
            {inv?.events.map((e) => (
              <div className="mini-row" key={e.id}>
                <span>
                  {e.type === 'COST_ADJUSTMENT' ? '晚补费用调整' : e.type} · {e.reason}
                </span>
                <strong>
                  {e.quantityDelta > 0 ? '+' : ''}
                  {e.quantityDelta} 件 · {price(e.costDelta)}
                </strong>
              </div>
            )) ?? <p>暂无流水</p>}
          </div>
        </>
      );
    } else if (path === '/products') {
      content = (
        <CatalogPage
          products={visible}
          quantityFor={(id) => invFor(id)?.currentQuantity ?? 0}
          onPurchase={(productId) => setDialog({ type: 'purchase', productId })}
          onAddProduct={() => setDialog({ type: 'product' })}
        />
      );
    } else if (path === '/inventory') {
      content = (
        <InventoryPage
          data={data}
          products={owned}
          quantityFor={(id) => invFor(id)?.currentQuantity ?? 0}
          costFor={(id) => Number(invFor(id)?.currentCost ?? 0)}
          awaitingFor={awaitingArrivalFor}
          listingFor={listingCount}
          onPurchase={(productId) => setDialog({ type: 'purchase', productId })}
          onStatus={setStatus}
        />
      );
    } else if (path === '/purchases')
      content = (
        <PurchasePage
          items={data.purchases.filter(
            (purchase) =>
              matches(purchase.productId) &&
              (!status ||
                (status === 'IN_TRANSIT'
                  ? ['PENDING', 'SHIPPED'].includes(purchase.arrivalStatus)
                  : purchase.arrivalStatus === status)),
          )}
          status={status}
          productFor={productById}
          onAction={(operation, payload) => void act(operation, payload)}
          onEdit={(id, productId) => setDialog({ type: 'purchaseEdit', id, productId })}
          onFees={(id) => setDialog({ type: 'fees', id })}
          onRemove={(id, name) => void removePurchase(id, name)}
        />
      );
    else if (path === '/sales')
      content = (
        <SalePage
          items={data.sales.filter((sale) => matches(sale.productId))}
          productFor={productById}
        />
      );
    else if (path === '/listings') {
      const entries = data.listings.filter(
        (l) => matches(l.inventory.productId) && (!status || l.status === status),
      );
      content = (
        <>
          <div className="page-intro">
            <span className="eyebrow">PASS ON THE JOY</span>
            <h1>正在出物</h1>
            <p>挂出只是整理计划，确认成交后才会扣减库存。</p>
          </div>
          <div className="notice">
            挂出不扣库存。选择出物记录可直接制作海报，实际成交后再扣库存。
          </div>
          <CollectionGallery
            heading="出物收藏"
            extra={
              <Link className="primary gallery-poster-link" href="/posters?source=listings">
                批量制作出物图
              </Link>
            }
            items={entries.map((l) => ({
              id: l.id,
              product: productById(l.inventory.productId)!,
              badge: statusNames[l.status],
              summary: (
                <>
                  <strong>{price(l.unitPrice)} / 件</strong>
                  <small>
                    剩余挂出 {l.remainingQuantity} / {l.quantity} 件
                  </small>
                </>
              ),
              actions:
                l.status === 'ACTIVE' ? (
                  <>
                    {actionButton('sale', '确认成交', l.id, l.inventory.productId)}
                    <Link className="small-btn" href={'/posters?source=listings&id=' + l.id}>
                      制作出物图
                    </Link>
                    <button
                      className="small-btn"
                      onClick={() => act('listing.cancel', { id: l.id })}
                    >
                      撤下
                    </button>
                  </>
                ) : undefined,
            }))}
          />
        </>
      );
    } else if (path === '/wanted') {
      const entries = data.wanted.filter(
        (w) =>
          ['WANTED', 'PARTIAL'].includes(w.status) &&
          matches(w.productId) &&
          (!status || status === 'ACTIVE' || w.status === status),
      );
      content = (
        <WantedPage
          items={entries}
          productFor={productById}
          onEdit={(id) => setDialog({ type: 'wantedEdit', id })}
          onPurchase={(productId, wantedId) => setDialog({ type: 'purchase', productId, wantedId })}
          onComplete={(id, fulfilledQuantity) =>
            void act('wanted.progress', { id, fulfilledQuantity })
          }
          onRemove={(id, name) => void removeWanted(id, name)}
        />
      );
    } else if (path === '/groups')
      content = (
        <>
          <div className="page-intro">
            <span className="eyebrow">COLLECT TOGETHER</span>
            <h1>我的拼团 🌿</h1>
            <p>和同好一起拼，更快收获喜欢的谷子！</p>
          </div>
          <div className="group-overview-stats">
            <Link href="/groups?view=open" aria-current={groupView === 'open' ? 'page' : undefined}>
              <span>进行中</span>
              <strong>{data.groups.filter((group) => group.status === 'OPEN').length}</strong>
            </Link>
            <Link
              href="/groups?view=unpaid"
              aria-current={groupView === 'unpaid' ? 'page' : undefined}
            >
              <span>待付款</span>
              <strong>
                {
                  data.groups
                    .flatMap((group) => group.items)
                    .filter((item) => item.paymentStatus === 'UNPAID').length
                }
              </strong>
            </Link>
            <Link
              href="/groups?view=transit"
              aria-current={groupView === 'transit' ? 'page' : undefined}
            >
              <span>待到货</span>
              <strong>
                {
                  data.groups
                    .flatMap((group) => group.items)
                    .filter(
                      (item) =>
                        item.purchase &&
                        !['ARRIVED', 'CANCELLED'].includes(item.purchase.arrivalStatus),
                    ).length
                }
              </strong>
            </Link>
            <Link
              href="/groups?view=dispatch"
              aria-current={groupView === 'dispatch' ? 'page' : undefined}
            >
              <span>待排发</span>
              <strong>
                {
                  data.groups
                    .flatMap((group) => group.items)
                    .filter(
                      (item) =>
                        item.paymentStatus === 'PAID' &&
                        item.dispatchStatus === 'NOT_DISPATCHED' &&
                        !!item.purchase &&
                        item.purchase?.arrivalStatus !== 'CANCELLED',
                    ).length
                }
              </strong>
            </Link>
          </div>
          {groupView && groupView !== 'open' && (
            <section className="group-task-panel">
              <div className="section-heading">
                <h2>
                  {groupView === 'unpaid'
                    ? '待付款项目'
                    : groupView === 'transit'
                      ? '待到货项目'
                      : '待排发项目'}
                </h2>
                <Link href="/groups">查看全部拼团</Link>
              </div>
              <div className="record-list group-task-list">
                {groupTasks.map(({ group, item }) => (
                  <Link
                    className="record group-task-row"
                    href={'/groups/' + group.id}
                    key={item.id}
                  >
                    <Package size={20} />
                    <span>
                      <strong>{productById(item.productId)?.name ?? '商品'}</strong>
                      <small>{group.name}</small>
                    </span>
                    <span>{item.quantity} 件</span>
                    <span className="pill">
                      {groupView === 'unpaid'
                        ? '待付款'
                        : groupView === 'transit'
                          ? statusNames[item.purchase?.arrivalStatus ?? 'PENDING']
                          : '待排发'}
                    </span>
                    <ChevronRight size={17} />
                  </Link>
                ))}
                {!groupTasks.length && empty('这里暂时没有待处理项目')}
              </div>
            </section>
          )}
          {(!groupView || groupView === 'open') && (
            <div className="group-grid">
              {data.groups
                .filter(
                  (g) =>
                    (!q || g.name.includes(q) || g.items.some((i) => matches(i.productId))) &&
                    (!status || g.status === status) &&
                    (groupView !== 'open' || g.status === 'OPEN'),
                )
                .map((g) => (
                  <Link className="group-card" href={'/groups/' + g.id} key={g.id}>
                    <div className="group-card-top">
                      <Users size={24} />
                      <span className="pill">{statusNames[g.status]}</span>
                    </div>
                    <h2>{g.name}</h2>
                    <p>团长 · {g.groupOwner}</p>
                    <p className="group-card-items">
                      {g.items.length
                        ? g.items
                            .slice(0, 3)
                            .map((item) => productById(item.productId)?.name ?? '商品')
                            .join(' · ')
                        : '还没有团内商品'}
                    </p>
                    <div className="group-counts">
                      <span>
                        <strong>
                          {g.items.reduce((n, i) => n + (i.purchase?.quantity ?? i.quantity), 0)}
                        </strong>
                        件商品
                      </span>
                      <span>
                        <strong>
                          {g.items.filter((i) => i.purchase?.arrivalStatus !== 'ARRIVED').length}
                        </strong>
                        项待到货
                      </span>
                      <span>
                        <strong>
                          {g.items.filter((i) => i.dispatchStatus !== 'DISPATCHED').length}
                        </strong>
                        项待排发
                      </span>
                    </div>
                    <div className="group-progress">
                      <i
                        style={{
                          width: `${g.items.length ? Math.round((g.items.filter((item) => item.purchase?.arrivalStatus === 'ARRIVED').length / g.items.length) * 100) : 0}%`,
                        }}
                      />
                    </div>
                    <div className="group-link">
                      看看团里的喜欢 <ArrowRight size={16} />
                    </div>
                  </Link>
                ))}
              {!data.groups.length &&
                empty('跟同好一起，等待喜欢到来', '记录拼团', () => setDialog({ type: 'group' }))}
            </div>
          )}
        </>
      );
    else if (groupDetail)
      content = (
        <>
          <div className="page-intro">
            <Link className="back-link" href="/groups">
              ← 我的拼团
            </Link>
            <h1>{groupDetail.name}</h1>
            <p>
              团长 · {groupDetail.groupOwner} / {statusNames[groupDetail.status]}
            </p>
            <p className="group-sync-note">
              确认付款后会记入收藏柜；派发时记录邮费并进入“在路上”，确认到货后才增加在手库存。
            </p>
            <div className="button-row">
              {groupDetail.status === 'OPEN' &&
                actionButton('groupItem', '添加团项', groupDetail.id)}
              {groupDetail.status === 'OPEN' && (
                <button
                  disabled={!!pendingAction}
                  onClick={() =>
                    act(
                      'group.status',
                      { id: groupDetail.id, status: 'CLOSED' },
                      '已截团，团项仍可继续更新物流状态',
                      `group:${groupDetail.id}:close`,
                    )
                  }
                >
                  {pendingAction === `group:${groupDetail.id}:close` && (
                    <LoaderCircle className="button-spinner" size={15} />
                  )}
                  {pendingAction === `group:${groupDetail.id}:close` ? '截团中…' : '截团'}
                </button>
              )}
              {groupDetail.status === 'CLOSED' && (
                <button
                  disabled={!!pendingAction}
                  onClick={() =>
                    act(
                      'group.status',
                      { id: groupDetail.id, status: 'COMPLETED' },
                      '拼团已完成并保存',
                      `group:${groupDetail.id}:complete`,
                    )
                  }
                >
                  {pendingAction === `group:${groupDetail.id}:complete` && (
                    <LoaderCircle className="button-spinner" size={15} />
                  )}
                  {pendingAction === `group:${groupDetail.id}:complete` ? '保存中…' : '完成拼团'}
                </button>
              )}
            </div>
          </div>
          <div className="record-list">
            {groupDetail.items.map((i) => (
              <article className="record" key={i.id}>
                <Link className="group-item-product" href={'/products/' + i.productId}>
                  <Package size={20} />
                  <strong>{productById(i.productId)?.name ?? '商品'}</strong>
                </Link>
                <strong>
                  {i.purchase?.quantity ?? i.quantity} 件 ·{' '}
                  {price(i.purchase?.unitPrice ?? i.unitPrice)}
                </strong>
                <div className="record-actions">
                  {i.paymentStatus === 'PAID' && i.purchase ? (
                    <span className="pill">已付款</span>
                  ) : (
                    <button
                      className="small-btn"
                      disabled={
                        !!pendingAction || ['COMPLETED', 'CANCELLED'].includes(groupDetail.status)
                      }
                      onClick={() =>
                        act(
                          'group.pay',
                          { id: i.id },
                          '已确认付款，并同步记入收藏柜',
                          `group:${i.id}:pay`,
                        )
                      }
                    >
                      {pendingAction === `group:${i.id}:pay` && (
                        <LoaderCircle className="button-spinner" size={14} />
                      )}
                      {pendingAction === `group:${i.id}:pay` ? '同步中…' : '确认已付款'}
                    </button>
                  )}
                  {i.purchase &&
                    i.paymentStatus === 'PAID' &&
                    i.dispatchStatus !== 'DISPATCHED' &&
                    !['ARRIVED', 'CANCELLED'].includes(i.purchase.arrivalStatus) &&
                    !['COMPLETED', 'CANCELLED'].includes(groupDetail.status) &&
                    actionButton('groupDispatch', '确认已派发', i.id)}
                  {i.dispatchStatus === 'DISPATCHED' && <span className="pill">已派发</span>}
                </div>
                {i.purchase && (
                  <>
                    <span className="pill">{statusNames[i.purchase.arrivalStatus]}</span>
                    {i.dispatchStatus === 'DISPATCHED' &&
                      !['ARRIVED', 'CANCELLED'].includes(i.purchase.arrivalStatus) && (
                        <button
                          className="small-btn"
                          disabled={!!pendingAction}
                          onClick={() =>
                            act(
                              'purchase.arrive',
                              { id: i.purchase!.id },
                              '已确认到货，收藏柜库存已同步增加',
                              `group:${i.id}:arrive`,
                            )
                          }
                        >
                          {pendingAction === `group:${i.id}:arrive` && (
                            <LoaderCircle className="button-spinner" size={14} />
                          )}
                          {pendingAction === `group:${i.id}:arrive` ? '入库中…' : '确认已到货'}
                        </button>
                      )}
                  </>
                )}
              </article>
            ))}
          </div>
        </>
      );
    else if (path.startsWith('/posters'))
      content = (
        <PosterEditor
          key={searchParams.toString()}
          data={data}
          onSaved={load}
          source={searchParams.get('source') ?? undefined}
          sourceId={searchParams.get('id') ?? undefined}
        />
      );
    else if (path === '/accounting') content = <AccountingPanel data={data} />;
    else if (path === '/admin')
      content = (
        <>
          <div className="page-intro">
            <span className="eyebrow">CURATE YOUR ENCYCLOPEDIA</span>
            <h1>整理图鉴里的喜欢</h1>
            <p>上传商品图、维护系列和类型，名称会自动组合。</p>
            <div className="button-row">
              {actionButton('product', '添加商品')}
              {actionButton('productType', '新增谷子类型')}
              {actionButton('entity', '添加 IP / 角色 / 系列 / 标签')}
            </div>
          </div>
          <nav className="admin-tabs" aria-label="图鉴管理分类">
            {(
              [
                ['product', '商品'],
                ['ip', 'IP'],
                ['character', '角色'],
                ['series', '系列'],
                ['productType', '谷子类型'],
                ['tag', '标签'],
              ] as const
            ).map(([key, label]) => (
              <button
                key={key}
                type="button"
                aria-current={adminTab === key ? 'page' : undefined}
                onClick={() => setAdminTab(key)}
              >
                {label}
              </button>
            ))}
          </nav>
          <div className="record-list admin-product-list" hidden={adminTab !== 'product'}>
            {filtered.map((p) => (
              <article className="record" key={p.id}>
                {recordProduct(p.id)}
                <span>
                  {p.series.character.name} / {p.series.name}
                </span>
                <span className="pill">{p.status === 'ACTIVE' ? '展示中' : '已归档'}</span>
                {actionButton('productEdit', '编辑', p.id)}
                <div className="catalog-image-controls">
                  <button
                    className="small-btn"
                    disabled={
                      imageBusy ||
                      !p.originalId ||
                      data.jobs.some(
                        (j) => j.productId === p.id && ['RUNNING', 'QUEUED'].includes(j.status),
                      )
                    }
                    onClick={() => imageAction('enhance', p.id)}
                  >
                    <Sparkles size={14} />
                    保真高清{data.provider === 'mock' ? '（模拟）' : ''}
                  </button>
                  <button
                    className="small-btn"
                    disabled={imageBusy || !p.originalId}
                    onClick={() => imageAction('select', p.id, 'ORIGINAL')}
                  >
                    使用原图
                  </button>
                  {p.enhancedId && (
                    <button
                      className="small-btn"
                      disabled={imageBusy}
                      onClick={() => imageAction('select', p.id, 'ENHANCED')}
                    >
                      使用高清图
                    </button>
                  )}
                  {data.jobs
                    .filter((j) => j.productId === p.id)
                    .slice(0, 1)
                    .map((j) => (
                      <small key={j.id}>
                        {statusNames[j.status]} {j.error}
                        {j.status === 'FAILED' && (
                          <button onClick={() => imageAction('retry', j.id)}>重试</button>
                        )}
                      </small>
                    ))}
                </div>
                <label className="upload-button">
                  <Upload size={16} />
                  {imageBusy ? '上传中…' : '上传图片'}
                  <input
                    aria-label={'上传图片 ' + p.name}
                    type="file"
                    accept="image/png,image/jpeg,image/webp"
                    disabled={imageBusy}
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) void upload(file, p.id);
                      e.target.value = '';
                    }}
                  />
                </label>
                <button
                  className="small-btn"
                  onClick={() =>
                    act('catalog.archive', {
                      id: p.id,
                      status: p.status === 'ACTIVE' ? 'ARCHIVED' : 'ACTIVE',
                    })
                  }
                >
                  {p.status === 'ACTIVE' ? '归档' : '恢复'}
                </button>
                <button
                  className="small-btn danger"
                  aria-label={'删除商品 ' + p.name}
                  onClick={() => void removeCatalog('product', p.id, p.name)}
                >
                  <Trash2 size={14} /> 删除
                </button>
              </article>
            ))}
            {!filtered.length &&
              empty('图鉴里还没有符合条件的谷子', '添加第一款谷子', () =>
                setDialog({ type: 'product' }),
              )}
          </div>
          <section className="catalog-taxonomy" hidden={adminTab === 'product'}>
            <div className="section-heading">
              <div>
                <span className="eyebrow">CATALOG STRUCTURE</span>
                <h2>
                  {adminTab === 'productType'
                    ? '谷子类型管理'
                    : adminTab === 'tag'
                      ? '标签管理'
                      : `${adminTab === 'ip' ? 'IP' : adminTab === 'character' ? '角色' : '系列'}管理`}
                </h2>
              </div>
              <p>删除 IP、角色或系列会同时删除其下没有图片和业务记录的图鉴内容。</p>
            </div>
            <div className="taxonomy-grid">
              <article hidden={adminTab !== 'ip'}>
                <h3>IP</h3>
                {data.ips.map((item) => (
                  <div className="taxonomy-row" key={item.id}>
                    <span>{item.name}</span>
                    <button
                      className="small-btn danger"
                      aria-label={'删除 IP ' + item.name}
                      onClick={() => void removeCatalog('ip', item.id, item.name)}
                    >
                      <Trash2 size={14} /> 删除
                    </button>
                  </div>
                ))}
                {!data.ips.length && <small className="muted">暂无 IP</small>}
              </article>
              <article hidden={adminTab !== 'character'}>
                <h3>角色</h3>
                {data.characters.map((item) => (
                  <div className="taxonomy-row" key={item.id}>
                    <span>
                      <small>{data.ips.find((ip) => ip.id === item.ipId)?.name}</small>
                      {item.name}
                    </span>
                    <button
                      className="small-btn danger"
                      aria-label={'删除角色 ' + item.name}
                      onClick={() => void removeCatalog('character', item.id, item.name)}
                    >
                      <Trash2 size={14} /> 删除
                    </button>
                  </div>
                ))}
                {!data.characters.length && <small className="muted">暂无角色</small>}
              </article>
              <article hidden={adminTab !== 'series'}>
                <h3>系列</h3>
                {data.series.map((item) => (
                  <div className="taxonomy-row" key={item.id}>
                    <span>
                      <small>
                        {
                          data.characters.find((character) => character.id === item.characterId)
                            ?.name
                        }
                      </small>
                      {item.name}
                    </span>
                    <button
                      className="small-btn danger"
                      aria-label={'删除系列 ' + item.name}
                      onClick={() => void removeCatalog('series', item.id, item.name)}
                    >
                      <Trash2 size={14} /> 删除
                    </button>
                  </div>
                ))}
                {!data.series.length && <small className="muted">暂无系列</small>}
              </article>
              <article hidden={!['productType', 'tag'].includes(adminTab)}>
                <h3>{adminTab === 'productType' ? '自定义谷子类型' : '标签'}</h3>
                {adminTab === 'productType' &&
                  data.productTypes
                    .filter((item) => item.key.startsWith('CUSTOM_'))
                    .map((item) => (
                      <div className="taxonomy-row" key={item.key}>
                        <span>
                          <small>类型</small>
                          {item.name}
                        </span>
                        <button
                          className="small-btn danger"
                          aria-label={'删除类型 ' + item.name}
                          onClick={() => void removeCatalog('productType', item.key, item.name)}
                        >
                          <Trash2 size={14} /> 删除
                        </button>
                      </div>
                    ))}
                {adminTab === 'tag' &&
                  data.tags.map((item) => (
                    <div className="taxonomy-row" key={item.id}>
                      <span>
                        <small>标签</small>
                        {item.name}
                      </span>
                      <button
                        className="small-btn danger"
                        aria-label={'删除标签 ' + item.name}
                        onClick={() => void removeCatalog('tag', item.id, item.name)}
                      >
                        <Trash2 size={14} /> 删除
                      </button>
                    </div>
                  ))}
                {adminTab === 'tag' && !data.tags.length && (
                  <small className="muted">暂无标签</small>
                )}
                {adminTab === 'productType' &&
                  !data.productTypes.some((item) => item.key.startsWith('CUSTOM_')) && (
                    <small className="muted">暂无自定义谷子类型</small>
                  )}
              </article>
            </div>
          </section>
        </>
      );
    else if (path === '/me')
      content = (
        <>
          <AccountPanel user={user} onLogout={logout} />
          <MoreMenu role={user.role} />
        </>
      );
    else if (['/ips', '/characters', '/series'].includes(path))
      content = (
        <>
          <h1>沿着喜欢，找到它们</h1>
          {cards(visible)}
        </>
      );
    else
      content = (
        <div className="more-grid">
          {appNavigation
            .filter((item) => !item.admin || user.role === 'ADMIN')
            .map(({ href, label, icon: Icon }) => (
              <Link key={href} href={href}>
                <Icon />
                <span>{label}</span>
                <ChevronRight />
              </Link>
            ))}
        </div>
      );
  }
  const openQuickAction = (action: QuickAction) => setDialog({ type: action });
  return (
    <>
      <AppShell
        path={path}
        section={section}
        user={user}
        data={data}
        onLogout={logout}
        onQuickAction={openQuickAction}
      >
        <div className="app-content">
          {path !== '/' &&
            !selected &&
            !groupDetail &&
            !path.startsWith('/posters') &&
            path !== '/accounting' &&
            path !== '/me' && (
              <div className="toolbar">
                <h2>{section}</h2>
                <div className="toolbar-controls">
                  <div className="search-box">
                    <Search size={17} />
                    <input
                      aria-label="搜索谷子"
                      placeholder="搜索谷子、角色、系列…"
                      value={q}
                      onChange={(e) => {
                        setQ(e.target.value);
                      }}
                    />
                  </div>
                  <button
                    className="filter-button"
                    aria-label="筛选"
                    onClick={() => setFilter(true)}
                  >
                    <SlidersHorizontal size={17} />
                    <span>筛选</span>
                  </button>
                  <button
                    className="primary"
                    onClick={() =>
                      setDialog({
                        type:
                          path === '/purchases'
                            ? 'purchase'
                            : path === '/sales'
                              ? 'sale'
                              : path === '/groups'
                                ? 'group'
                                : path === '/wanted'
                                  ? 'wanted'
                                  : path === '/listings'
                                    ? 'listing'
                                    : path === '/inventory'
                                      ? 'purchase'
                                      : 'product',
                      })
                    }
                  >
                    <Plus size={17} />
                    <span>添加</span>
                  </button>
                </div>
              </div>
            )}
          {error ? (
            <div className="empty">
              <p className="error">{error}</p>
              <button onClick={() => void load()}>
                <RefreshCw size={16} /> 重试
              </button>
            </div>
          ) : !data ? (
            <div className="skeleton-grid">
              {[1, 2, 3, 4].map((i) => (
                <div className="skeleton" key={i} />
              ))}
            </div>
          ) : (
            content
          )}
          <footer className="page-footer">
            <Flower2 size={13} /> 收藏有迹，喜欢无价。
            <span>GUYU · YOUR LITTLE COLLECTION ISLAND</span>
          </footer>
        </div>
      </AppShell>
      {dialog && data && (
        <ActionForm
          dialog={dialog}
          data={data}
          onClose={() => setDialog(null)}
          onSave={save}
          onRefresh={load}
        />
      )}
      {filter && data && (
        <div className="modal-backdrop">
          <section className="modal filter-modal">
            <header>
              <h2>筛选收藏</h2>
              <button className="icon-btn" aria-label="关闭筛选" onClick={() => setFilter(false)}>
                <X />
              </button>
            </header>
            <div className="form-grid">
              {[
                ['IP', ip, setIp, data.ips.map((i) => [i.id, i.name])],
                ['角色', character, setCharacter, data.characters.map((c) => [c.id, c.name])],
                ['系列', series, setSeries, data.series.map((s) => [s.id, s.name])],
                ['标签', tag, setTag, data.tags.map((t) => [t.id, t.name])],
                ['商品类型', type, setType, data.productTypes.map((t) => [t.key, t.name])],
                [
                  '状态',
                  status,
                  setStatus,
                  path === '/inventory'
                    ? [
                        ['stock', '有货'],
                        ['IN_TRANSIT', '等待到货'],
                        ['empty', '无货'],
                        ['listed', '正在出物'],
                      ]
                    : path === '/wanted'
                      ? [
                          ['ACTIVE', '正在收'],
                          ['WANTED', '尚未收到'],
                          ['PARTIAL', '部分收到'],
                        ]
                      : Object.entries(statusNames),
                ],
              ].map(([label, value, setter, options]) => (
                <label key={String(label)}>
                  {String(label)}
                  <select
                    value={String(value)}
                    onChange={(e) => {
                      (setter as (v: string) => void)(e.target.value);
                    }}
                  >
                    <option value="">全部</option>
                    {(options as string[][]).map(([v, l]) => (
                      <option key={v} value={v}>
                        {l}
                      </option>
                    ))}
                  </select>
                </label>
              ))}
            </div>
            <footer>
              <button
                onClick={() => {
                  setIp('');
                  setCharacter('');
                  setSeries('');
                  setTag('');
                  setType('');
                  setStatus('');
                }}
              >
                重置
              </button>
              <button className="primary" onClick={() => setFilter(false)}>
                查看结果
              </button>
            </footer>
          </section>
        </div>
      )}
      {toast && <Toast message={toast.message} tone={toast.tone} />}
    </>
  );
}
