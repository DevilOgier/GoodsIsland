# 谷子资产管理系统

以谷子商品为核心的个人收藏柜：公共图鉴 → 买入与库存 → 拼团到货 → 收物/出物 → 海报 → 成交与成本追踪。

**当前阶段：设计评审，尚未开始应用编码。** 文档中的模型和接口是拟议方案，尤其库存口径需要确认。此仓库目前不能启动 Web 应用，也尚无 Prisma Schema、migration 或已运行的业务测试。

## 设计交付

- [总体架构、页面、目录、PWA、图片、海报](docs/architecture.md)
- [完整 ERD 与数据库表设计](docs/database.md)
- [业务流程与状态机](docs/workflows.md)
- [API 契约](docs/api.md)
- [开发拆解、验证、Git 和部署](docs/development.md)
- [需要确认的设计冲突](docs/decisions.md)

## 技术选型

Next.js App Router / TypeScript strict / Tailwind CSS / PostgreSQL / Prisma / Zod / Sharp / S3-compatible storage / SVG + Canvas / Docker / PWA。采用单体，同一代码库内提供图片任务执行入口，不引入 Redis、消息队列或微服务。

图片增强建议首个真实 provider 使用 Topaz，默认本地使用明确标识的 Mock；Real-ESRGAN 保留可替换适配器位置。原图不可覆盖，海报通过固定模板程序化渲染。

## 本地启动与初始化（实施阶段交付）

计划流程：安装锁定依赖 → 复制 `.env.example` 为 `.env` 并填写本地密钥 → 启动 PostgreSQL 和 S3 兼容存储 → 运行 Prisma migration → 交互式初始化管理员 → 启动 Next.js 与图片 worker。准确命令会在 P0-1 实现并验证后加入本文件，不提供尚不存在的脚本。

生产数据库使用版本化 migration；禁止用 `db push` 代替生产迁移。开发、测试、生产使用独立数据库及 bucket。完整环境变量契约见 [.env.example](.env.example)，密钥仅用于服务端。

## PWA、对象存储、图片、测试与 Docker

PWA 提供 manifest、192/512 图标、Service Worker 和离线壳；私有库存与写操作不做离线缓存。对象存储配置直传 CORS 和短期凭证，原图与派生图片使用不同不可变对象键。Topaz 密钥仅在 worker 使用；无密钥用 Mock，不能将插值伪称 AI 增强。真实调用需在配置完成后联调验证。

每模块检查类型、lint、单元测试、migration（有模型变化时）、PostgreSQL 集成测试。响应式验收覆盖 375/390/430/768/1024/1440px。Docker 计划包含 web、同代码库 worker、PostgreSQL、本地 S3 兼容存储；生产可替换为托管数据库与对象存储。详细步骤和验收条件见 [开发文档](docs/development.md)。
