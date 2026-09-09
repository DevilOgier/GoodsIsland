# 本机发布 → 腾讯云自动部署

已提供代码和脚本。尚未配置真实服务器，不能把脚本校验视为云端部署验收。默认 Linux x86_64、Docker Engine + Compose v2、PostgreSQL 18、S3 兼容对象存储。构建在 GitHub Runner 完成，轻量服务器只拉镜像并运行。

## 流程

本机运行 publish.ps1，推送 main 和 v版本标签 → GitHub Actions 执行 lint、类型检查、单元测试、真实 PostgreSQL 集成测试 → 构建并推送 GHCR 镜像 → production 环境通过 SSH 更新服务器。普通 main 提交不自动部署；版本标签或 Actions 手动运行才发布。

流水线文件：[release.yml](../.github/workflows/release.yml)。本机入口：[publish.ps1](../publish.ps1)。服务器脚本：[update.sh](../deploy/update.sh)。

## 服务器首次准备（购买后执行）

1. 准备 Linux x86_64 系统，安装 Docker Engine、Compose v2（支持 --wait）、curl 和 util-linux（flock）。用拥有 Docker 权限的部署用户运行；Docker 权限等同于服务器管理权限。
2. 创建 /opt/goods-island 并赋予部署用户读写权限。将 deploy/server.env.example 复制为该目录的 .env，填入实际配置并 chmod 600。数据库密码在 POSTGRES_PASSWORD 和 DATABASE_URL 中保持一致；URL 中的特殊字符要编码。
3. 使用真实私有 S3 兼容对象存储，配置域名、region、访问密钥及桶名。若使用腾讯云 COS，按该桶的 S3 兼容配置填写；图片上传 CORS 允许 APP_URL 的 PUT、GET、HEAD 和 Content-Type。不要在线上使用开发 S3RVER 凭证。
4. 有域名：APP_URL=https://域名，SITE_ADDRESS=域名，COOKIE_SECURE=true，将域名解析到服务器，放行 80/443（以及用于部署的 SSH 端口）。Caddy 自动申请 HTTPS。暂无域名：APP_URL=http://服务器IP，SITE_ADDRESS=http://服务器IP，COOKIE_SECURE=false；之后改成 HTTPS 配置。应用 3000 只绑定服务器回环地址，数据库不对公网开放。
5. GHCR 私有镜像需在部署用户下执行 docker login ghcr.io，使用仅含 read:packages 的凭证；勿把 token 写进命令行或代码。若机房无法访问 GHCR，需先解决出站网络，或后续改用腾讯云镜像仓库并修改脚本允许的镜像地址。
6. 将部署公钥加入该用户的 ~/.ssh/authorized_keys。核对服务器 SSH 主机指纹后，将对应 known_hosts 内容保存到 GitHub Secret。不要通过关闭 StrictHostKeyChecking 绕过验证。

## GitHub 配置

仓库 Settings → Environments → 创建 production。首次联调可配置 required reviewer，确认后再开启无人工批准的自动部署。

在 production 环境中配置 Secrets：

| 名称               | 内容                                                        |
| ------------------ | ----------------------------------------------------------- |
| DEPLOY_HOST        | 服务器 IP 或域名，不带协议                                  |
| DEPLOY_USER        | 部署用户名                                                  |
| DEPLOY_PORT        | SSH 端口；留空按 22                                         |
| DEPLOY_SSH_KEY     | 部署专用私钥，支持 OpenSSH Ed25519                          |
| DEPLOY_KNOWN_HOSTS | 已核验的服务器 known_hosts；非标准端口使用 [host]:port 格式 |

数据库与对象存储密码只放在服务器 .env；不需要提交 GitHub。流水线用 GITHUB_TOKEN 发布本仓库 GHCR 包。私有仓库首次需确认 Actions 与 Packages 权限允许写入。

## 本机发布

确保更改已提交、本地工作区干净，服务器和上述 Secrets 已准备好：

```powershell
.\publish.ps1 -Version v0.2.0
```

脚本不会强推或覆盖已有版本标签。若网络代理仅在浏览器生效，需要给 Git 设置可用代理；当前这台电脑使用本地 127.0.0.1:7897，可按实际代理状态在仓库内配置 git config http.proxy http://127.0.0.1:7897；关闭代理后应取消该设置。不要把此地址写进服务器配置。

推送成功不等于部署成功，进入 GitHub → Actions → Release GoodsIsland 看 verify / image / deploy 三步结果。若标签已创建但推送失败，修复网络后可直接 git push origin refs/tags/对应版本 重试。

## 更新与失败处理

- 通过镜像摘要部署，避免同名标签变动。
- 串行发布，并在服务器使用 flock 防止并发更新。
- 先拉镜像，暂停应用和 worker 的写入，再备份 PostgreSQL，执行 migration 和 seed，启动新版本并检查 /api/health。
- PostgreSQL 使用持久卷，对象保存在独立 S3 桶；不会删除数据卷或覆盖 .env 中的密码。
- 备份位于 /opt/goods-island/backups，需要自行设置异地备份和保留周期。
- 失败时尝试重启上次应用镜像，但不会自动倒退数据库迁移。生产迁移应保持向后兼容；破坏性迁移失败需人工核对备份与恢复策略。此流程有短暂停机，不宣称零停机。
- 没有真实服务器时不要发布版本标签来假装联调完成；先完成服务器初始化。

参考：[GitHub 官方镜像发布流程](https://docs.github.com/en/actions/publishing-packages/publishing-docker-images)、[Docker Compose up](https://docs.docker.com/reference/cli/docker/compose/up/)。
