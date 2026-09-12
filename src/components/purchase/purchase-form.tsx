'use client';

import { useState } from 'react';
import { Images, X } from 'lucide-react';
import ProductArt from '../product-art';
import ProductPicker from '../product-picker';
import type { Snapshot } from '../types';
import { PurchaseChannelPicker } from './purchase-channel-picker';

const channels = ['闲鱼', '拼团', '煤炉', '直播间', '淘宝', '线下', '其他'].map(
  (value) => [value, value] as [string, string],
);

export default function PurchaseForm({
  data,
  mode,
  id,
  productId,
  wantedId,
  onClose,
  onSave,
}: {
  data: Snapshot;
  mode: 'create' | 'edit';
  id?: string;
  productId?: string;
  wantedId?: string;
  onClose: () => void;
  onSave: (operation: string, payload: Record<string, unknown>) => Promise<unknown>;
}) {
  const purchase = mode === 'edit' ? data.purchases.find((item) => item.id === id) : undefined;
  const linkedGroup =
    mode === 'create' && id
      ? data.groups.find((group) => group.items.some((item) => item.id === id))
      : purchase
        ? data.groups.find((group) => group.items.some((item) => item.purchase?.id === purchase.id))
        : undefined;
  const linkedItem = linkedGroup?.items.find(
    (item) => item.id === id || item.purchase?.id === purchase?.id,
  );
  const [pickedId, setPickedId] = useState(
    productId ?? purchase?.productId ?? linkedItem?.productId ?? '',
  );
  const [picking, setPicking] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [channel, setChannel] = useState(
    purchase?.purchaseChannel ?? (linkedGroup ? '拼团' : '闲鱼'),
  );
  const [groupChoice, setGroupChoice] = useState(linkedGroup?.id ?? '');
  const [itemChoice, setItemChoice] = useState('');
  const picked = data.products.find((product) => product.id === pickedId);
  const chosenGroup = data.groups.find((group) => group.id === groupChoice);
  const availableItems =
    chosenGroup?.items.filter((item) => item.productId === pickedId && !item.purchase) ?? [];
  const date = new Date().toLocaleDateString('sv-SE');
  const lockedProduct =
    Boolean(mode === 'create' && id) ||
    Boolean(
      mode === 'edit' &&
        (purchase?.arrivalStatus === 'ARRIVED' || purchase?.groupBuyItemId || purchase?.wantedId),
    );

  if (mode === 'edit' && !purchase) return null;

  return (
    <div
      className={`modal-backdrop action-form-backdrop action-form-backdrop--purchase${mode === 'edit' ? 'Edit' : ''}`}
      onClick={(event) => {
        if (event.target === event.currentTarget && !busy) onClose();
      }}
    >
      <section
        className="modal action-form action-form--purchase"
        role="dialog"
        aria-modal="true"
        aria-label={mode === 'edit' ? '修正买入记录' : '记录一份新喜欢'}
      >
        <header>
          <div>
            <span className="eyebrow">A NEW LITTLE STORY</span>
            <h2>{mode === 'edit' ? '修正买入记录' : '记录一份新喜欢'}</h2>
          </div>
          <button className="icon-btn" onClick={onClose} aria-label="关闭">
            <X />
          </button>
        </header>
        {mode === 'edit' && purchase!.adjustments.length > 0 && (
          <p className="notice">后续补录的费用会保留，并在修正后重新计算库存成本。</p>
        )}
        <form
          onSubmit={async (event) => {
            event.preventDefault();
            setBusy(true);
            setError('');
            const payload: Record<string, unknown> = Object.fromEntries(
              new FormData(event.currentTarget),
            );
            payload.quantity = Number(payload.quantity);
            if (mode === 'edit') payload.id = id;
            if (wantedId) {
              payload.wantedId = wantedId;
              payload.updateWanted = payload.updateWanted === 'on';
            }
            try {
              if (!pickedId) throw Error('请先从系列图鉴选择谷子');
              if (mode === 'create' && id && linkedItem) payload.groupBuyItemId = linkedItem.id;
              if (mode === 'create' && channel === '拼团' && !linkedItem) {
                if (!groupChoice) throw Error('请选择已有拼团或创建新团');
                if (groupChoice === '__new') {
                  payload.newGroup = {
                    name: payload.newGroupName,
                    groupOwner: payload.newGroupOwner,
                    notes: payload.newGroupNotes ?? '',
                  };
                } else if (itemChoice) payload.groupBuyItemId = itemChoice;
                else payload.groupId = groupChoice;
              }
              delete payload.newGroupName;
              delete payload.newGroupOwner;
              delete payload.newGroupNotes;
              await onSave(mode === 'edit' ? 'purchase.update' : 'purchase.create', payload);
              onClose();
            } catch (cause) {
              setError((cause as Error).message);
            } finally {
              setBusy(false);
            }
          }}
        >
          <div className="form-grid">
            <div className="chosen-product">
              <span>选择谷子</span>
              <input type="hidden" name="productId" value={pickedId} />
              <button
                type="button"
                aria-label="从系列图鉴选择谷子"
                disabled={lockedProduct}
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
            <label>
              数量
              <input
                name="quantity"
                type="number"
                defaultValue={String(purchase?.quantity ?? linkedItem?.quantity ?? 1)}
                min="1"
                step="1"
                required
              />
            </label>
            <label>
              单价（元）
              <input
                name="unitPrice"
                type="number"
                defaultValue={String(purchase?.unitPrice ?? linkedItem?.unitPrice ?? 0)}
                min="0"
                step="0.01"
                required
              />
            </label>
            <label>
              购买渠道
              <PurchaseChannelPicker
                value={channel}
                options={channels}
                disabled={Boolean(linkedItem)}
                onChange={setChannel}
              />
            </label>
            <label>
              购买日期
              <input
                name="purchaseDate"
                type="date"
                defaultValue={purchase?.purchaseDate.slice(0, 10) ?? date}
                required
              />
            </label>
            <label>
              到货状态
              <select
                name="arrivalStatus"
                defaultValue={purchase?.arrivalStatus ?? 'PENDING'}
                required
              >
                <option value="PENDING">待到货（暂不入库）</option>
                <option value="SHIPPED">运输中</option>
                <option value="ARRIVED">
                  已经到货（{mode === 'edit' ? '计入库存' : '立即入库'}）
                </option>
              </select>
            </label>
            {[
              ['domesticShipping', '国内运费', purchase?.domesticShipping],
              ['internationalShipping', '国际运费', purchase?.internationalShipping],
              ['otherFee', '其他费用', purchase?.otherFee],
            ].map(([name, label, value]) => (
              <label key={String(name)}>
                {String(label)}（元）
                <input
                  name={String(name)}
                  type="number"
                  defaultValue={String(value ?? 0)}
                  min="0"
                  step="0.01"
                  required
                />
              </label>
            ))}
            <label>
              备注
              <input name="notes" defaultValue={purchase?.notes ?? ''} maxLength={2000} />
            </label>
          </div>

          {mode === 'create' && channel === '拼团' && (
            <fieldset className="purchase-group-fields">
              <legend>这份谷子来自哪个团？</legend>
              {linkedItem ? (
                <p>
                  已关联：{linkedGroup?.name} · {linkedGroup?.groupOwner}
                </p>
              ) : (
                <>
                  <label>
                    选择拼团
                    <select
                      aria-label="选择拼团"
                      value={groupChoice}
                      onChange={(event) => {
                        setGroupChoice(event.target.value);
                        setItemChoice('');
                      }}
                      required
                    >
                      <option value="">请选择已有团，或新建一个团</option>
                      {data.groups
                        .filter((group) => group.status === 'OPEN')
                        .map((group) => (
                          <option key={group.id} value={group.id}>
                            {group.name} · {group.groupOwner}
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
                  ) : groupChoice ? (
                    <>
                      {availableItems.length > 0 && (
                        <label>
                          关联团内商品
                          <select
                            value={itemChoice}
                            onChange={(event) => setItemChoice(event.target.value)}
                          >
                            <option value="">新增一条团内商品</option>
                            {availableItems.map((item) => (
                              <option key={item.id} value={item.id}>
                                已有团项：{item.quantity} 件 · 单价 ¥{item.unitPrice}
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
                  ) : null}
                </>
              )}
            </fieldset>
          )}
          {wantedId && (
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
          onClose={() => setPicking(false)}
          onSelect={(product) => {
            setPickedId(product.id);
            setItemChoice('');
            setPicking(false);
          }}
        />
      )}
    </div>
  );
}
