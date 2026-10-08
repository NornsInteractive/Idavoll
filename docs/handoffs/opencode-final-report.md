# OpenCode 最终验收报告

归档时间：2026-10-08 12:51:36 UTC。测试由 OpenCode 执行，Codex 根据实际工具输出和日志归档本报告；UI 设计、布局、响应式与 UI 修复全部由 Antigravity 原 `idavoll` 会话完成，业务逻辑修复由 Codex 完成。

## 交付版本

- 生产站点：https://idavoll.pages.dev
- 生产 API：https://idavoll-server.kurama-tiny.workers.dev/api
- 最新实际对局验收 HEAD：`5e53966b9f1fd9b3b087806a43c94b81316a5424`。
- 最新产品 UI 源码：`1039aa3c99ec09c8c12c96bd876b385eab84ffd5`；`5e53966` 仅增加 UI 验收文档。
- Cloudflare Pages：`143d2eba-e0ff-4c86-ab3b-09616a674c9c`，production deploy **success**；Codex 独立查询确认 SHA 与上列 HEAD 一致。
- GitHub CI：上述两次提交均 success。最终归档提交增加测试与文档，沿用本报告记录的产品验收版本。
- OpenCode 模型：`opencode/mimo-v2.6-flash-free`；已完成测试调用的实际 `step_finish.cost` 均为 **0**。未切换付费模型。

## 实测结果

所有下列验收均通过；历史独立服务验收和最终 UI 复跑分列记录。日志完成时间使用本机日志文件的 UTC 修改时间，单测与 typecheck 时间来自 CLI 事件时间戳。较早结果的具体命令、输出和版本上下文保存在相应 CLI 日志；未记录精确启动 SHA 的历史项目按实际验收阶段记录。

| 范围 | 结果 | 完成时间（2026-10-08 UTC） | 版本/证据 |
| --- | --- | --- | --- |
| 单元测试 | **65/65 PASS**，11 个测试文件 | 10:52:38 | `ba6a774` 发布后的工作树，含尚待归档的 `tests/voice.test.ts` 4 项；`.cache/tasks/opencode-rtc-resume.log` |
| 工作区类型检查 | **7/7 PASS** | 10:52:43 | 项目既定 `pnpm typecheck`；同上 CLI 日志 |
| Web 生产构建 | **PASS** | 历史构建及最新 UI 修复构建 | OpenCode CLI 构建输出、Antigravity UI 报告；最终归档再次检查 |
| 本地真实 Worker/D1 集成 | **83/83 PASS** | 09:39:23 | `.cache/worker-integration-post-release.log`，本地 Worker/D1，未作为生产接口测试 |
| 本地边界分支 | **15/15 PASS** | 09:41:05 | `.cache/local-branch-check.log` |
| 生产 API | **54/54 PASS** | 09:37:39 | `.cache/production-api-check.log`，真实生产 Worker |
| 生产真实 WebRTC/强制 TURN relay | **47/47 PASS** | 10:49:00 | 语音服务修复 `ba6a7747d32ace5d149b6fbf47d1fcfea54fe5bb` 上线后；`.cache/e2e-voice-rtc.log` |
| 最新生产完整四回合对局 | **57/57 PASS** | 12:37:52 | `5e53966`；`.cache/e2e-game.log`、`.cache/tasks/opencode-hud-correction.log` |
| 主题/语言/昵称头像/私密邀请及隐私 | **28/28 PASS** | 12:27:07 | Stitch/SVG 恢复后的生产 UI；`.cache/e2e-ui.log` |
| 桌面/手机/全屏语音 UI | **79/79 PASS** | 12:24:27 | Stitch/SVG 恢复后的生产 UI；`.cache/e2e-voice-ui.log` |
| 原 HUD 失败位置、工具按钮、全屏/手机输入 | **25/25 PASS** | 12:34:37 | 产品 `1039aa3`；`.cache/e2e-hud-regression.log` |
| AG 响应式/字体失败条件/原位置输入 | **49/49 PASS** | 12:26–12:27 | AG 自测，产品 `1039aa3`；`antigravity-ui-verify-report.md` |

较早的完整对局 55/55、56/56 和 UI 27/27 已由上表最新运行结果覆盖。AG 在 `1039aa3` 上另运行 OpenCode 完整四回合脚本 **56/56 PASS**，原始 DONE 工具 stdout 已保存 `.cache/tasks/agy-game-hud-pass.log`；该项单独记录为 AG 自测，OpenCode 最新复跑为 57/57。

## 已验证的真实行为

- 真实游客身份、用户资料更新、在线状态、公开/私密房、密码/邀请加入、鉴权与非法输入拒绝、成员 ICE 凭据及非成员拒绝；私密房不出现在公共列表。
- 本地独立分支验证快速匹配、人数上限、仅房主改设置、Origin 校验、一次性 WS 票据、聊天/操作限速及断线超过 30 秒移除席位。
- 两个独立浏览器真实登录、创建/加入/准备/开始、选择真实词、画笔同步、撤销/重做/清屏、提示/换词次数、普通聊天/弹幕、正确猜中单次计分、轮换、刷新重连、真实结算与再来一局。
- 刚结束对局生成真实战绩与 R2 画作；非参战用户历史与画作隔离；普通个人页/大厅访问正常。
- WebRTC 双端真实连接且 `getStats` inbound/outbound RTP 增长；强制 `iceTransportPolicy: 'relay'` 后选中 relay/relay 候选并传输媒体。仅得到 ICE 配置不作为语音通过。
- 静音实际改变音轨 `enabled`，闭音实际改变播放元素 `muted`；长按按下/松开、touch end/cancel、blur、离开房间释放音轨与 peer；权限拒绝显示实际错误并保持静音。
- 手机和桌面实际 UI 入口可达；状态/模式/闭音控件通过 AG 自行设计的面板访问，状态与真实 RTC 对应。

## 修复及回归

1. 语音首次协商事件被异步 `replaceTrack` 顺序遗漏：Codex 修复 handler 注册顺序与 generation 边界；AG 发布 `ba6a774`，OpenCode 真实媒体及强制 relay 回归通过。
2. 外部 Material Symbols 字体失败时显示原始图标单词、手机控件重叠：AG 用现有依赖的本地 SVG 图标修复并发布 `8c60d190ba87a3d08e142812d1b79a87177416a1`；AG 主动拒绝字体请求验证图标与响应式，OpenCode 新 UI 行为通过。
3. HUD 非交互空白区域拦截画笔起笔：AG 发布 `1039aa3`。OpenCode 在原失败位置 `canvas + (70,40)` 真实起笔，桌面/全屏/手机双端均出现笔迹，浮层撤销/重做/清屏仍有效。
4. 全屏回归脚本曾重画相同路径，像素数量不增长造成假失败。OpenCode 修改测试：先清屏并确认双端 ink=0，再在原位置起笔，检查新像素及新 `draw:stroke`；全屏进入/退出还核对实际 fullscreen 状态。修正后的 **25/25 PASS**。

## 执行命令与证据

```sh
pnpm test
pnpm typecheck
pnpm --filter @idavoll/web build
node tests/integration/worker-integration.mjs
node .cache/local-branch-check.mjs
node .cache/production-api-check.mjs
node .cache/e2e-voice-rtc.mjs
node .cache/e2e-game.mjs
node .cache/e2e-ui.mjs
node .cache/e2e-voice-ui.mjs
node .cache/e2e-hud-regression.mjs
node .cache/tasks/agy-stitch-verify.mjs
```

`.cache/` 为本机忽略目录，脚本、原始日志与截图未提交到 Git；本地集成脚本和新增语音边界单测在 `tests/`。最终 CLI 证据为 `.cache/tasks/opencode-ui-contract-final.log`、`opencode-hud-final.log`、`opencode-hud-correction.log`；历史接口/RTC/门槛证据在 `opencode-final.log`、`opencode-preflight.log`、`opencode-rtc-resume.log`。

主要截图均在 `.cache/tasks/`：AG 两角色 `agy-drawer-mobile-390x844.png`、`agy-guesser-mobile-390x844.png`、`agy-drawer-narrow-360x780.png`、`agy-guesser-narrow-360x780.png`、`agy-drawer-desktop-1440x900.png`、`agy-guesser-desktop-1440x900.png`；最新完整对局 `game-2-drawer.png`、`game-3-guesser.png`、`game-5-refreshed.png`、`game-6-result.png`、`game-8-profile.png`；HUD `hud-2-desktop-stroke-ok.png`、`hud-2b-guesser-rendered.png`、`hud-4b-fullscreen-stroke.png`、`hud-5b-mobile-stroke.png`；语音 `voice-6-relay-connected.png`、`voice-7-permission-denied.png`、`vui-V5-A-drawer-panel.png`、`vui-V5-B-guesser-panel.png`、`vui-mobile-ptt-held.png`、`vui-A-after-leave.png`、`vui-B-after-leave.png`。

## 测试条件与未测范围

- 浏览器为 Chromium/Playwright，1440×900 桌面、390×844 手机视口，以及 AG 的 360×780、1024×768/全屏检查；Safari、实体手机或原生 Tauri/Capacitor 构建未验收。
- 本机 DNS 曾返回错误域名地址。测试层 `host-resolver-rules` 修正实际 Pages、Worker、TURN/STUN 域名解析；仍使用真实域名/TLS/Origin/生产 API/WS。产品未硬编码这些 IP，测试未替换生产房间或模拟生产 WS。
- 麦克风成功流程使用 Chromium 合成音源/权限测试参数；真实 RTP 与 relay 已验证，物理麦克风、不同真实网络设备之间的音质和连接稳定性 **未测**。
- OpenCode 手机 PTT 使用 CDP touch 输入；blur 检查包含实际服务处理的合成 window blur 事件。AG 手机绘画为手机视口 pointer 模拟，未称实体手机触控。
- AG 字体失败测试只拒绝外部字体请求，真实应用/API/WS 保持联网，未声称整个应用离线可用。
- 无自有 TURN 配置时生产使用 Cloudflare TURN；其超免费额度的流量可能计费。本报告未记录 JWT、WS 票据、ICE credential 或环境变量值。
