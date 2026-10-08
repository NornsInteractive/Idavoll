# OpenCode 发布后验收

只使用 `opencode/mimo-v2.6-flash-free`（失败时仅换已确认价格全0的免费模型），报告实际模型和费用。不得用付费模型。UI 所有修复由 Antigravity 的 idavoll 会话执行；你只改 tests/、docs/handoffs/ 验收报告和 .cache/ 测试脚本/截图/日志，不改业务源码，不推送或部署。

生产站点 https://idavoll.pages.dev，API https://idavoll-server.kurama-tiny.workers.dev/api。先核对最新部署对应本地 Git commit，记录验收时间和 commit。可创建明确命名 E2E 的真实游客和房间来测试，不删除其他用户数据，不输出登录令牌、WebSocket票据、TURN凭据或已有环境变量值。

## 必须执行

1. `pnpm test`、`pnpm typecheck`、`pnpm --filter @idavoll/web build`。复用发布前集成测试，明确区分本地和生产结果。`tests/integration/worker-integration.mjs`读取本地D1，不可只替换BASE_URL后当生产测试；生产必须使用真实API和浏览器独立验证。
2. 生产 API：health、guest、me、profile更新、presence、创建公开/私密房间、密码错误403、房间号加入、非法输入400、无鉴权401、真实公开房列表、WebSocket票据重用拒绝、非成员语音403；成员语音返回真实 ICE servers，但只记录 TURN URL 数量及到期时间，不保存凭据。补测真实快速匹配、房间人数上限、仅房主改设置、错误Origin的WS拒绝、聊天/操作速率限制、断线超过30秒移除席位（这些分支可以用隔离本地Worker验证，并明确标注）。平局共享排名和胜场是明确规则，不是失败。
3. 通过真实双浏览器页面操作验证完整对局：登录、创建房、另一人加入准备、房主开始、选择真实词、作画广播、正确猜中单次加分、轮换画手、最后真实结算；刷新重连仍在正确角色页面；restart回等待；聊天、弹幕、撤销/重做/清屏、一次提示和一次换词。个人历史和R2画作来自刚完成对局；跨用户历史和画作权限隔离。普通profile/lobby页面不被游戏路由抢占。私密邀请链接弹出密码输入并可加入；错误状态可见。
4. 桌面1440x900及移动390x844浏览器布局：画板坐标保持800x600比例、单条完成笔画不重复发送、全屏操作与角色正确、结果可滚动、聊天/语音按钮可达；深浅主题、中英切换、头像/昵称保存刷新有效。截屏保存在 .cache/tasks/，记录真实失败，不把可见元素当行为通过。
5. 真实 WebRTC 测试：两独立浏览器上下文允许麦克风，点击 UI 开麦，经房间 WS 信令建立音频连接；使用 getStats 记录双端 inbound/outbound RTP bytes/packets 增长，mute后音轨enabled=false、deafen真实audio.muted、按住说话按下/松开和失焦停止、离开释放tracks/peer；单独拒绝麦克风权限显示错误且不能假装开麦。可以用 Chromium `--use-fake-device-for-media-stream --use-fake-ui-for-media-stream --autoplay-policy=no-user-gesture-required` 提供测试音频，必须写明是合成音源，不能宣称物理麦克风/跨真实网络已测试。再通过测试环境捕获 RTC 构造配置，在不改变生产源码的前提下强制 `iceTransportPolicy:'relay'` 验证 Cloudflare TURN relay候选及媒体数据，避免仅STUN直连通过。不要把ICE配置成功当音频通过。
6. 加一个小的语音异步边界测试：麦克风请求未返回时退出房间，随后返回的track应停止，语音状态保持off；权限拒绝后按住说话不能显示未静音；长按松开/blur正确静音。允许在测试层mock浏览器权限/音轨，业务和生产数据禁止mock。

本机已有 Playwright 缓存，可从 `/home/dev/.npm/_npx/` 中现有 playwright 包 require，或已有 `/workspace/projects/aptora/node_modules/.pnpm/playwright@1.63.0/node_modules/playwright`；Chromium在 `/home/dev/.cache/ms-playwright/chromium-1243/chrome-linux64/chrome`。优先复用，不必添加项目依赖。`browser-act`也可用于浏览器观察。测试注入监视 `RTCPeerConnection` 和 getUserMedia 仅写测试脚本，不修改生产源码。

遇到失败：记录可复现步骤、URL/角色、预期/实际、准确文件位置，交回 Codex；禁止降低测试要求来让失败消失。最终写 `docs/handoffs/opencode-final-report.md`，逐项标记通过/失败/未测，附实际命令、截图路径、模型和费用。必须如实区分：本地 Worker、生产API、浏览器完整操作、RTP媒体、Cloudflare TURN强制relay、真实设备跨网。不得用纯引擎测试替代这些项目。
