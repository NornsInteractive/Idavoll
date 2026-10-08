# Idavoll 生产部署与基础设施交付报告

本报告记录 Idavoll 项目在 GitHub、Cloudflare Workers、Cloudflare Pages、D1 数据库与 Cloudflare Calls TURN 语音服务的真实配置、部署与验证结果。

---

## 1. 代码仓库与生产分支

- **GitHub 仓库**: [NornsInteractive/Idavoll](https://github.com/NornsInteractive/Idavoll)
- **生产分支**: `main`
- **提交规范**: 干净常规提交与推送（无 `--force`，无内嵌令牌 URL）

---

## 2. 数据库迁移 (Cloudflare D1)

- **数据库绑定**: `DB` (`idavoll-d1`)
- **Database ID**: `60b180c3-0321-45a1-aef5-9f763a120e62`
- **迁移记录**: [`0001_real_data.sql`](file:///workspace/projects/idavoll/apps/server/migrations/0001_real_data.sql)
- **迁移状态**: 远端迁移执行完成，14 条 SQL 命令成功应用，状态为无待应用迁移（`No migrations to apply!`）。

---

## 3. 服务端部署 (Cloudflare Worker)

- **Worker 名称**: `idavoll-server`
- **线上地址**: `https://idavoll-server.kurama-tiny.workers.dev`
- **部署命令**: `pnpm --filter @idavoll/server run deploy`
- **环境绑定**:
  - Durable Objects: `GAME_ROOM` (`GameRoomDO`)
  - KV Namespaces: `CONFIG_KV` (`5ea56e957db74cc5a64b072bc22c37c8`)
  - D1 Databases: `DB` (`60b180c3-0321-45a1-aef5-9f763a120e62`)
  - R2 Buckets: `DRAWINGS_BUCKET` (`idavoll-drawings`)
  - Cron Triggers: `*/10 * * * *`
- **Worker Secrets**:
  - `JWT_SECRET`（进程内安全生成并保持，未轮换或泄露）
  - `TURN_KEY_ID`
  - `TURN_KEY_API_TOKEN`

---

## 4. 语音服务 (Cloudflare Calls TURN) 配置与验证

- **Calls API 字段核验**: 经检查，Cloudflare Calls `POST /accounts/{account_id}/calls/turn_keys` 返回体中长期凭证字段实际命名为 `secret`（64 字符字符串），标识字段为 `uid`（32 字符字符串）。
- **直连 RTC 凭据验证**: 使用新建长期密钥直接调用 `https://rtc.live.cloudflare.com/v1/turn/keys/<uid>/credentials/generate-ice-servers`，成功返回 HTTP 201 及 2 组有效 `iceServers`。
- **本轮临时未生效密钥清理**: 本轮早先由于字段名差异未绑定成功且未使用的 2 个临时 key 已全部通过 API 安全清理删除，仅保留当前已绑定至 Worker Secrets 的生产 TURN 密钥。
- **线上生产房间成员语音接口验证**:
  - 流程: 通过真实访客注册 (`POST /api/auth/guest`) -> 房间创建 (`POST /api/rooms`) -> 房间加入并激活在线成员 WebSocket 握手 -> 语音凭据请求 (`POST /api/rooms/:roomId/voice`)。
  - **HTTP 响应**: `200 OK`
  - **`iceServers` 组数**: `2`
  - **总 ICE URL 数量**: `8`
  - **TURN / TURNS URL 数量**: `6`
  - **STUN URL 数量**: `2`
  - **有效时长 (TTL)**: `3600 秒`（动态到期时间戳正常返回）
- **媒体测试说明**: 本报告确认服务端动态 ICE 凭据发放接口 200 通过；实际 RTP 媒体流传输与强制 relay 验收由 OpenCode 线上多端独立完成。

---

## 5. 前端构建与 Pages 生产部署 (Cloudflare Pages)

- **Pages 项目**: `idavoll`
- **生产域名**: [https://idavoll.pages.dev](https://idavoll.pages.dev)
- **触发机制**: GitHub `main` 分支原生 Git 提交触发构建部署
- **画板白底修复**: 修复了 `DrawBoard` 在不同主题下因画布透明导致的黑/白笔迹不可见问题。画布绘图区永久使用纯白底色（离屏合成并在擦除后保持白底），外围 letterbox 保留现有暗色/亮色自适应主题样式。

---

## 6. 验收与交接

所有后端基础设施、生产数据库迁移、密钥环境与前端 UI 缺陷修复均已完成并推送。全量真实端到端音频通信及浏览器跨端交互验收由 OpenCode 免费模型继续执行。
