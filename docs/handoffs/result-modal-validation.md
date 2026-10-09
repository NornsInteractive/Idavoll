# 房间内结果弹窗验证

日期：2026-10-09。UI 由 Antigravity 原 idavoll 会话设计并实现；Codex 修改路由、状态及回归测试，OpenCode 免费模型仅执行测试。

## 行为

对局结束回到原房间，打开真实服务器比分和个人胜负结果弹窗。关闭弹窗不发送离房动作、不重建 WebSocket，玩家仍能聊天。房主可重置原房间，其他成员重新准备。下一局结束再次打开结果；可从房间重新查看战绩。中止对局展示中止结果；零分并列名次遵循服务器排名。旧 `/game/result` 地址和刷新恢复到同一房间。

## 本地验证

- `pnpm exec vitest run`：13 文件、78 项全部通过；包含新增 13 项结果状态和路由回归。
- `pnpm typecheck`：Antigravity 验证 7 个包通过。
- `pnpm --filter @idavoll/web build`：通过；已有的大包提示不阻止构建。
- OpenCode `opencode/mimo-v2.6-flash-free`，独立 Chromium 浏览器上下文、真实 UI 操作和 WebSocket；隔离本地 Miniflare DO/D1/R2，未使用伪造 API、游戏状态或加速计时。
- 主流程：47/47，90.1 秒。真实双人两局；胜负、准确比分、留房、关闭后聊天、重开与重新准备、再次弹窗、390×844 无横向溢出、焦点约束/Tab/Escape/关闭、刷新和旧地址恢复通过。
- 成员离开中止：7/7，5.4 秒；剩余成员仍在原房间，服务器 aborted 状态和无虚构领奖台通过。
- 零分平局：6/6，221.3 秒；真实两轮四次 45 秒无人猜中，双方 0 分、服务器 rank=1/isMvp、并列结果和积分榜一致。
- 三场景合计 60/60；各测试 Node 命令退出码 0，OpenCode 返回的模型步骤费用均为 0。

复验中发现并修复了旧结果地址恢复时的竞态：连接恢复暂时清空 savedRoomId，再次 effect 曾误跳大厅；进行中恢复加 guard，两个回归通过。早期重叠日志已废弃；不存在的 1 轮快捷按钮导致的测试定位失败已修为 UI 支持的 2 轮，未修改产品设置。

测试脚本、日志、截图和本地数据库在忽略目录 `.cache/`，不提交。截图包括主流程结算、第二局结算、手机弹窗、刷新恢复、中止与零分平局。

## 发布与线上验证

- 功能提交：`39f3e6158a8d1b20ded83b864bfb16f22cb9d4be`。
- [GitHub CI](https://github.com/NornsInteractive/Idavoll/actions/runs/37882986422)：Success，78 单测、7 包 typecheck、production build 通过。
- Cloudflare Pages Production：`f61925e5-9827-482f-80ff-e4774c1988ac`，对应上述提交，deploy/success；站点 [idavoll.pages.dev](https://idavoll.pages.dev)。
- OpenCode 同一免费模型线上主流程：47/47，105.9 秒，Node 退出码 0，模型步骤费用 0；两局、真实 API/WebSocket、比分、留房、关闭、重开、手机视口、键盘、刷新及旧地址恢复完整通过。
- 线上验证的结算/关闭/第二局过程无额外 WS 重建。随后按测试计划主动刷新和访问旧地址产生新连接，并成功恢复原房间。
- 本机测试浏览器用 `host-resolver-rules` 固定真实域名的 Cloudflare IPv4，保留 HTTPS/WSS、域名和证书校验；测试前通过 Cloudflare DNS-over-HTTPS 确认地址。未 mock API/WS/store。
- 线上日志与截图：`.cache/e2e-result-modal-production.log`、`.cache/tasks/result-modal-production/`。首次线上执行记录了单次重连及选词采样超时（27/30），保留 `.cache/e2e-result-modal-production-initial.log`；补充真实 connection:snapshot 采样及 WS/CDP 诊断后完整复验通过。初次断连原因未捕获，未据此修改产品源码，也未把失败轮次算作通过。

此次不修改或部署 Worker，不迁移数据库、不改 Secrets；保留既有自有 coturn 与 Cloudflare TURN 备用配置。Worker 部署仍为 `66f9b46c-a6ea-4dc7-9a4b-307488eeb30c`（version `08de84dc-c7d6-4db9-874e-43992bc909c4`）。此报告后续归档提交只包含文档，产品代码与已验证版本相同。

## 验证边界

390×844 是 Chromium 模拟视口，未测试实体手机/Safari。此次覆盖房间结算与重开交互，不重复完整语音中继测试；后端与 TURN 配置不变。
