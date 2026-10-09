# Idavoll

React + Cloudflare Workers 多人你画我猜。服务端负责房间、选词、轮换、计时、判题和计分，D1 保存真实身份与战绩，R2 保存画作，WebRTC 提供房间语音。

支持手机与桌面浏览器、中文/英文、主题和强调色。当前可玩的游戏仅为你画我猜；其他游戏未开放。Tauri 和 Capacitor 文件仅为后续原生打包配置，本轮不交付原生应用。

## 本地运行

```bash
pnpm install --frozen-lockfile
pnpm --filter @idavoll/server exec wrangler d1 migrations apply DB --local
pnpm --filter @idavoll/server dev
pnpm --filter @idavoll/web dev
```

在 `apps/server/.dev.vars` 配置至少 32 字符的 `JWT_SECRET`，该文件被 Git 忽略。Vite 将 `/api` 和 WebSocket 转发至本地 8787 端口。生产 API 地址在 `apps/web/.env.production`，它是公开地址，不包含密钥。

语音优先读取 Worker Secret `TURN_SERVERS_JSON`（JSON 格式的 `RTCIceServer[]`）；未配置时使用 Cloudflare TURN 的 `TURN_KEY_ID` 和 `TURN_KEY_API_TOKEN`。Cloudflare 的长期 API 密钥保留在服务端。自建 TURN 的固定用户名和密码会下发给房间成员的浏览器用于连接，当前未接入自建 TURN 动态短期凭据。配置自建 TURN 后，故障时不会自动切换至 Cloudflare；删除 `TURN_SERVERS_JSON` 可恢复默认服务。Cloudflare TURN 超出免费额度后按量计费。没有有效配置时明确显示语音不可用。

## 规则与数据

- 2–12 位玩家，所有人在线准备后由房主开始。每轮每位参赛者各作画一次，时间/难度/轮数使用房间设置。
- 画手 15 秒选词，超时自动选择；每回合一次换词、一次首字提示。猜中后不可换词；换词不增加时间。
- 题库包含 342 个词，简单 110、标准 110、困难 122，涵盖食物、动物、日常、交通、运动、职业、科技、场景和故事等主题。
- 猜题计分按顺序和剩余时间，画手按猜中比例计分。答案仅发给画手，回合结束才公开。
- 普通聊天、反应与申请提示不提交猜词；公布线索由画手操作，聊天中不能提前泄露答案。
- 同分共享排名和胜场。人数不足两人时中止，不计入完成比赛统计。
- 断线保留席位 30 秒；刷新与重连恢复快照。进行中的房间仅允许原参赛者重连。
- 对局结束后保留在原房间，通过结果弹窗显示真实比分与胜负；关闭弹窗不离房，房主重置后玩家可重新准备下一局。
- 昵称/头像、累计战绩和画作来自真实服务端；个人偏好保存在本机。游客身份依赖本机登录凭据，清除凭据后无法找回游客账号。
- 首次登录默认生成英文词组合昵称，支持 81,920 种组合；随机按钮会生成不同于当前的名称。
- 历史列表返回最近 50 条，聊天保留最近 100 条；画板最多 500 条笔迹、30,000 个点，每笔最多 2,048 个点。

## 验证与发布

```bash
pnpm test
pnpm typecheck
pnpm --filter @idavoll/web build
```

迁移以 `apps/server/migrations/` 为准。`schema.sql` 仅为结构参考，不能用于覆盖生产数据库。已有 Durable Object、D1、KV、R2 绑定保持不变。

Pages 项目 `idavoll` 已连接 `NornsInteractive/Idavoll` 的 `main`，推送触发网站构建。Worker 单独部署；先迁移和部署兼容的 Worker，再推送前端。GitHub Actions 自动执行 CI，后端部署工作流仅手动触发，避免重复发布。

用户指定所有 UI 由 Antigravity 原 `idavoll` 会话完成，推送和部署也交此会话执行；OpenCode 使用经核验的免费模型负责发布前检查和上线验收。交接与实际验收证据见 `docs/handoffs/`。
