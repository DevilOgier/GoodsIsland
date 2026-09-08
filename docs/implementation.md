# 本地首版实施状态
2026-09-08。用户已确认原设计，D4 更新为立即支持晚补运费；以 cost-adjustments.md 为准。

已实现：Next.js/strict TS/Tailwind、真实本地 PostgreSQL/Prisma migration、Session 登录及首次管理员初始化、图鉴层级及商品创建/编辑/归档、库存流水、买入到货、挂出与成交、拼团逐项状态、Wanted、补运费重放与销售成本差额、S3直传、Sharp缩略图、Mock/Topaz适配器和worker、原图/高清选择、SVG模板与Canvas导出、作品集、manifest/SW离线壳及移动底栏。

本地数据与配置不进Git；.env保存随机数据库密码。生产构建用standalone，服务地址通过配置切换。

## 实现与原设计差异
- 物理 ProductImageSet 简化为 Product 的 originalId/enhancedId/thumbnailId、imageVersion + 不可变 ImageAsset，旧资产保留；版本条件更新防止旧任务覆盖新原图。
- 当前 API 是 /api/data（本人聚合快照）、/api/commands（经过 schema 验证的领域命令）、/api/auth、/api/images、/api/images/:id、/api/posters。原 docs/api.md 的逐资源 REST 列表是后续兼容目标，当前并非全部提供。
- 小规模本地快照目前一次返回收藏数据，前端筛选及分页；大量数据的数据库分页尚未优化。
- 管理员可新增分类，商品可编辑/归档；分类编辑/归档与模板配置编辑 UI 尚未完善。模板通过固定 registry + 数据库版本元信息维护。
- 费用金额两位小数 Decimal；零数量事件仅允许 COST_ADJUSTMENT；历史成本快照加差额得到当前利润。
- 同用户领域写入通过 PostgreSQL advisory transaction lock 串行化，幂等键保护重复提交；个人使用阶段用简单可靠的并发策略。
- 不提供离线交易排队。Service Worker 缓存离线页和图标，私有业务响应不缓存。
- 海报布局/数据稳定，PNG字节不承诺跨浏览器一致；长文字放不下时报错，不静默截断商品名。中文字体使用本机系统字体，未绑定可分发字体资产。

## 验证
类型检查、lint、6项单元测试、真实数据库事务集成测试及Next生产构建已通过。浏览器测试已通过：买入/晚补费用表单、S3上传、Mock增强及失败保护、原图切换、PNG导出、作品保存、六档屏宽、移动筛选和PWA离线页，未发现浏览器脚本错误。记录见忽略目录 .local/browser-results.json。真实Topaz没有key，Docker本机无运行时，因此不声称这两项已联调。

## 本地日常运行
start-local.ps1 启动后台服务。重建前停止web进程（.local/web.pid，先核验命令属于本项目），运行 pnpm build 再启动。不要在数据库运行时直接拷贝数据目录作为有效备份；使用 pg_dump，再备份对象文件。
