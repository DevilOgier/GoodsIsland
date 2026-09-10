'use client';
import { useState } from 'react';
import Link from 'next/link';
import type { Snapshot } from './types';
import { statusNames } from './types';
import { accounting, fixed, localDate } from '@/domain/accounting';
export default function AccountingPanel({ data }: { data: Snapshot }) {
  const [month, setMonth] = useState(localDate(new Date().toISOString()).slice(0, 7));
  const [ip, setIp] = useState(''),
    [character, setCharacter] = useState(''),
    [series, setSeries] = useState(''),
    [type, setType] = useState(''),
    [status, setStatus] = useState('');
  const a = accounting(data, { month, ip, character, series, type, status });
  const money = (n: bigint) => '¥' + fixed(n);
  const productName = (id: string) => data.products.find((p) => p.id === id)?.name ?? '未知商品';
  function exportCSV() {
    const cell = (s: string) =>
      '"' + (/^[\s]*[=+@-]|^[\t\r\n]/.test(s) ? "'" + s : s).replaceAll('"', '""') + '"';
    const lines = [
      ['日期', '类型', '商品', '数量', '收入', '支出', '状态', '渠道', '备注'],
      ...a.rows.map((r) => [
        r.date,
        r.kind,
        productName(r.productId),
        String(r.quantity),
        fixed(r.income),
        fixed(r.expense),
        statusNames[r.status] ?? '已售',
        r.channel,
        r.notes,
      ]),
    ];
    const url = URL.createObjectURL(
      new Blob(['\uFEFF' + lines.map((row) => row.map(cell).join(',')).join('\r\n')], {
        type: 'text/csv;charset=utf-8',
      }),
    );
    const link = document.createElement('a');
    link.href = url;
    link.download = '谷屿账本-' + (month || '全部') + '.csv';
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  return (
    <div className="accounting-panel">
      <div className="page-intro">
        <span className="eyebrow">EVERY LITTLE SPENDING</span>
        <h1>喜欢，也心中有数</h1>
        <p>看看每月收支，以及每个角色、系列里积累的收藏。</p>
      </div>
      <div className="account-filters">
        <label>
          月份
          <input
            aria-label="记账月份"
            type="month"
            value={month}
            onChange={(e) => setMonth(e.target.value)}
          />
        </label>
        <label>
          IP
          <select
            aria-label="记账 IP"
            value={ip}
            onChange={(e) => {
              setIp(e.target.value);
              setCharacter('');
              setSeries('');
            }}
          >
            <option value="">全部 IP</option>
            {data.ips.map((i) => (
              <option key={i.id} value={i.id}>
                {i.name}
              </option>
            ))}
          </select>
        </label>
        <label>
          角色
          <select
            aria-label="记账角色"
            value={character}
            onChange={(e) => {
              setCharacter(e.target.value);
              setSeries('');
            }}
          >
            <option value="">全部角色</option>
            {data.characters
              .filter((c) => !ip || c.ipId === ip)
              .map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
          </select>
        </label>
        <label>
          系列
          <select aria-label="记账系列" value={series} onChange={(e) => setSeries(e.target.value)}>
            <option value="">全部系列</option>
            {data.series
              .filter(
                (s) =>
                  (!character || s.characterId === character) &&
                  (!ip || data.characters.find((c) => c.id === s.characterId)?.ipId === ip),
              )
              .map((s) => (
                <option key={s.id} value={s.id}>
                  {data.characters.find((c) => c.id === s.characterId)?.name} · {s.name}
                </option>
              ))}
          </select>
        </label>
        <label>
          谷子类型
          <select aria-label="记账类型" value={type} onChange={(e) => setType(e.target.value)}>
            <option value="">全部类型</option>
            {data.productTypes.map((t) => (
              <option key={t.key} value={t.key}>
                {t.name}
              </option>
            ))}
          </select>
        </label>
        <label>
          流水状态
          <select aria-label="记账状态" value={status} onChange={(e) => setStatus(e.target.value)}>
            <option value="">全部状态</option>
            {['PENDING', 'SHIPPED', 'ARRIVED', 'SOLD'].map((s) => (
              <option key={s} value={s}>
                {statusNames[s] ?? '已卖出'}
              </option>
            ))}
          </select>
        </label>
      </div>
      <div className="button-row">
        <button onClick={() => setMonth('')}>全部月份</button>
        <button
          onClick={() => {
            setMonth(localDate(new Date().toISOString()).slice(0, 7));
            setIp('');
            setCharacter('');
            setSeries('');
            setType('');
            setStatus('');
          }}
        >
          重置筛选
        </button>
        <button onClick={exportCSV}>导出当前流水 CSV</button>
      </div>
      <h2>{month || '全部月份'} · 收支</h2>
      <div className="account-stats">
        {[
          ['收入', a.income],
          ['支出', a.expense],
          ['净收支', a.net],
        ].map(([name, n]) => (
          <div className="mini-panel" key={String(name)}>
            <span>{String(name)}</span>
            <strong>{money(n as bigint)}</strong>
          </div>
        ))}
      </div>
      <p className="muted">
        按购入 /
        成交登记日期计算，晚补费用计入补费当天（北京时间）。取消购买不计入；挂出和收物心愿不计收支。当前没有独立付款、退款记录，收支不代表银行实际流水。
      </p>
      <h2>所选收藏 · 当前与累计</h2>
      <p className="muted">
        以下跟随
        IP、角色、系列和类型筛选，不受月份及流水状态限制。价值按实际成本计算，不代表市场估值。
      </p>
      <div className="account-stats">
        {[
          ['当前在手成本', money(a.currentCost)],
          ['花了尚未到手', money(a.pendingCost)],
          ['累计已入库金额', money(a.arrivedCost)],
          ['累计购入支出', money(a.totalSpent)],
          ['累计卖出收入', money(a.totalIncome)],
          ['累计已售利润', money(a.profit)],
          ['买入 / 卖出件数', a.bought + ' / ' + a.sold],
          ['在手 / 待到货件数', a.stock + ' / ' + a.pendingQuantity],
        ].map(([name, n]) => (
          <div className="mini-panel" key={name}>
            <span>{name}</span>
            <strong>{n}</strong>
          </div>
        ))}
      </div>
      <h2>系列累计明细</h2>
      <div className="account-table">
        <table>
          <thead>
            <tr>
              {[
                '角色 · 系列',
                '累计花费',
                '累计已入库',
                '尚未到手',
                '当前在手成本',
                '卖出收入',
                '买入 / 卖出',
              ].map((s) => (
                <th key={s}>{s}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {a.breakdown.map((b) => (
              <tr key={b.id}>
                <td>{b.name}</td>
                <td>{money(b.spent)}</td>
                <td>{money(b.arrived)}</td>
                <td>{money(b.pending)}</td>
                <td>{money(b.stock)}</td>
                <td>{money(b.income)}</td>
                <td>
                  {b.bought} / {b.sold}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {!a.breakdown.length && <p className="empty">当前筛选下还没有收藏账目。</p>}
      </div>
      <div className="account-breakdown-cards">
        {a.breakdown.map((b) => (
          <article className="mini-panel" key={b.id}>
            <h3>{b.name}</h3>
            <dl>
              <div>
                <dt>累计花费</dt>
                <dd>{money(b.spent)}</dd>
              </div>
              <div>
                <dt>已入库</dt>
                <dd>{money(b.arrived)}</dd>
              </div>
              <div>
                <dt>尚未到手</dt>
                <dd>{money(b.pending)}</dd>
              </div>
              <div>
                <dt>在手成本</dt>
                <dd>{money(b.stock)}</dd>
              </div>
              <div>
                <dt>卖出收入</dt>
                <dd>{money(b.income)}</dd>
              </div>
              <div>
                <dt>买入 / 卖出</dt>
                <dd>
                  {b.bought} / {b.sold}
                </dd>
              </div>
            </dl>
          </article>
        ))}
      </div>
      <h2>收支流水 · {a.rows.length} 笔</h2>
      <div className="account-ledger">
        {a.rows.map((r) => (
          <article className="mini-panel" key={r.id}>
            <div>
              <span className="pill">{r.kind}</span>{' '}
              <small>
                {r.date} · {r.channel} · {statusNames[r.status] ?? '已卖出'}
              </small>
            </div>
            <Link href={'/products/' + r.productId}>{productName(r.productId)}</Link>
            <strong>{r.income > 0n ? '+ ' + money(r.income) : '- ' + money(r.expense)}</strong>
            {r.quantity > 0 && <span>{r.quantity} 件</span>}
            <small>{r.notes}</small>
          </article>
        ))}
        {!a.rows.length && <p className="empty">这个月份和筛选条件下没有流水。</p>}
      </div>
    </div>
  );
}
