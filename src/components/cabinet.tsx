'use client';
import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import {
  Flower2,
  LayoutDashboard,
  BookOpen,
  Archive,
  ArrowDownLeft,
  ArrowUpRight,
  Users,
  Heart,
  Tag,
  Palette,
  Settings,
  Search,
  Plus,
  SlidersHorizontal,
  ChevronRight,
  Package,
  LogOut,
  ArrowRight,
  X,
  Sparkles,
  Upload,
  RefreshCw,
} from 'lucide-react';
import type { Snapshot, Product } from './types';
import { price, statusNames } from './types';
import ProductArt from './product-art';
import ActionForm from './action-form';
import type { Dialog } from './action-form';
import PosterEditor from './poster-editor';
import CollectionGallery from './collection-gallery';
import AccountingPanel from './accounting-panel';
const nav = [
  ['/', '我的小岛', LayoutDashboard],
  ['/products', '谷子图鉴', BookOpen],
  ['/inventory', '我的收藏柜', Archive],
  ['/purchases', '买入记录', ArrowDownLeft],
  ['/sales', '卖出记录', ArrowUpRight],
  ['/accounting', '收支账本', BookOpen],
  ['/groups', '我的拼团', Users],
  ['/wanted', '收物心愿', Heart],
  ['/listings', '正在出物', Tag],
  ['/posters', '海报工坊', Palette],
  ['/admin', '图鉴管理', Settings],
] as const;
export default function Cabinet({ user }: { user: { name: string; role: string } }) {
  const router = useRouter();
  const path = usePathname();
  const searchParams = useSearchParams();
  const [data, setData] = useState<Snapshot | null>(null);
  const [error, setError] = useState('');
  const [toast, setToast] = useState('');
  const [dialog, setDialog] = useState<Dialog | null>(null);
  const [q, setQ] = useState('');
  const [filter, setFilter] = useState(false);
  const [ip, setIp] = useState('');
  const [character, setCharacter] = useState('');
  const [series, setSeries] = useState('');
  const [tag, setTag] = useState('');
  const [type, setType] = useState('');
  const [status, setStatus] = useState(searchParams.get('status') ?? '');
  const [page, setPage] = useState(1);
  const [imageBusy, setImageBusy] = useState(false);
  const load = useCallback(async () => {
    try {
      const r = await fetch('/api/data', { cache: 'no-store' });
      if (r.status === 401) {
        router.replace('/login');
        router.refresh();
        return;
      }
      const j = await r.json();
      if (!r.ok) throw Error(j.error);
      setData(j);
      setError('');
    } catch (e) {
      setError((e as Error).message);
    }
  }, [router]);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- load updates state only after the asynchronous network response.
    void load();
    if ('serviceWorker' in navigator && process.env.NODE_ENV === 'production')
      navigator.serviceWorker.register('/sw.js').catch(() => {});
  }, [load]);
  useEffect(() => {
    if (!data?.jobs.some((j) => ['QUEUED', 'RUNNING'].includes(j.status))) return;
    const interval = setInterval(() => void load(), 2500);
    return () => clearInterval(interval);
  }, [data, load]);
  const notify = (message: string) => {
    setToast(message);
    setTimeout(() => setToast(''), 4000);
  };
  const save = async (op: string, payload: Record<string, unknown>) => {
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
    notify('已保存，收藏柜已更新');
    return j;
  };
  const act = async (op: string, payload: Record<string, unknown>) => {
    try {
      await save(op, payload);
    } catch (e) {
      notify((e as Error).message);
    }
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
      notify((e as Error).message);
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
      notify((e as Error).message);
    } finally {
      setImageBusy(false);
    }
  };
  const selected = path.startsWith('/products/')
    ? data?.products.find((p) => p.id === path.split('/')[2])
    : undefined;
  const groupDetail = path.startsWith('/groups/')
    ? data?.groups.find((g) => g.id === path.split('/')[2])
    : undefined;
  const section =
    nav.find((n) => n[0] === path)?.[1] ??
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
  const productById = (id: string) => all.find((p) => p.id === id);
  const invFor = (id: string) => data?.inventory.find((i) => i.productId === id);
  const listingCount = (id: string) =>
    data?.listings
      .filter((l) => l.inventory.productId === id && l.status === 'ACTIVE')
      .reduce((n, l) => n + l.remainingQuantity, 0) ?? 0;
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
    <div className="empty">
      <Flower2 size={38} strokeWidth={1} />
      <h3>{text}</h3>
      <p>慢慢来，把每一份喜欢放进这里。</p>
      {button && (
        <button className="primary" onClick={onClick}>
          {button}
          <Plus size={16} />
        </button>
      )}
    </div>
  );
  const matches = (id: string) => filtered.some((p) => p.id === id);
  const actionButton = (kind: string, label: string, id?: string, productId?: string) => (
    <button className="small-btn" onClick={() => setDialog({ type: kind, id, productId })}>
      {label}
    </button>
  );
  const recordProduct = (id: string) => (
    <Link href={'/products/' + id} className="record-product">
      {productById(id) && <ProductArt product={productById(id)!} />}
      <strong>{productById(id)?.name ?? '商品'}</strong>
    </Link>
  );
  function purchasesList(items: Snapshot['purchases']) {
    return (
      <CollectionGallery
        heading={status === 'IN_TRANSIT' ? '等待到货' : '买入记录'}
        items={items
          .filter((p) => productById(p.productId))
          .map((p) => ({
            id: p.id,
            product: productById(p.productId)!,
            badge: statusNames[p.arrivalStatus],
            summary: (
              <>
                <strong>
                  {p.quantity} 件 · 实际成本 {price(p.actualCost)}
                </strong>
                <small>
                  {p.purchaseChannel} · {p.purchaseDate.slice(0, 10)}
                </small>
              </>
            ),
            actions: (
              <>
                {!['ARRIVED', 'CANCELLED'].includes(p.arrivalStatus) && (
                  <>
                    <button
                      className="small-btn"
                      onClick={() => act('purchase.arrive', { id: p.id })}
                    >
                      确认到货
                    </button>
                    <button
                      className="small-btn"
                      onClick={() => act('purchase.status', { id: p.id, status: 'CANCELLED' })}
                    >
                      取消
                    </button>
                  </>
                )}
                {p.arrivalStatus !== 'CANCELLED' && actionButton('fees', '补运费', p.id)}
              </>
            ),
            details: (
              <details className="record-details">
                <summary>费用与补费记录</summary>
                <p>
                  商品金额 {price(p.productAmount)} · 国内运费 {price(p.domesticShipping)} ·
                  国际运费 {price(p.internationalShipping)} · 其他 {price(p.otherFee)}
                </p>
                {p.adjustments.map((a) => (
                  <p key={a.id}>
                    +{price(a.amount)} · {a.reason}
                  </p>
                ))}
              </details>
            ),
          }))}
      />
    );
  }
  function salesList(items: Snapshot['sales']) {
    return items.length ? (
      <div className="record-list">
        {items.map((s) => {
          const cost =
            Number(s.allocatedActualCost) +
            s.costAdjustments.reduce((n, a) => n + Number(a.amount), 0);
          return (
            <article className="record" key={s.id}>
              {recordProduct(s.productId)}
              <div>
                <small>实际成交</small>
                <strong>
                  {s.quantity} 件 · {price(s.totalAmount)}
                </strong>
              </div>
              <div>
                <small>分摊成本（含补费）</small>
                <strong>{price(cost)}</strong>
              </div>
              <div>
                <small>本次收益</small>
                <strong className={Number(s.totalAmount) - cost >= 0 ? 'green' : ''}>
                  {price(Number(s.totalAmount) - cost)}
                </strong>
              </div>
              <small>
                {s.saleChannel} · {s.saleDate.slice(0, 10)}
              </small>
            </article>
          );
        })}
      </div>
    ) : (
      empty('喜欢还在身边，暂时没有成交')
    );
  }
  let content: React.ReactNode = null;
  if (data) {
    const visible = filtered.filter((p) => p.status === 'ACTIVE');
    const owned = visible.filter(
      (p) =>
        invFor(p.id) &&
        (!status ||
          (status === 'stock'
            ? invFor(p.id)!.currentQuantity > 0
            : status === 'empty'
              ? invFor(p.id)!.currentQuantity === 0
              : listingCount(p.id) > 0)),
    );
    if (path === '/')
      content = (
        <>
          <section className="hero">
            <div>
              <span className="eyebrow">MY LITTLE COLLECTION ISLAND</span>
              <h1>
                把每一份喜欢，
                <br />
                <em>好好收藏。</em>
              </h1>
              <p>
                {user.name}，欢迎回到你的谷子小岛。
                <br />
                在这里，记录每一次心动和相遇。
              </p>
              <button className="primary" onClick={() => setDialog({ type: 'purchase' })}>
                收藏新的喜欢 <Plus size={17} />
              </button>
            </div>
            <div className="hero-art">
              <div className="paper-note">
                little things,
                <br />
                <i>big happiness.</i>
                <Flower2 size={36} />
              </div>
              <div className="hero-badge">
                <Flower2 size={86} strokeWidth={1} />
                <span>MY FAVORITES</span>
              </div>
              <span className="sparkle one">✧</span>
              <span className="sparkle two">✦</span>
              <span className="hero-caption">YOUR COLLECTION, YOUR STORY.</span>
            </div>
          </section>
          <div className="stats">
            {[
              [
                Archive,
                '在手谷子',
                data.inventory.reduce((n, i) => n + i.currentQuantity, 0),
                '件喜欢',
              ],
              [
                BookOpen,
                '收藏种类',
                data.inventory.filter((i) => i.currentQuantity > 0).length,
                '种心动',
              ],
              [
                Package,
                '等待到货',
                data.purchases
                  .filter((p) => ['PENDING', 'SHIPPED'].includes(p.arrivalStatus))
                  .reduce((n, p) => n + p.quantity, 0),
                '件在路上',
              ],
              [
                Heart,
                '正在收物',
                data.wanted.filter((w) => ['WANTED', 'PARTIAL'].includes(w.status)).length,
                '份心愿',
              ],
            ].map(([Icon, label, value, unit], i) => {
              const I = Icon as typeof Archive;
              return (
                <Link
                  className="stat stat-link"
                  key={i}
                  href={
                    [
                      '/inventory?status=stock',
                      '/inventory?status=stock',
                      '/purchases?status=IN_TRANSIT',
                      '/wanted?status=ACTIVE',
                    ][i]
                  }
                  aria-label={'查看' + String(label)}
                >
                  <span className={'stat-icon tone-' + i}>
                    <I size={20} />
                  </span>
                  <div>
                    <small>{String(label)}</small>
                    <strong>
                      {String(value)} <span>{String(unit)}</span>
                    </strong>
                  </div>
                  <ChevronRight className="stat-arrow" size={15} />
                </Link>
              );
            })}
          </div>
          <section className="section-heading">
            <div>
              <span className="eyebrow">ON YOUR SHELF</span>
              <h2>
                收藏柜的一角{' '}
                <span>{data.inventory.filter((i) => i.currentQuantity > 0).length}</span>
              </h2>
            </div>
            <Link href="/inventory">
              查看全部 <ArrowRight size={16} />
            </Link>
          </section>
          {data.inventory.some((i) => i.currentQuantity > 0)
            ? cards(all.filter((p) => (invFor(p.id)?.currentQuantity ?? 0) > 0).slice(0, 4))
            : empty('收藏柜等着第一份喜欢', '记录买入', () => setDialog({ type: 'purchase' }))}
          <div className="dashboard-bottom">
            <section className="mini-panel">
              <h3>
                <ArrowDownLeft size={18} /> 最近买入
              </h3>
              {data.purchases.slice(0, 3).map((p) => (
                <div className="mini-row" key={p.id}>
                  <span>{productById(p.productId)?.name}</span>
                  <strong>{price(p.actualCost)}</strong>
                </div>
              ))}
              {!data.purchases.length && <p className="muted">每一次心动，都值得被记录。</p>}
            </section>
            <section className="mini-panel">
              <h3>
                <ArrowUpRight size={18} /> 最近卖出
              </h3>
              {data.sales.slice(0, 3).map((s) => (
                <div className="mini-row" key={s.id}>
                  <span>{productById(s.productId)?.name}</span>
                  <strong>{price(s.totalAmount)}</strong>
                </div>
              ))}
              {!data.sales.length && <p className="muted">让喜欢在新的收藏柜里延续。</p>}
            </section>
            <Link href="/posters" className="workshop-promo">
              <Palette size={27} />
              <h3>给喜欢做一张海报</h3>
              <p>收物 / 出物 · 四款手帐模板</p>
              <span>
                去海报工坊 <ArrowUpRight size={16} />
              </span>
            </Link>
          </div>
          <div className="dashboard-poster-links">
            <Link href="/wanted?status=ACTIVE">逛逛收物心愿 →</Link>
            <Link href="/posters?source=wanted">生成我的收物图 →</Link>
            <Link href="/listings?status=ACTIVE">查看正在出物 →</Link>
            <Link href="/posters?source=listings">生成我的出物图 →</Link>
          </div>
          <div className="summary-strip">
            待排发{' '}
            {
              data.groups
                .flatMap((g) => g.items)
                .filter(
                  (i) =>
                    i.dispatchStatus === 'NOT_DISPATCHED' &&
                    i.purchase?.arrivalStatus !== 'CANCELLED',
                ).length
            }{' '}
            项 <span>·</span> 正在出物{' '}
            {data.listings
              .filter((l) => l.status === 'ACTIVE')
              .reduce((n, l) => n + l.remainingQuantity, 0)}{' '}
            件 <span>·</span> 当前库存成本{' '}
            {price(data.inventory.reduce((n, i) => n + Number(i.currentCost), 0))}
          </div>
        </>
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
          {purchasesList(data.purchases.filter((p) => p.productId === selected.id))}
          <section className="section-heading">
            <h2>卖出记录</h2>
          </section>
          {salesList(data.sales.filter((s) => s.productId === selected.id))}
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
    } else if (path === '/products' || path === '/inventory') {
      const list = path === '/inventory' ? owned : visible;
      content = (
        <>
          <div className="page-intro">
            <span className="eyebrow">
              {path === '/inventory' ? 'YOUR OWN LITTLE TREASURES' : 'THE COLLECTION ENCYCLOPEDIA'}
            </span>
            <h1>{path === '/inventory' ? '我的收藏柜' : '发现下一份心动'}</h1>
            <p>
              {path === '/inventory'
                ? '每一件谷子，都有属于它的故事。'
                : '从角色到系列，让每一份喜欢都有迹可循。'}
            </p>
          </div>
          {list.length ? (
            <CollectionGallery
              heading={path === '/inventory' ? '我的收藏' : '谷子图鉴'}
              items={list.slice((page - 1) * 12, page * 12).map((p) => ({
                id: p.id,
                product: p,
                badge: p.typeDefinition.name,
                summary: (
                  <>
                    <strong>{invFor(p.id)?.currentQuantity ?? 0} 件在手</strong>
                    {path === '/inventory' && (
                      <small>
                        均价{' '}
                        {price(
                          invFor(p.id)?.currentQuantity
                            ? Number(invFor(p.id)!.currentCost) / invFor(p.id)!.currentQuantity
                            : 0,
                        )}{' '}
                        · 挂出 {listingCount(p.id)} 件
                      </small>
                    )}
                  </>
                ),
                actions: (
                  <button
                    className="small-btn"
                    onClick={() => setDialog({ type: 'purchase', productId: p.id })}
                  >
                    记录买入
                  </button>
                ),
              }))}
            />
          ) : (
            empty('这里还没有谷子', path === '/inventory' ? '记录买入' : '添加商品', () =>
              setDialog({ type: path === '/inventory' ? 'purchase' : 'product' }),
            )
          )}
          <div className="pagination">
            <button disabled={page === 1} onClick={() => setPage(page - 1)}>
              上一页
            </button>
            <span>
              {page} / {Math.max(1, Math.ceil(list.length / 12))}
            </span>
            <button disabled={page * 12 >= list.length} onClick={() => setPage(page + 1)}>
              下一页
            </button>
          </div>
        </>
      );
    } else if (path === '/purchases')
      content = purchasesList(
        data.purchases.filter(
          (p) =>
            matches(p.productId) &&
            (!status ||
              (status === 'IN_TRANSIT'
                ? ['PENDING', 'SHIPPED'].includes(p.arrivalStatus)
                : p.arrivalStatus === status)),
        ),
      );
    else if (path === '/sales') content = salesList(data.sales.filter((s) => matches(s.productId)));
    else if (path === '/listings') {
      const entries = data.listings.filter(
        (l) => matches(l.inventory.productId) && (!status || l.status === status),
      );
      content = (
        <>
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
          matches(w.productId) &&
          (!status ||
            (status === 'ACTIVE' ? ['WANTED', 'PARTIAL'].includes(w.status) : w.status === status)),
      );
      content = (
        <CollectionGallery
          heading="收物心愿"
          extra={
            <Link className="primary gallery-poster-link" href="/posters?source=wanted">
              批量制作收物图
            </Link>
          }
          items={entries.map((w) => ({
            id: w.id,
            product: productById(w.productId)!,
            badge: statusNames[w.status],
            summary: (
              <>
                <strong>{w.targetPrice ? price(w.targetPrice) : '价格可议'} / 件</strong>
                <small>
                  已收 {w.fulfilledQuantity} / 想收 {w.wantedQuantity} 件
                </small>
                <small>{w.notes}</small>
              </>
            ),
            actions: !['FULFILLED', 'CANCELLED'].includes(w.status) ? (
              <>
                <Link className="small-btn" href={'/posters?source=wanted&id=' + w.id}>
                  制作收物图
                </Link>
                <button
                  className="small-btn"
                  onClick={() =>
                    setDialog({ type: 'purchase', productId: w.productId, wantedId: w.id })
                  }
                >
                  记录买入
                </button>
                <button
                  className="small-btn"
                  onClick={() =>
                    act('wanted.progress', { id: w.id, fulfilledQuantity: w.wantedQuantity })
                  }
                >
                  仅标记收齐
                </button>
              </>
            ) : undefined,
          }))}
        />
      );
    } else if (path === '/groups')
      content = (
        <div className="group-grid">
          {data.groups
            .filter(
              (g) =>
                (!q || g.name.includes(q) || g.items.some((i) => matches(i.productId))) &&
                (!status || g.status === status),
            )
            .map((g) => (
              <Link className="group-card" href={'/groups/' + g.id} key={g.id}>
                <div className="group-card-top">
                  <Users size={24} />
                  <span className="pill">{statusNames[g.status]}</span>
                </div>
                <h2>{g.name}</h2>
                <p>团长 · {g.groupOwner}</p>
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
                <div className="group-link">
                  看看团里的喜欢 <ArrowRight size={16} />
                </div>
              </Link>
            ))}
          {!data.groups.length &&
            empty('跟同好一起，等待喜欢到来', '记录拼团', () => setDialog({ type: 'group' }))}
        </div>
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
            <div className="button-row">
              {actionButton('groupItem', '添加团项', groupDetail.id)}
              {groupDetail.status === 'OPEN' && (
                <button
                  onClick={() => act('group.status', { id: groupDetail.id, status: 'CLOSED' })}
                >
                  截团
                </button>
              )}
              {groupDetail.status === 'CLOSED' && (
                <button
                  onClick={() => act('group.status', { id: groupDetail.id, status: 'COMPLETED' })}
                >
                  完成拼团
                </button>
              )}
            </div>
          </div>
          <div className="record-list">
            {groupDetail.items.map((i) => (
              <article className="record" key={i.id}>
                {recordProduct(i.productId)}
                <strong>
                  {i.purchase?.quantity ?? i.quantity} 件 ·{' '}
                  {price(i.purchase?.unitPrice ?? i.unitPrice)}
                </strong>
                <div className="record-actions">
                  {[
                    ['paymentStatus', 'UNPAID', 'PAID', '未支付', '已支付'],
                    ['shippingStatus', 'NOT_SHIPPED', 'SHIPPED', '上游未发货', '上游已发货'],
                    ['dispatchStatus', 'NOT_DISPATCHED', 'DISPATCHED', '未排发', '已排发'],
                  ].map(([field, off, on, offLabel, onLabel]) => (
                    <button
                      className={
                        'small-btn ' + (i[field as keyof typeof i] === on ? 'selected' : '')
                      }
                      key={field}
                      onClick={() =>
                        act('group.item-status', {
                          id: i.id,
                          [field]: i[field as keyof typeof i] === on ? off : on,
                        })
                      }
                    >
                      {i[field as keyof typeof i] === on ? onLabel : offLabel}
                    </button>
                  ))}
                </div>
                {i.purchase ? (
                  <>
                    <span className="pill">{statusNames[i.purchase.arrivalStatus]}</span>
                    {!['ARRIVED', 'CANCELLED'].includes(i.purchase.arrivalStatus) && (
                      <button
                        className="small-btn"
                        onClick={() => act('purchase.arrive', { id: i.purchase!.id })}
                      >
                        本人确认到货
                      </button>
                    )}
                  </>
                ) : (
                  actionButton('purchase', '登记购买', i.id, i.productId)
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
          <div className="record-list">
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
              </article>
            ))}
          </div>
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
          {nav
            .filter((n) => n[0] !== '/admin' || user.role === 'ADMIN')
            .map(([href, label, Icon]) => (
              <Link key={href} href={href}>
                <Icon />
                <span>{label}</span>
                <ChevronRight />
              </Link>
            ))}
        </div>
      );
  }
  return (
    <div className="app-shell">
      <aside className="sidebar">
        <Link href="/" className="brand">
          <span className="brand-mark">
            <Flower2 size={26} />
          </span>
          <span>
            谷屿<small>GUYU COLLECTION</small>
          </span>
        </Link>
        <div className="nav-label">我的收藏生活</div>
        <nav>
          {nav
            .filter((n) => n[0] !== '/admin' || user.role === 'ADMIN')
            .map(([href, label, Icon]) => (
              <Link
                className={
                  path === href || (href !== '/' && path.startsWith(href + '/')) ? 'active' : ''
                }
                key={href}
                href={href}
              >
                <Icon size={19} />
                {label}
                {href === '/posters' && <span className="new-tag">NEW</span>}
              </Link>
            ))}
        </nav>
        <div className="sidebar-note">
          <Flower2 size={20} />
          <p>
            小小的谷子，
            <br />
            大大的喜欢。
          </p>
          <span>COLLECT LITTLE JOYS</span>
        </div>
        <div className="profile">
          <span className="avatar">{user.name.slice(0, 1)}</span>
          <div>
            <strong>{user.name}</strong>
            <small>我的私人收藏柜</small>
          </div>
          <button
            className="icon-btn"
            aria-label="退出登录"
            onClick={async () => {
              await fetch('/api/auth', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'logout' }),
              });
              router.replace('/login');
              router.refresh();
            }}
          >
            <LogOut size={16} />
          </button>
        </div>
      </aside>
      <main className="main">
        <header className="topbar">
          <div className="breadcrumb">
            <Flower2 size={18} /> <span>我的收藏生活</span>
            <ChevronRight size={14} />
            <strong>{section}</strong>
          </div>
          <div className="top-right">
            <span className="online-dot" />
            <span>记录每一份喜欢</span>
            <span className="avatar small">{user.name.slice(0, 1)}</span>
          </div>
        </header>
        <div className="content">
          {path !== '/' &&
            !selected &&
            !groupDetail &&
            !path.startsWith('/posters') &&
            path !== '/accounting' && (
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
                        setPage(1);
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
              <button onClick={load}>
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
      </main>
      <nav className="bottom-nav">
        {[
          ['/', '首页', LayoutDashboard],
          ['/products', '图鉴', BookOpen],
          ['/inventory', '库存', Archive],
          ['/transactions', '交易', ArrowDownLeft],
          ['/me', '我的', Heart],
        ].map(([href, label, Icon]) => {
          const I = Icon as typeof Heart;
          return (
            <Link className={path === href ? 'active' : ''} key={String(href)} href={String(href)}>
              <I size={21} />
              <span>{String(label)}</span>
            </Link>
          );
        })}
      </nav>
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
                        ['empty', '无货'],
                        ['listed', '正在出物'],
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
                      setPage(1);
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
      {toast && (
        <div className="toast" role="status">
          {toast}
        </div>
      )}
    </div>
  );
}
