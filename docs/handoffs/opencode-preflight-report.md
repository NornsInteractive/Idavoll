# 发布前验收结果

2026-10-08，实际使用 `opencode/mimo-v2.6-flash-free`，事件记录费用合计为0。原始日志位于本地 `.cache/tasks/opencode-preflight.log`，完整报告位于 `.cache/opencode-validation-report.md`。未推送、未部署、未写远端数据。

| 检查 | 结果 |
| --- | --- |
| `pnpm install --frozen-lockfile` | 通过 |
| `pnpm test`（16:59 UTC 最新复跑） | 9个文件，60项全部通过 |
| protocol、game-sdk、draw-and-guess、client-core、server 类型检查 | 5个包全部通过 |
| `node tests/integration/worker-integration.mjs` | 83项全部通过，exit 0 |
| ui/web 类型检查、web 生产构建 | Antigravity 同一 idavoll 会话执行并通过 |

集成测试运行真实本地 Worker（127.0.0.1:8791）、Durable Object、D1、R2，通过真实 HTTP/WebSocket 驱动：游客登录入库、401/400/413、私密房密码和房间号、创建设置一致、短期连接票据用途隔离和防重用、重连快照与序号、准备与开始、画手选词及猜手答案隔离、绘画权限与广播、正确猜中不泄露答案、重复猜中不加分、R2画作读取及所有权隔离、轮换画手、对局结算、战绩查询、统计幂等、房主重开。

单元测试补充覆盖中文 JWT、签名/失效/用途、绘画和消息边界验证、2玩家2轮轮换、45/90秒配置、换词与提示次数、离开中止、状态不可变；Codex补充覆盖发送瞬间断线、序号重置、重复登录关闭、退出和身份切换后的异步旧响应隔离。

复查发现的 `gameView.currentWord` 泄漏及 WebCrypto BufferSource 类型问题已修复并复测。真实联网探针还验证了关闭握手修复：客户端关闭后连接正常结束。

平局按照已记录的规则共享排名及胜场，双方 wins 增加是预期行为。

本阶段没有执行生产浏览器或语音验收。生产 API、手机/桌面浏览器操作、真实 RTP 音频、Cloudflare TURN 强制 relay，以及快速匹配、限流、跨源、断线席位超时等分支交由发布后 OpenCode 免费模型验证。物理麦克风和跨真实网络不能用合成音源浏览器结果替代。

本地复现先 apply migrations，然后用32字符以上测试用 JWT_SECRET 启动8791端口 Worker，并执行上述集成脚本。脚本读取本地D1，不可通过替换 BASE_URL 当成生产验收。
