'use client';
import { useState } from 'react';
import { X, Images } from 'lucide-react';
import ProductPicker from './product-picker';
import ProductArt from './product-art';
import ProductEditor from './product-editor';
import { PurchaseChannelPicker } from './purchase/purchase-channel-picker';
import type { Snapshot } from './types';
import { typeNames } from './types';
export type Dialog = { type: string; id?: string; productId?: string; wantedId?: string };
type Field = {
  name: string;
  label: string;
  kind?: string;
  options?: [string, string][];
  value?: string;
  required?: boolean;
  min?: string;
};
export default function ActionForm({
  dialog,
  data,
  onClose,
  onSave,
  onRefresh,
}: {
  dialog: Dialog;
  data: Snapshot;
  onClose: () => void;
  onSave: (op: string, payload: Record<string, unknown>) => Promise<unknown>;
  onRefresh: () => Promise<void>;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const purchase = data.purchases.find((p) => p.id === dialog.id);
  const [pickedId, setPickedId] = useState(dialog.productId ?? purchase?.productId ?? '');
  const [picking, setPicking] = useState(false);
  const linkedGroup =
    dialog.type === 'purchase' && dialog.id
      ? data.groups.find((g) => g.items.some((i) => i.id === dialog.id))
      : purchase
        ? data.groups.find((g) => g.items.some((i) => i.purchase?.id === purchase.id))
        : undefined;
  const linkedItem = linkedGroup?.items.find(
    (i) => i.id === dialog.id || i.purchase?.id === purchase?.id,
  );
  const [channel, setChannel] = useState(
    purchase?.purchaseChannel ?? (linkedGroup ? '拼团' : '闲鱼'),
  );
  const [groupChoice, setGroupChoice] = useState(linkedGroup?.id ?? '');
  const [itemChoice, setItemChoice] = useState('');
  const chosenGroup = data.groups.find((g) => g.id === groupChoice);
  const availableItems =
    chosenGroup?.items.filter((i) => i.productId === pickedId && !i.purchase) ?? [];
  const picked = data.products.find((p) => p.id === pickedId);
  if (['product', 'productEdit'].includes(dialog.type))
    return (
      <ProductEditor
        data={data}
        id={dialog.type === 'productEdit' ? dialog.id : undefined}
        onSave={onSave}
        onClose={onClose}
        onRefresh={onRefresh}
      />
    );
  const productOptions = data.products
    .filter((p) => p.status === 'ACTIVE')
    .map((p) => [p.id, p.name] as [string, string]);
  const product: Field = {
    name: 'productId',
    label: '选择谷子',
    options: productOptions,
    value: dialog.productId,
    required: true,
  };
  const qty: Field = { name: 'quantity', label: '数量', kind: 'number', value: '1', min: '1' };
  const unit: Field = {
    name: 'unitPrice',
    label: '单价（元）',
    kind: 'number',
    value: '0',
    min: '0',
  };
  const notes: Field = { name: 'notes', label: '备注', required: false };
  const date = new Date().toLocaleDateString('sv-SE');
  let title = '',
    op = '',
    fields: Field[] = [];
  switch (dialog.type) {
    case 'purchase':
      title = '记录一份新喜欢';
      op = 'purchase.create';
      fields = [
        product,
        { ...qty, value: linkedItem ? String(linkedItem.quantity) : '1' },
        { ...unit, value: linkedItem ? String(linkedItem.unitPrice) : '0' },
        {
          name: 'purchaseChannel',
          label: '购买渠道',
          options: ['闲鱼', '拼团', '煤炉', '直播间', '淘宝', '线下', '其他'].map((v) => [v, v]),
        },
        { name: 'purchaseDate', label: '购买日期', kind: 'date', value: date },
        {
          name: 'arrivalStatus',
          label: '到货状态',
          options: [
            ['PENDING', '待到货（暂不入库）'],
            ['SHIPPED', '运输中'],
            ['ARRIVED', '已经到货（立即入库）'],
          ],
        },
        ...['domesticShipping', 'internationalShipping', 'otherFee'].map((name, i) => ({
          name,
          label: ['国内运费', '国际运费', '其他费用'][i] + '（元）',
          kind: 'number',
          value: '0',
          min: '0',
        })),
        notes,
      ];
      break;
    case 'purchaseEdit':
      if (!purchase) break;
      title = '修正买入记录';
      op = 'purchase.update';
      fields = [
        { ...product, value: purchase.productId },
        { ...qty, value: String(purchase.quantity) },
        { ...unit, value: String(purchase.unitPrice) },
        {
          name: 'purchaseChannel',
          label: '购买渠道',
          value: purchase.purchaseChannel,
          options: ['闲鱼', '拼团', '煤炉', '直播间', '淘宝', '线下', '其他'].map((v) => [v, v]),
        },
        {
          name: 'purchaseDate',
          label: '购买日期',
          kind: 'date',
          value: purchase.purchaseDate.slice(0, 10),
        },
        {
          name: 'arrivalStatus',
          label: '到货状态',
          value: purchase.arrivalStatus,
          options: [
            ['PENDING', '待到货（暂不入库）'],
            ['SHIPPED', '运输中'],
            ['ARRIVED', '已经到货（计入库存）'],
          ],
        },
        ...[
          ['domesticShipping', '国内运费', purchase.domesticShipping],
          ['internationalShipping', '国际运费', purchase.internationalShipping],
          ['otherFee', '其他费用', purchase.otherFee],
        ].map(([name, label, value]) => ({
          name,
          label: label + '（元）',
          kind: 'number',
          value: String(value),
          min: '0',
        })),
        { ...notes, value: purchase.notes },
      ];
      break;
    case 'productType':
      title = '新增谷子类型';
      op = 'catalog.type';
      fields = [{ name: 'name', label: '类型名称（例如：色纸、拍立得）' }];
      break;
    case 'fees':
      title = '追加运费 / 其他费用';
      op = 'purchase.fees';
      fields = [
        ...['domesticShipping', 'internationalShipping', 'otherFee'].map((name, i) => ({
          name,
          label: ['本次追加国内运费', '本次追加国际运费', '本次追加其他费用'][i],
          kind: 'number',
          value: '0',
          min: '0',
        })),
        { name: 'reason', label: '补费原因', required: true },
      ];
      break;
    case 'sale':
      title = '确认真正卖出';
      op = 'sale.create';
      fields = [
        product,
        qty,
        unit,
        {
          name: 'saleChannel',
          label: '出物渠道',
          options: ['闲鱼', '面交', '群内', '朋友', '其他'].map((v) => [v, v]),
        },
        { name: 'saleDate', label: '成交日期', kind: 'date', value: date },
        notes,
      ];
      break;
    case 'listing':
      title = '把喜欢传递出去';
      op = 'listing.create';
      fields = [product, qty, unit, notes];
      break;
    case 'wanted':
      title = '添一份收物心愿';
      op = 'wanted.create';
      fields = [
        product,
        { ...qty, name: 'wantedQuantity', label: '想收数量' },
        { ...unit, name: 'targetPrice', label: '心理单价（元）' },
        {
          name: 'priority',
          label: '优先级',
          options: [
            ['NORMAL', '慢慢收'],
            ['HIGH', '很想拥有'],
            ['LOW', '随缘收'],
          ],
        },
        notes,
      ];
      break;
    case 'group':
      title = '记录一个新拼团';
      op = 'group.create';
      fields = [
        { name: 'name', label: '拼团名称' },
        { name: 'groupOwner', label: '团长 / 主催' },
        notes,
      ];
      break;
    case 'groupItem':
      title = '添加团内商品';
      op = 'group.item';
      fields = [product, qty, unit];
      break;
    case 'groupDispatch':
      title = '确认派发';
      op = 'group.dispatch';
      fields = [
        {
          name: 'shippingFee',
          label: '本次派发邮费（元）',
          kind: 'number',
          value: '0',
          min: '0',
        },
      ];
      break;
    case 'productEdit':
    case 'product':
      title = '添加图鉴商品';
      op = 'catalog.product';
      fields = [
        { name: 'name', label: '商品名称' },
        {
          name: 'seriesId',
          label: '所属系列',
          options: data.series.map((s) => [
            s.id,
            (data.characters.find((c) => c.id === s.characterId)?.name ?? '') + ' · ' + s.name,
          ]),
        },
        { name: 'productType', label: '商品类型', options: Object.entries(typeNames) },
        { name: 'appearanceKey', label: '形象标识（同系列不同图案）', value: 'default' },
        { name: 'description', label: '描述', required: false },
      ];
      break;
    default:
      title = '维护图鉴分类';
      op = 'catalog.entity';
      fields = [
        {
          name: 'type',
          label: '分类',
          options: [
            ['ip', 'IP'],
            ['character', '角色'],
            ['series', '系列'],
            ['tag', '标签'],
          ],
        },
        { name: 'name', label: '名称' },
        {
          name: 'parentId',
          label: '上级（角色选 IP，系列选角色）',
          required: false,
          options: [
            ['', '无上级'],
            ...data.ips.map((i) => [i.id, 'IP · ' + i.name] as [string, string]),
            ...data.characters.map((c) => [c.id, '角色 · ' + c.name] as [string, string]),
          ],
        },
      ];
  }
  if (dialog.type === 'productEdit') {
    title = '编辑图鉴商品';
    op = 'catalog.product-update';
    const p = data.products.find((p) => p.id === dialog.id)!;
    fields = fields.map((f) => ({ ...f, value: String(p[f.name as keyof typeof p] ?? '') }));
  }
  return (
    <div
      className={`modal-backdrop action-form-backdrop action-form-backdrop--${dialog.type}`}
      onClick={(e) => {
        if (e.target === e.currentTarget && !busy) onClose();
      }}
    >
      <section
        className={`modal action-form action-form--${dialog.type}`}
        role="dialog"
        aria-modal="true"
        aria-label={title}
      >
        <header>
          <div>
            <span className="eyebrow">A NEW LITTLE STORY</span>
            <h2>{title}</h2>
          </div>
          <button className="icon-btn" onClick={onClose} aria-label="关闭">
            <X />
          </button>
        </header>
        {dialog.type === 'fees' && (
          <p className="notice">
            当前实际成本 {purchase?.actualCost}{' '}
            元。补费会同步调整剩余库存成本与已售利润，历史记录保留。
          </p>
        )}
        {dialog.type === 'purchaseEdit' && purchase?.adjustments.length ? (
          <p className="notice">后续补录的费用会保留，并在修正后重新计算库存成本。</p>
        ) : null}
        {dialog.type === 'listing' && (
          <p className="notice">挂出不会减少库存，只有确认成交才会扣减。</p>
        )}
        {dialog.type === 'groupDispatch' && (
          <p className="notice">确认后会记录派发邮费，并把这件谷子标记为在路上。</p>
        )}
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            setBusy(true);
            setError('');
            const f = new FormData(e.currentTarget);
            const payload: Record<string, unknown> = Object.fromEntries(f);
            for (const k of ['quantity', 'wantedQuantity'])
              if (payload[k]) payload[k] = Number(payload[k]);
            if (!payload.parentId) delete payload.parentId;
            if (dialog.type === 'productEdit') payload.id = dialog.id;
            if (dialog.type === 'purchaseEdit') payload.id = dialog.id;
            if (dialog.wantedId) {
              payload.wantedId = dialog.wantedId;
              payload.updateWanted = payload.updateWanted === 'on';
            }
            if (dialog.type === 'fees') payload.purchaseId = dialog.id;
            if (dialog.type === 'sale' && dialog.id) payload.listingId = dialog.id;
            if (dialog.type === 'groupItem') payload.groupId = dialog.id;
            if (dialog.type === 'groupDispatch') payload.id = dialog.id;
            if (dialog.type === 'purchase' && dialog.id) {
              const item = data.groups.flatMap((g) => g.items).find((i) => i.id === dialog.id);
              if (item) payload.groupBuyItemId = item.id;
            }
            try {
              if (fields.some((f) => f.name === 'productId') && !pickedId)
                throw Error('请先从系列图鉴选择谷子');
              if (dialog.type === 'purchase' && channel === '拼团' && !linkedItem) {
                if (!groupChoice) throw Error('请选择已有拼团或创建新团');
                if (groupChoice === '__new')
                  payload.newGroup = {
                    name: payload.newGroupName,
                    groupOwner: payload.newGroupOwner,
                    notes: payload.newGroupNotes ?? '',
                  };
                else if (itemChoice) payload.groupBuyItemId = itemChoice;
                else payload.groupId = groupChoice;
              }
              delete payload.newGroupName;
              delete payload.newGroupOwner;
              delete payload.newGroupNotes;
              await onSave(op, payload);
              onClose();
            } catch (e) {
              setError((e as Error).message);
            } finally {
              setBusy(false);
            }
          }}
        >
          {dialog.type === 'purchaseEdit' && linkedItem && (
            <input type="hidden" name="purchaseChannel" value="拼团" />
          )}
          <div className="form-grid">
            {fields.map((f) =>
              f.name === 'productId' ? (
                <div className="chosen-product" key={f.name}>
                  <span>选择谷子</span>
                  <input type="hidden" name="productId" value={pickedId} />
                  <button
                    type="button"
                    aria-label="从系列图鉴选择谷子"
                    disabled={
                      (!!dialog.id && ['sale', 'purchase'].includes(dialog.type)) ||
                      (dialog.type === 'purchaseEdit' &&
                        (purchase?.arrivalStatus === 'ARRIVED' ||
                          !!purchase?.groupBuyItemId ||
                          !!purchase?.wantedId))
                    }
                    onClick={() => setPicking(true)}
                  >
                    {picked ? (
                      <>
                        <ProductArt product={picked} />
                        <span>
                          <strong>{picked.name}</strong>
                          <small>点击更换系列 / 类型</small>
                        </span>
                      </>
                    ) : (
                      <>
                        <Images />
                        <span>浏览系列图鉴，选择买到的谷子</span>
                      </>
                    )}
                  </button>
                </div>
              ) : (
                <label key={f.name}>
                  {f.label}
                  {f.name === 'purchaseChannel' ? (
                    <PurchaseChannelPicker
                      value={channel}
                      options={f.options ?? []}
                      disabled={!!linkedItem}
                      onChange={setChannel}
                    />
                  ) : f.options ? (
                    <select
                      aria-label={f.label}
                      name={f.name}
                      defaultValue={
                        f.name === 'purchaseChannel' ? undefined : (f.value ?? f.options[0]?.[0])
                      }
                      value={f.name === 'purchaseChannel' ? channel : undefined}
                      onChange={
                        f.name === 'purchaseChannel' ? (e) => setChannel(e.target.value) : undefined
                      }
                      disabled={f.name === 'purchaseChannel' && !!linkedItem}
                      required={f.required !== false}
                    >
                      {f.options.map(([value, label]) => (
                        <option key={value} value={value}>
                          {label}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <input
                      autoFocus={f === fields[0]}
                      name={f.name}
                      type={f.kind ?? 'text'}
                      defaultValue={f.value ?? ''}
                      step={
                        f.kind === 'number'
                          ? f.name.includes('Quantity') || f.name === 'quantity'
                            ? '1'
                            : '0.01'
                          : undefined
                      }
                      min={f.min}
                      required={f.required !== false}
                      maxLength={f.kind ? undefined : 2000}
                    />
                  )}
                </label>
              ),
            )}
          </div>
          {dialog.type === 'purchase' && channel === '拼团' && (
            <fieldset className="purchase-group-fields">
              <legend>这份谷子来自哪个团？</legend>
              {linkedItem ? (
                <>
                  <input type="hidden" name="purchaseChannel" value="拼团" />
                  <p>
                    已关联：{linkedGroup?.name} · {linkedGroup?.groupOwner}
                  </p>
                </>
              ) : (
                <>
                  <label>
                    选择拼团
                    <select
                      aria-label="选择拼团"
                      value={groupChoice}
                      onChange={(e) => {
                        setGroupChoice(e.target.value);
                        setItemChoice('');
                      }}
                      required
                    >
                      <option value="">请选择已有团，或新建一个团</option>
                      {data.groups
                        .filter((g) => g.status === 'OPEN')
                        .map((g) => (
                          <option key={g.id} value={g.id}>
                            {g.name} · {g.groupOwner}
                          </option>
                        ))}
                      <option value="__new">＋ 在这里创建新团</option>
                    </select>
                  </label>
                  {groupChoice === '__new' ? (
                    <div className="form-grid">
                      <label>
                        新团名称
                        <input
                          name="newGroupName"
                          required
                          maxLength={100}
                          placeholder="例如：春日系列一团"
                        />
                      </label>
                      <label>
                        团长 / 主催
                        <input name="newGroupOwner" required maxLength={100} />
                      </label>
                      <label>
                        拼团备注
                        <input name="newGroupNotes" maxLength={2000} />
                      </label>
                      <p className="notice">
                        确认保存时一并创建拼团和团内商品，已填写的购入信息会保留。
                      </p>
                    </div>
                  ) : (
                    groupChoice && (
                      <>
                        {availableItems.length > 0 && (
                          <label>
                            关联团内商品
                            <select
                              value={itemChoice}
                              onChange={(e) => setItemChoice(e.target.value)}
                            >
                              <option value="">新增一条团内商品</option>
                              {availableItems.map((i) => (
                                <option key={i.id} value={i.id}>
                                  已有团项：{i.quantity} 件 · 单价 ¥{i.unitPrice}
                                </option>
                              ))}
                            </select>
                          </label>
                        )}
                        <p className="notice">
                          {itemChoice
                            ? '购入数量需与所选团项一致。'
                            : '将按本次商品、数量和单价添加团项，并关联购入记录。'}
                        </p>
                      </>
                    )
                  )}
                </>
              )}
            </fieldset>
          )}
          {dialog.wantedId && (
            <label className="check-row">
              <input type="checkbox" name="updateWanted" />
              到货后同步更新收物进度（可选）
            </label>
          )}
          {error && (
            <p role="alert" className="error">
              {error}
            </p>
          )}
          <footer>
            <button type="button" onClick={onClose}>
              取消
            </button>
            <button className="primary" disabled={busy}>
              {busy ? '正在保存…' : '确认保存'}
            </button>
          </footer>
        </form>
      </section>
      {picking && (
        <ProductPicker
          data={data}
          selectedId={pickedId}
          allowedIds={
            ['sale', 'listing'].includes(dialog.type)
              ? data.inventory.filter((i) => i.currentQuantity > 0).map((i) => i.productId)
              : undefined
          }
          onClose={() => setPicking(false)}
          onSelect={(p) => {
            setPickedId(p.id);
            setItemChoice('');
            setPicking(false);
          }}
        />
      )}
    </div>
  );
}
