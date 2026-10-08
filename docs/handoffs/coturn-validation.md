# 自建 TURN 验证与部署

`coturn.norns.dpdns.org:3478` 的 UDP、TCP 均通过认证、中继及双向音频测试，已经配置为 Idavoll 生产 Worker 的首选 TURN。5349 TLS 未通过握手，未纳入生产配置。

测试由 OpenCode 的 `opencode/mimo-v2.6-flash-free` 执行；Codex 审查实际证据并整理本报告，原 Antigravity `idavoll` 会话负责部署及 GitHub 归档。OpenCode CLI 已记录的 `step_finish.cost` 均为 0。测试使用已有 Playwright/Chromium，无新增依赖；这里的零费用指模型调用记录，不代表 VPS 或 Cloudflare 运行费用。

## 预部署验证

测试时间为 2026-10-08 UTC，最终有效轮次结束于 `14:02:17.524Z`。系统 DNS、Cloudflare DoH 和 Google DoH 一致返回 A `204.44.103.206`，无 AAAA。Docker 内部名称 `turn` 没有作为公网服务器地址使用。

匿名 TURN Allocate 返回 401 认证挑战；STUN Binding 成功仅作为探测结果。中继结论来自 Chromium 使用用户真实凭据进行的原生认证及媒体传输。

两个独立浏览器上下文通过本地安全上下文页面交换测试信令，分别仅配置待测通道，双方 `iceTransportPolicy=relay`。两端连接后选中的 local/remote candidate 均为 `relay`，IP 均为 `204.44.103.206`。

| 通道 | 结果 | 4500 ms 音频 RTP 增量 |
|---|---|---|
| UDP/3478 | PASS | A 发 +10139 B/+351 包、收 +10242 B/+214 包；B 发 +10793 B/+227 包、收 +8169 B/+270 包 |
| TCP/3478 | PASS | A 发 +10811 B/+226 包、收 +12143 B/+222 包；B 发 +12522 B/+226 包、收 +9293 B/+194 包 |
| TLS/5349 | 未启用 | 握手 EOF/ECONNRESET，无对端证书；不能验证域名或证书链 |

首轮 UDP 曾因过早读取 getStats、B 端 candidate 尚未就绪判为失败，双向媒体已经增长；补充等待连接及 candidate 记录就绪后重测通过。这是测试采样修正，没有修改服务器。openssl 的 `Verify return code: 0` 在没有对端证书时不构成 TLS 通过证据。

## 生产部署

Antigravity 于 `2026-10-08T14:06:57.21007Z` 更新 Cloudflare Worker Secret `TURN_SERVERS_JSON`，只包含以下已验证 URL 及对应认证凭据：

```text
turn:coturn.norns.dpdns.org:3478?transport=udp
turn:coturn.norns.dpdns.org:3478?transport=tcp
```

- Worker：`idavoll-server`
- 当前版本：`08de84dc-c7d6-4db9-874e-43992bc909c4`，100% 流量
- Deployment：`66f9b46c-a6ea-4dc7-9a4b-307488eeb30c`
- 站点：`https://idavoll.pages.dev`
- API：`https://idavoll-server.kurama-tiny.workers.dev/api`

Codex 独立查询 Cloudflare 部署及 Secret 名称确认上述状态；原 `JWT_SECRET`、`TURN_KEY_ID`、`TURN_KEY_API_TOKEN` 仍存在，公开健康接口返回 200。本轮为配置更新，没有修改产品源码、UI 或数据库。

## 上线后真实房间测试

使用生产站点、真实游客登录、真实房间及 Room WebSocket 信令，两位用户实际点击开麦。认证配置来自生产 `/api/rooms/:id/voice` 响应；测试只在 RTCPeerConnection 层强制 relay 并过滤当前协议 URL，保留后端返回的用户名、密码，没有注入本地 ICE 替代后端响应，没有模拟 API 或房间信令。

两种通道分别使用独立房间及浏览器上下文。已验证后端返回 200、仅含上述自建 TURN URL，凭据与私有文件一致；日志只记录比较布尔值，不记录凭据。

| 独立通道 | 通过证据 | 双向 RTP 增量 |
|---|---|---|
| UDP/3478，`14:19:55.175Z`–`14:20:23.383Z` | 14/14 检查通过；两端 connectionState=connected、实际 selected pair relay/relay 且 IP 为自建服务器；两端 UI 已连麦；退出后 track ended、PC closed | 4208 ms：A 发 +12948 B/+211 包、收 +10725 B/+415 包；B 发 +12785 B/+486 包、收 +11168 B/+179 包 |
| TCP/3478，`14:18:28.925Z`–`14:19:00.790Z` | 独立通道顺序复验通过；两端 selected pair succeeded、relay/relay 且 IP 为自建服务器；两端 UI 已连麦；退出后 track ended、PC closed。此前 `14:17:07.240Z`–`14:17:37.916Z` 独立 TCP 轮次也为 14/14 | 4204 ms：A 发 +12026 B/+210 包、收 +12773 B/+218 包；B 发 +12441 B/+210 包、收 +12335 B/+217 包 |

UDP 末轮使用 `transport.selectedCandidatePairId` 读取选中的 pair；媒体窗口后其状态仍显示 `in-progress`、`nominated=true`，并非声称该轮 pair 为 succeeded。两端连接状态 connected、选中 relay 地址及持续双向 RTP 是通过依据。TCP 表中的最终轮次两端 pair 均为 succeeded。TURN-over-TCP 的 relay candidate 显示 UDP 属正常：客户端到 TURN 的 TCP 与服务器分配的 UDP relay 是不同链路。

初轮生产 TCP 曾未连接且无 RTP；测试结果汇总也存在 URL 字段丢失问题。修正测试汇总后，独立 TCP 和完整双通道轮次均通过；没有修改产品或 coturn 服务。测试中出现过 701 接口地址错误，但通过轮次也出现该事件，不能仅据此归因初轮失败。初轮失败的根因未独立确认，后续实际设备验收仍有价值。

## 配置与恢复

凭据保存在本机 Git 忽略的 `.cache/private/` 中（目录 0700、文件 0600），并写入 Cloudflare Secret；没有写入提交的源码、报告或日志。固定 TURN 用户名和密码会经语音接口下发给已加入房间的浏览器，用于原生认证；当前没有接入自建 TURN 动态短期凭据。

未配置 `TURN_SERVERS_JSON` 时使用 Cloudflare TURN。配置自建 TURN 后没有故障自动回退；若需要恢复 Cloudflare 默认服务，删除该 Worker Secret，并保留原 `TURN_KEY_ID` 和 `TURN_KEY_API_TOKEN`。

## 证据与边界

本机测试产物均位于 Git 忽略的 `.cache/`：

- `.cache/turn-relay-test.mjs`、`.cache/tasks/coturn-relay-evidence.log`：预部署原生 relay 及媒体证据。
- `.cache/e2e-coturn-prod.mjs`、`.cache/tasks/coturn-production-relay-evidence.log`：真实生产房间的分通道结果、选中地址、媒体增量和释放证据。
- `.cache/tasks/coturn-udp-recheck-stdout.log`：独立 UDP 14/14 原始输出；CLI 捕获实际 Node 退出码为 0。
- `.cache/tasks/opencode-custom-turn-production.log`、`.cache/tasks/opencode-custom-turn-final-test.log`：免费模型执行记录及费用事件。
- `.cache/tasks/coturn-deployed.json`：Codex 独立读取的无凭据部署元数据。

音频来自 Chromium 合成麦克风，两端位于同一测试主机，经远端 coturn 中继；未验证实体设备跨网络 NAT、物理麦克风或视频。生产 Pages/Worker 测试使用 DoH 确认的测试层 DNS 映射，域名、TLS、Origin 仍为真实生产地址；coturn 使用正常解析。5349 尚无可验证证书，未部署 `turns:`。未扩展端口扫描、猜测凭据或重复旧项目全套 E2E；文档归档后的标准 GitHub CI 和 Pages 发布由 Antigravity 确认。
