'use client';
import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { Flower2, Search, Plus, SlidersHorizontal, ChevronRight, X, RefreshCw } from 'lucide-react';
import type { Snapshot, Product } from './types';
import { createSnapshotCache } from '@/lib/snapshot-cache';
const snapshotCache = createSnapshotCache<Snapshot>();
import { price, statusNames } from './types';
import ProductArt from './product-art';
import ActionForm from './action-form';
import type { Dialog } from './action-form';
import PosterEditor from './poster-editor';
import AccountingPanel from './accounting-panel';
import AccountPanel from './account-panel';
import { AppShell, appNavigation, MoreMenu } from './layout';
import { Toast } from './ui';
import type { QuickAction } from './layout/quick-action-sheet';
import { useSnapshotIndex } from '@/hooks/use-snapshot-index';
import { useCatalogFilters } from '@/hooks/use-catalog-filters';
import DashboardPage from './dashboard/dashboard-page';
import CatalogPage from './catalog/catalog-page';
import InventoryPage from './inventory/inventory-page';
import PurchasePage, { PurchaseList } from './purchase/purchase-page';
import SalePage, { SaleList } from './sale/sale-page';
import WantedPage from './wanted/wanted-page';
import ListingsPage from './listings/listings-page';
import GroupPage from './groups/group-page';
import GroupDetail from './groups/group-detail';
import AdminPage, { type AdminTab } from './admin/admin-page';
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
  const [filter, setFilter] = useState(false);
  const {
    q,
    ip,
    character,
    series,
    tag,
    type,
    status,
    setQ,
    setIp,
    setCharacter,
    setSeries,
    setTag,
    setType,
    setStatus,
  } = useCatalogFilters();
  const [imageBusy, setImageBusy] = useState(false);
  const [adminTab, setAdminTab] = useState<AdminTab>('product');
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
  const matches = (id: string) => filtered.some((p) => p.id === id);
  const actionButton = (kind: string, label: string, id?: string, productId?: string) => (
    <button className="small-btn" onClick={() => setDialog({ type: kind, id, productId })}>
      {label}
    </button>
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
        (listing) => matches(listing.inventory.productId) && (!status || listing.status === status),
      );
      content = (
        <ListingsPage
          items={entries}
          productFor={productById}
          onSale={(listingId, productId) => setDialog({ type: 'sale', id: listingId, productId })}
          onCancel={(id) => void act('listing.cancel', { id })}
        />
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
    } else if (path === '/groups') {
      const groups = data.groups.filter(
        (group) =>
          (!q || group.name.includes(q) || group.items.some((item) => matches(item.productId))) &&
          (!status || group.status === status) &&
          (groupView !== 'open' || group.status === 'OPEN'),
      );
      content = (
        <GroupPage
          data={data}
          groups={groups}
          tasks={groupTasks}
          view={groupView}
          productFor={productById}
          onCreate={() => setDialog({ type: 'group' })}
        />
      );
    } else if (groupDetail) {
      content = (
        <GroupDetail
          group={groupDetail}
          pendingAction={pendingAction}
          productFor={productById}
          onAction={(operation, payload, message, key) =>
            void act(operation, payload, message, key)
          }
          onAddItem={() => setDialog({ type: 'groupItem', id: groupDetail.id })}
          onDispatch={(id) => setDialog({ type: 'groupDispatch', id })}
        />
      );
    } else if (path.startsWith('/posters'))
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
        <AdminPage
          data={data}
          products={filtered}
          tab={adminTab}
          imageBusy={imageBusy}
          onTabChange={setAdminTab}
          onOpenForm={(type, id) => setDialog({ type, id })}
          onImageAction={(action, id, source) => void imageAction(action, id, source)}
          onUpload={(file, productId) => void upload(file, productId)}
          onArchive={(id, nextStatus) => void act('catalog.archive', { id, status: nextStatus })}
          onRemove={(entity, id, name) => void removeCatalog(entity, id, name)}
        />
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
