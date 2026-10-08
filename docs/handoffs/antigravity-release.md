# Antigravity 发布交接（仅收到 Codex 发布指令后执行）

固定原会话 idavoll：d711e253-e519-446f-b7b2-84903676fdf0。用户已明确授权此会话推送 GitHub 并更新 Cloudflare；不需要再询问是否发布。当前文件只是准备，发布前等待 Codex 汇合及 OpenCode 预检通过。

## 已确认目标

- GitHub: https://github.com/NornsInteractive/Idavoll.git，生产分支 main。Git origin 内嵌令牌已清理，使用现有 gh 认证/环境凭据，不把令牌写回 URL。不能强制推送或改写历史。
- Cloudflare account: d34e7a1f00e18858047410e2af90f073。
- Pages: idavoll，https://idavoll.pages.dev，原生 Git 集成已经启用。构建 pnpm --filter @idavoll/web build，目录 apps/web/dist。保持现有配置，不能重置 env/bindings。
- Worker: idavoll-server，https://idavoll-server.kurama-tiny.workers.dev。
- D1 binding DB/database id 60b180c3-0321-45a1-aef5-9f763a120e62，目前远端无表。迁移位于 apps/server/migrations/0001_real_data.sql。
- 现有 GAME_ROOM、CONFIG_KV、DRAWINGS_BUCKET 绑定不能删除或替换。
- apps/web/.env.production 已给出公开 API 地址。
- 环境中已有 CLOUDFLARE_API_TOKEN 和 GITHUB_TOKEN，不打印值。GitHub 仓库暂未配置 Cloudflare secret，因此正常发布由本会话执行 wrangler，不依赖 actions 部署。deploy-server workflow 已改为 workflow_dispatch，CI仅自动检查。

## 发布操作顺序

1. 确认本次必要验证通过，记录 git diff/status，确保不提交 .cache、.dev.vars、mcp私密配置、构建产物或令牌。
2. 从 Cloudflare Worker secrets API GET /accounts/{account_id}/workers/scripts/idavoll-server/secrets 只核验名称，不输出值。不存在 JWT_SECRET 时，在进程内 secrets.token_urlsafe(48) 生成并 PUT 对应 secret；已有密钥必须保留，不轮换现有身份密钥。接口 secret body 为 {name:'JWT_SECRET',type:'secret_text',text:<value>}。
3. 用户要求优先自有 TURN，未配置默认 Cloudflare TURN。核验 TURN_SERVERS_JSON/TURN_KEY_ID/TURN_KEY_API_TOKEN 名称；自有TURN已配置则保持。未有Cloudflare TURN key时，GET /accounts/{account_id}/calls/turn_keys，然后POST同路径body {name:'idavoll-voice'} 创建一次，取result.uid与 `result.secret || result.key`。2026-10-08实际创建响应为secret字段；必须在同一进程内验证凭据生成并绑定Secrets，不能只打印字段后退出丢失secret。仅把值在内存中分别 PUT 到 Worker 的 TURN_KEY_ID、TURN_KEY_API_TOKEN secrets，禁止写入文档/日志/源码/前端。重试先核验已有Worker secret名称，保留现有已绑定密钥。只有本轮创建且明确未使用的失效/未绑定key可替换并清理；不能删除其他已有key。
4. Cloudflare API 请求用 urllib.request 或现有客户端，token仅从环境读取；请求带20–30秒timeout。读取Worker secret列表失败必须停止，不能当空列表覆盖身份密钥。任何响应先删去 secret/key/text/token/password/credential 才输出，创建密钥响应不能直接打印。错误报告保留HTTP状态和errors.message即可。
5. pnpm --filter @idavoll/server exec wrangler d1 migrations apply DB --remote，确认迁移成功，不清库，不用 schema.sql 覆盖。执行前可使用 Wrangler backup 创建数据库备份（如已有数据）。
6. pnpm --filter @idavoll/server run deploy（必须有run，避免调用pnpm自身的deploy命令）。核验 Worker 健康检查和绑定、Secrets 名称及真实guest API可用，不用健康200代替登录成功。
7. 提交完整变更并推送 main（常规 push，不force），记录commit。让原生Git集成构建Pages，查询部署状态并确认生产commit一致；失败读取构建日志修复。不要用手工直传dist伪装Git部署成功。
8. 返回 GitHub commit链接、Worker版本/部署结果、Pages生产deployment id/url和commit、D1迁移结果、语音配置完成与否、任何失败或未覆盖项。不要宣称测试全部通过——最终线上验收由OpenCode执行。

如果需要UI修复在同一会话继续修改；非UI问题反馈Codex，不自行改后端语义。线上验收失败时按同样顺序发布修复，然后交OpenCode复测。
