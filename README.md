# 谷屿 · 谷子资产管理系统

以商品为核心的私人收藏柜：图鉴、买入、到货、库存、拼团、收物、出物、晚补运费与程序化海报。

图鉴和收藏柜支持按全部周边、周边类型、周边系列浏览；系列封面会组合其中的多件周边图片。买入记录可以修正数量、价格、费用、渠道、日期和到货状态，也可以删除，并自动重算库存与历史出库成本。管理员可在「我的」创建独立的个人收藏账号，通过「退出 / 切换账号」在图鉴维护与个人记账身份之间切换。

## 本机使用

当前项目已配置本地 PostgreSQL（127.0.0.1:54329）及 S3 兼容开发服务（127.0.0.1:9000），数据库和对象文件持久化在忽略目录 `.local/`。**网页地址：http://localhost:3000**。首次打开创建管理员邮箱和密码，没有预设密码。

Windows 在项目目录运行：

```powershell
.\start-local.ps1
```

脚本以隐藏窗口启动服务、应用 migration 并初始化系统内置谷子类型与海报模板；图鉴初始为空。关闭浏览器或终端不清空数据。不要删除 `.local/postgres` 和 `.local/objects`。

首次从 Git 安装（Node.js 24、pnpm 11）：

```text
pnpm install --frozen-lockfile
pnpm local:setup
pnpm db:generate
pnpm build
```

随后运行 start-local.ps1。已有依赖的本机无需重复安装。开发可单独运行 `pnpm local:services`、`pnpm worker`、`pnpm dev`；已有服务运行时不要重复启动数据库。

图鉴和个人库存初始为空。进入图鉴管理可创建 IP、角色、系列和谷子类型并上传自己的 PNG/JPG/WebP；买入、库存和商品详情不提供图片修改。没有图片或业务记录的图鉴内容可在管理页彻底删除，已有记录时使用归档保留历史。

## 图片按钮

- **保真高清（模拟）**：默认 Mock，用于本地流程测试，普通插值不是真实 AI。
- **保真高清**：将 .env 的 IMAGE_ENHANCEMENT_PROVIDER 改成 topaz，填写 IMAGE_ENHANCEMENT_API_KEY，重启网页服务和 worker。
- **使用原图 / 使用高清图**：选择展示版本。原图永久独立保存，失败不覆盖旧图片；在增强期间选择原图，任务完成也不会强制切走。
- Topaz 适配器按 [官方 Quickstart](https://developer.topazlabs.com/getting-started/quickstart) 实现异步提交、查询、下载；没有真实 Key，尚未完成真实 API 联调。Real-ESRGAN 仍为后续适配器，当前不假称已实现。

## 晚补运费

购买记录 → 补运费 → 填写本次追加的国内/国际/其他费用和原因。已到货时重放该商品的移动平均成本，追加成本调整流水，同时更新剩余库存成本和历史已售利润。支持已经全部售出后补费。不会直接改掉原始交易流水。详细规则见 [成本调整](docs/cost-adjustments.md)。

## 换服务器和域名

业务代码不依赖本机地址。迁移 PostgreSQL 数据与 S3 对象后修改 `.env`：

- DATABASE_URL：服务器 PostgreSQL 连接。
- APP_URL：实际访问域名，例如 https://你的域名；决定表单来源校验和对象存储 CORS。
- S3_ENDPOINT / BUCKET / ACCESS_KEY / SECRET_KEY / REGION：服务器对象存储配置。
- COOKIE_SECURE=true；LOCAL_SERVICES=false；WEB_HOST 按部署网络配置。
- Topaz key 保存在服务端环境，不传浏览器。

只换配置不会自动搬迁已有数据。迁移需同时备份数据库和对象，不能只迁 DB。开发 S3RVER 凭证不能用于线上服务。

## 命令与验证

```text
pnpm typecheck
pnpm lint
pnpm test
pnpm test:integration
pnpm build
node --env-file=.env scripts/browser-check.mjs
```

集成测试在当前本地数据库创建隔离测试账号，结束时清理自己的记录。浏览器测试使用本机 Edge，验证交易、S3、Mock增强、原图切换、海报及响应式/PWA。截图位于 .local/screenshots，不进入 Git。

Migration：开发用 `pnpm exec prisma migrate dev --name 名称`；部署用 `pnpm db:migrate`。数据库检查使用已提交 migration，生产不使用 db push。

## Docker

提供 Dockerfile 和 compose.yaml。生产在 .env 中将 DATABASE_URL 主机设置为 db、配置 POSTGRES_PASSWORD，并使用真实 S3。先启动 db，再单次执行迁移和 seed，最后启动 web/worker：

```text
docker compose up -d db
docker compose run --rm web node node_modules/prisma/build/index.js migrate deploy
docker compose run --rm web node --import tsx prisma/seed.ts
docker compose up -d web worker
```

当前本机未安装 Docker，容器构建和部署尚未实测。localhost 运行与生产 Next.js 构建已验证。

## 文档与边界

[架构设计](docs/architecture.md) · [ERD](docs/database.md) · [成本调整](docs/cost-adjustments.md) · [API](docs/api.md) · [实施状态](docs/implementation.md)

当前是可运行的本地首版，未宣称完整生产上线验收。实时 AI 调用、生产 Docker、跨浏览器像素一致性仍需目标环境验证；图片任务有失败状态和重试，未知 Topaz 提交需人工核对。公开注册、社区与多组织管理不在范围内。

## 购入时关联拼团

在买入记录中把购买渠道选为「拼团」，然后选择已有开团，或选「在这里创建新团」填写名称、团长和备注。确认保存时会原子创建拼团（如需）、团内商品和购入记录；选择已到货才增加库存。已有团内的同款未登记商品可以直接关联，数量必须一致。原来的拼团页仍可创建团和登记购买。

## 局域网配置

默认 WEB_HOST=127.0.0.1 仅供本机使用。局域网访问需明确配置监听地址、将手机访问的完整 Origin 加到 ADDITIONAL_APP_ORIGINS（逗号分隔），并按实际网络范围配置防火墙。应用不会自动修改防火墙。APP_URL 仍为主访问地址；额外来源不采用通配符。

LOCAL_SERVICES=true 时，图片上传经登录鉴权的同源应用接口转发，本地数据库和对象存储仍只监听回环地址。HTTP 局域网可使用普通网页功能，但安装 PWA 需要浏览器支持的安全上下文（HTTPS 或 localhost）。

代码推送不包含 .env、.local 数据库和图片、依赖或构建缓存。服务器部署需单独配置环境变量；若要保留本机收藏数据，还需迁移数据库和对象文件。

## 收支与发布更新

新增「收支账本」：月份、IP、角色、系列和类型筛选，月度收入/支出、累计购入/卖出、在手成本和未到货金额，以及 CSV 流水导出。口径见 [收支账本](docs/accounting.md)。

本机发布入口为 `./publish.ps1 -Version v0.2.0`。云端初始化、GitHub Secrets、镜像更新和失败处理见 [自动部署说明](docs/deployment-pipeline.md)。服务器尚未配置，发布前需要完成该说明中的初始化。普通 main 推送仅触发验证；推送版本标签才发布部署。
