# OpenCode 发布后验收

只使用 `opencode/mimo-v2.6-flash-free`（失败时仅换已确认价格全0的免费模型），报告实际模型和费用。不得用付费模型。UI 所有修复由 Antigravity 的 idavoll 会话执行；你只改 tests/、docs/handoffs/ 验收报告和 .cache/ 测试脚本/截图/日志，不改业务源码，不推送或部署。

生产站点 https://idavoll.pages.dev，API https://idavoll-server.kurama-tiny.workers.dev/api。先核对最新部署对应本地 Git commit，记录验收时间和 commit。可创建明确命名 E2E 的真实游客和房间来测试，不删除其他用户数据，不输出登录令牌、WebSocket票据、TURN凭据或已有环境变量值。

当前协调进度：TURN 已配置，生产成员接口已返回真实 Cloudflare ICE 凭据。语音长按、真实状态、中英标签、关闭释放与桌面重做已在 `59b2ddb` 全部发布，Pages deployment `5e5272a6-905e-4560-af32-8b5be175432b` 成功。直接执行当前生产浏览器流程，报告注明最终验收commit；以页面实际行为和线上资源为准，不把本地dist当生产快照。

测试环境网络原因已定位：本机 `dns.lookup` 给Worker域名返回 `31.13.80.169`，`dns.resolve4`曾返回 `104.244.46.165`；同时间 Cloudflare HTTPS DNS查询实际A记录为 `104.21.9.138` 与 `172.67.160.129`。仅关闭HTTP/2和QUIC仍不能恢复实际页面；使用 `--host-resolver-rules=MAP idavoll-server.kurama-tiny.workers.dev 104.21.9.138, EXCLUDE localhost` 后，Codex `.cache/ws-app-network-dns.mjs` 已通过真实页面登录→创建房间→WS快照→完整等待房间显示，对照截图 `.cache/tasks/networkdns-waiting.png`；随后 `.cache/ws-app-network-dns-default.mjs` 仅修正DNS、保留默认HTTP/2/QUIC设置也通过同一流程。该参数整个作为一个argv字符串，仅修正测试层域名解析，保持真实域名/TLS/Origin/生产后端不变；禁止硬编码产品IP或替换/模拟WS。复用该参数继续浏览器对局/RTP/relay，报告注明DNS条件。若TURN域名也解析异常，对ICE URL中的实际主机查HTTPS DNS再加仅测试层mapping；不得打印或保存ICE凭据。

首轮RTC脚本已失败，修正测试后重跑：读取 `.cache/opencode-rtc-review.md` 的准确定位。Pages域名也需测试层DNS修正（HTTPS DNS当前 `172.66.47.107` / `172.66.44.149`），`page.evaluate(COLLECT)` 中字符串箭头函数需实际调用；手机使用真实CDP touch输入并留意按住后aria变化。每个browser/context用finally关闭，否则失败后Node会挂住；此次脚本输出汇总后因未关闭浏览器而挂住，Codex已只终止该测试Node子进程，保留OpenCode会话和失败结果。

语音产品bug已由Codex修复、agy发布：`ba6a7747d32ace5d149b6fbf47d1fcfea54fe5bb`，Pages `61ed03d8-58c4-4f82-83dd-6163b4ac0406` 已成功。首次协商的handler现在在await replaceTrack前注册，旧generation协商不再发送；Chromium对照和回归证据都在，61单测/7包typecheck/build通过。OpenCode仅测试和报告，产品逻辑由Codex修、UI由agy修。

用户最新UI要求：agy正在原idavoll会话按 `temp/stitch_idavoll` HTML恢复你画我猜样式结构并完成响应式设计。现有ba6a774的RTP/relay/接口/规则等独立验收继续；最终浏览器UI/布局报告必须对agy恢复后发布的最新commit复验，不把旧UI截图当最终交付。OpenCode仅测试，不修改产品UI或业务，不规定UI设计；发现行为问题给Codex，UI问题由agy设计修复。

## 必须执行

1. `pnpm test`、`pnpm typecheck`、`pnpm --filter @idavoll/web build`。复用发布前集成测试，明确区分本地和生产结果。`tests/integration/worker-integration.mjs`读取本地D1，不可只替换BASE_URL后当生产测试；生产必须使用真实API和浏览器独立验证。
2. 生产 API：health、guest、me、profile更新、presence、创建公开/私密房间、密码错误403、房间号加入、非法输入400、无鉴权401、真实公开房列表、WebSocket票据重用拒绝、非成员语音403；成员语音返回真实 ICE servers，但只记录 TURN URL 数量及到期时间，不保存凭据。补测真实快速匹配、房间人数上限、仅房主改设置、错误Origin的WS拒绝、聊天/操作速率限制、断线超过30秒移除席位（这些分支可以用隔离本地Worker验证，并明确标注）。平局共享排名和胜场是明确规则，不是失败。
3. 通过真实双浏览器页面操作验证完整对局：登录、创建房、另一人加入准备、房主开始、选择真实词、作画广播、正确猜中单次加分、轮换画手、最后真实结算；刷新重连仍在正确角色页面；restart回等待；聊天、弹幕、撤销/重做/清屏、一次提示和一次换词。个人历史和R2画作来自刚完成对局；跨用户历史和画作权限隔离。普通profile/lobby页面不被游戏路由抢占。私密邀请链接弹出密码输入并可加入；错误状态可见。
4. 桌面1440x900及移动390x844浏览器布局：画板坐标保持800x600比例、单条完成笔画不重复发送、全屏操作与角色正确、结果可滚动、聊天/语音按钮可达；深浅主题、中英切换、头像/昵称保存刷新有效。截屏保存在 .cache/tasks/，记录真实失败，不把可见元素当行为通过。
5. 真实 WebRTC 测试：两独立浏览器上下文允许麦克风，点击 UI 开麦，经房间 WS 信令建立音频连接；使用 getStats 记录双端 inbound/outbound RTP bytes/packets 增长，mute后音轨enabled=false、deafen真实audio.muted、按住说话按下/松开和失焦停止、离开释放tracks/peer；单独拒绝麦克风权限显示错误且不能假装开麦。可以用 Chromium `--use-fake-device-for-media-stream --use-fake-ui-for-media-stream --autoplay-policy=no-user-gesture-required` 提供测试音频，必须写明是合成音源，不能宣称物理麦克风/跨真实网络已测试。再通过测试环境捕获 RTC 构造配置，在不改变生产源码的前提下强制 `iceTransportPolicy:'relay'` 验证 Cloudflare TURN relay候选及媒体数据，避免仅STUN直连通过。不要把ICE配置成功当音频通过。
6. 加一个小的语音异步边界测试：麦克风请求未返回时退出房间，随后返回的track应停止，语音状态保持off；权限拒绝后按住说话不能显示未静音；长按松开/blur正确静音。允许在测试层mock浏览器权限/音轨，业务和生产数据禁止mock。

本机已有 Playwright 缓存，可从 `/home/dev/.npm/_npx/` 中现有 playwright 包 require，或已有 `/workspace/projects/aptora/node_modules/.pnpm/playwright@1.63.0/node_modules/playwright`；Chromium在 `/home/dev/.cache/ms-playwright/chromium-1243/chrome-linux64/chrome`。优先复用，不必添加项目依赖。`browser-act`也可用于浏览器观察。测试注入监视 `RTCPeerConnection` 和 getUserMedia 仅写测试脚本，不修改生产源码。

遇到失败：记录可复现步骤、URL/角色、预期/实际、准确文件位置，交回 Codex；禁止降低测试要求来让失败消失。最终写 `docs/handoffs/opencode-final-report.md`，逐项标记通过/失败/未测，附实际命令、截图路径、模型和费用。必须如实区分：本地 Worker、生产API、浏览器完整操作、RTP媒体、Cloudflare TURN强制relay、真实设备跨网。不得用纯引擎测试替代这些项目。

最新恢复页面已发布：969b194b768065fb6848b58d244e6ffc471d421e；Pages 452457af-ed6a-49f3-9de9-29fef7e25d80。agy仍在继续真实截图/响应式/i18n/词语缺省信息复核，完成后以最终最新commit验收。现有完整对局脚本需选当前可见canvas/按钮，桌面与手机都可能挂载隐藏副本；不能把第一个隐藏元素当产品不可用。

后续进度：OpenCode生产完整四回合对局 `.cache/e2e-game.log` 已55/55 pass，含真实history/R2/跨用户隔离。agy最新产品修复37d7447加入桌面chat/PTT-mode入口、移除历史chat错误绑定当前earned、当前回合正确猜手提示；最终控件需复验。Codex查看实际agy-guesser-mobile-390x844.png发现Material Symbols原始名称被当文字绘制并造成顶部/底部控件重叠截断，已准备交agy诊断与修复，最终响应式截图和字体失败条件尚待验收。不要将717b960的旧手机截图当最终视觉通过。

最新UI已完成：8c60d190ba87a3d08e142812d1b79a87177416a1（SVG图标修复），当前文档head c52eda1a4c01efc883941a6e3d68a1b246b986f9，GitHub CI均成功。agy在真实生产/font CDN请求主动abort条件下43/43通过，实际查看SVG修复后桌面/手机/窄屏/全屏PNG，截图角色严格Round1 URL核对；证据和报告见antigravity-ui-verify-report.md。根代理已查看新390x844两角色PNG，原始图标单词泄露/重叠问题已消除。业务和voice service没有再变更，最终OpenCode复验只需最新UI影响的控件行为/可用性，完成报告后由agy统一提交tests/voice.test.ts和文档并等待Pages最终head成功。

最终UI行为复验已完成：最新c52eda1/8c60d19产物上，OpenCode79/79语音UI、27/27主题语言/个人设置/私密邀请、56/56完整真实对局通过。完整对局额外发现画布顶部HUD非交互空白区域吞起笔事件；调整测试起笔位置可完成画作和真实R2历史，但该实际UI输入问题已交agy处理，不能只回避起笔位置作为最终修复。agy修复发布后需由OpenCode对原失败位置及真实浮层按钮做针对性回归，然后报告完整结果。原47/47RTC媒体/强制relay与65本地单测不因纯UI事件处理变化而重复扩展。

HUD输入问题现已由agy发布修复：1039aa3c99ec09c8c12c96bd876b385eab84ffd5，Pages59328bc4-3832-4e62-8c8e-f98de8520793，Codex独立查询生产deploy和GitHub CI均success。agy49/49复验通过，原失败y=canvas+40起笔本地及远端ink正常、撤销/重做/清屏按钮有效、手机HUD输入与响应式及两角色截图正确。OpenCode正在该最新产品上做独立HUD回归并完成报告，修复后不要求重新运行无关服务测试。

最终针对性回归已完成：OpenCode免费模型在产品1039aa3（文档HEAD5e53966）的真实生产环境完成25/25 HUD输入/实际工具按钮/全屏状态/手机起笔回归，全屏先清屏再在原位置画线并验证两端新ink及新draw:stroke，避免同路径重叠像素造成假失败。agy最新完整四回合56/56原始DONE工具stdout已保存 .cache/tasks/agy-game-hud-pass.log；其49/49响应式与字体请求失败条件验证见UI报告。OpenCode各轮step_finish实际费用均0。报告完成后由agy归档提交65单测所需新增tests/voice.test.ts和最终验收文档，确认CI和Pages最终SHA成功即可。

OpenCode最终还在5e53966线上重新运行了包含原失败位置命中canvas与双端ink断言的完整四回合流程，实际57/57 PASS（原56项目增加1个HUD hit-test验收）。最新UI偏好/私密房隐私验证为28/28 PASS（前轮27项目外验证私密房不出现在公开列表）。因此最终报告以最新57完整game/28UI/79voiceUI/25HUD为准，旧轮55/56和27保留为历史，不作为最新count。

归档已完成：OpenCode实际测试全部通过后，Codex按真实CLI工具stdout/日志汇总 docs/handoffs/opencode-final-report.md；测试执行仍为免费OpenCode，报告如实注明归档作者、时间来源与历史/最新验收版本。AG最后提交测试和文档并验证最终CI/Pages，无产品源码追加变更。
