# API 设计

> 更新：用户已确认设计；晚补运费立即支持，取代原 D4 限制。当前实现与实际接口见 [实施状态](implementation.md) 和 [成本调整](cost-adjustments.md)。下文保留原设计用于追溯。

前缀 `/api/v1`，JSON，Zod 验证。A=ADMIN；U=登录用户、仅本人；P=公共图鉴读（公开访问可配置）。Server Actions 复用相同 service，不另写数据库规则。写接口校验 session、Origin/CSRF；私有响应 Cache-Control: no-store。

## 公共图鉴与身份

|方法/路径|权限|用途|
|---|---|---|
|POST `/auth/login`；POST `/auth/logout`；GET `/auth/me`|匿名/U|登录、退出、当前用户；登录限速|
|GET `/ips`、`/characters`、`/series`、`/products`、`/tags`|P|搜索筛选列表|
|GET `/products/:id`|P|公共详情；个人数据另由私有端点请求|
|GET `/products/:id/my-summary`|U|我的库存、购买、卖出、收物|
|POST `/admin/{ips,characters,series,products,tags}`|A|创建公共实体|
|PATCH `/admin/{ips,characters,series,products,tags}/:id`|A|更新、归档；已有引用禁止物理删除|
|PUT `/admin/products/:id/tags`|A|替换关联 Tag ID 列表|
|GET/POST `/admin/poster-templates`；PATCH `/admin/poster-templates/:id`|A|模板列表、版本化配置、启停|

## 私有业务

|方法/路径|请求摘要/行为|
|---|---|
|GET `/dashboard`|库存汇总、最近买卖、在途/待排发/收出数量；统一实物口径|
|GET `/inventory`、`/inventory/:id/events`|库存和流水分页|
|POST `/inventory/:id/adjustments`|eventType、signedQuantity、正向成本、reason；负向保护挂出|
|GET/POST `/purchases`|查询或创建 productId、quantity、unitPrice、各费用、渠道/日期、arrivalStatus、groupBuyItemId?|
|GET/PATCH `/purchases/:id`|详情；仅未入库可编辑金额数量，version 必填|
|POST `/purchases/:id/ship`、`/arrive`、`/cancel`|显式状态动作，arrive 事务写 BUY|
|GET/POST `/sales`|查询或成交 productId、quantity、unitPrice、listingId?、channel、date、notes|
|GET/POST `/listings`；PATCH `/listings/:id`|挂出列表/创建/修改数量及价格；锁库存检查|
|POST `/listings/:id/cancel`|撤下，不动库存|
|GET/POST `/groups`；GET/PATCH `/groups/:id`|团列表/创建/详情/编辑|
|POST `/groups/:id/items`；PATCH `/groups/:id/items/:itemId`|添加计划团项、修改支付/运输/排发；关联后金额由 Purchase 管理|
|POST `/groups/:id/close`、`/complete`、`/cancel`|带守卫的状态转换|
|GET/POST `/wanted`；PATCH `/wanted/:id`|目标数量/价格/优先级/备注|
|POST `/wanted/:id/progress`|fulfilledQuantity、version；只改已收，不入库|
|POST `/wanted/:id/acquire`|purchase 输入与 updateProgress=true；到货时一次性更新 BUY 和已收|
|POST `/wanted/:id/cancel`|停止收物|
|GET/POST `/posters`；GET/PATCH `/posters/:id`|草稿/快照保存；type、ratio、template、items、config|
|POST `/posters/:id/publish-listings`|明确确认挂出；Poster 版本与库存校验，同事务，不写 SELL|
|POST `/posters/preview`|验证 PosterData 并返回规范化布局/SVG；不写交易|
|GET `/poster-templates`|可用模板与 config schema|

以上均 U。Poster PNG/JPG 在浏览器 Canvas 导出，不必传大文件回服务器。海报编辑的图片通过受控资产接口获取。

## 图片接口

|方法/路径|权限|行为|
|---|---|---|
|POST `/images/upload-intents`|A|targetType、targetId、mime、bytes → intentId、上传 URL/fields、expiresAt|
|POST `/images/upload-intents/:id/complete`|A|验证 S3 对象，创建资产与缩略任务，幂等返回 jobId|
|POST `/products/:id/enhancements`|A|imageSetId、scale、允许的 model → 202 jobId|
|GET `/image-jobs/:id`|A/任务本人|状态、错误、可重试标识，不返回密钥|
|POST `/image-jobs/:id/retry`|A|只重试已知失败任务|
|PATCH `/products/:id/image-selection`|A|选择 ORIGINAL/ENHANCED 或历史 READY 图集|
|GET `/images/:id/content`|P/U按资源权限|受控读图片，Canvas 嵌入使用；不接受任意外部 URL|

## 公共契约

列表支持 `q,tagIds,ipId,characterId,seriesId,productType,status,cursor,limit`；按实体适用字段开放，limit 默认 24、最大 100。Inventory 增 `availability=in-stock|out-of-stock`、`listed=true`；Group 增 `pendingArrival/pendingDispatch`。排序字段白名单，返回 `{items,nextCursor}`。关联筛选无法组合时返回空结果而非忽略某条件。

金额请求使用十进制字符串，例如 `"30.00"`；返回同样格式，前端不使用 JS 浮点数计算权威金额。quantity 正整数；notes/名称有长度上限；模板 config 有版本化 schema。

所有业务变更带 `Idempotency-Key`，更新额外带 version 防止覆盖旧编辑。相同 key/payload 重复返回原结果，异 payload 返回 409。事件、库存及 MutationRequest 在同一事务中提交。

错误格式 `{error:{code,message,fieldErrors?,requestId}}`。401 未登录，403 无权限，404 不存在或非本人私有资源，409 库存不足/版本冲突/状态非法，422 输入无效，429 限流，502/503 图片外部依赖错误。异步任务业务失败在任务状态返回，不让前端一直 loading。日志脱敏。

示例：POST `/sales` 输入 `{productId,listingId,quantity:1,unitPrice:"15.00",saleChannel:"XIANYU",saleDate:"2026-09-08"}`，响应含 saleId、剩余库存、剩余挂出、allocatedActualCost 和 profit；这些值由事务内计算。客户端显示成功后重新验证相关列表缓存。
