# OpenCode 验证任务

模型必须显式选免费模型：优先 opencode/mimo-v2.6-flash-free，失败可用经核验 input/output/cache pricing 全0的 ling-3.1-flash-free 或 space-bunny-free。不得使用收费模型。

当前阶段是发布前的非 UI 检查；Antigravity 正在修改 UI，Codex 正在修改服务端/services/stores。你只允许创建/修改 tests/ 下测试和 .cache/ 下日志，不允许修改业务源文件、UI、工作流或git，不允许推送、部署或修改远端数据。可执行 pnpm install --frozen-lockfile、非 UI 类型检查、单元测试、wrangler local 测试；不以当前尚在改动的 UI 类型报错当后端失败。

1. 编写并执行最少但有效的测试，覆盖 auth JWT 中文/失效/签名/用途；gameView 对猜手隐藏 secretWord/currentWord/options/私有 fields；游戏完整2玩家2轮轮换、配置45/90秒、非法词/越权/重复猜中不加分、离开人数不足中止、提示换词次数、不修改原state；协议拒绝NaN/超长/非法绘画/伪造消息。测试 fixtures 允许合成，不在生产源新增mock。
2. 执行非UI typecheck: pnpm --filter @idavoll/protocol --filter @idavoll/game-sdk --filter @idavoll/game-draw-and-guess --filter @idavoll/client-core --filter @idavoll/server typecheck。与现有全部 pnpm test。
3. 实际本地 Worker 集成：用隔离端口（如8791）、本地D1和R2、测试用JWT_SECRET（通过wrangler --var或 .cache/ 下变量文件），apply本地migrations。验证 guest登录D1、非法输入401/400、房间创建设置一致、密码错误、roomcode加入、WebSocket短期票据一次使用、真实2用户准备开始、画手选择词、猜手view没有答案、正确猜中广播不含答案、猜手不能画、重复猜中不加分、重连快照及seq持续可用、完整结算D1计数幂等、restart等待。不要绕过真正API验证，不要把直接调用纯引擎测试当联网通过。
4. 报告实际模型、命令与结果、日志路径、确切失败位置及未覆盖内容。当前UI改动中的失败只记录，待交接整体阶段复测。
5. 不修改服务端以让测试通过，不降低验收，失败报告给Codex。外部已有Auth令牌和Cloudflare凭据禁止输出、禁止读取git含token的remote或环境变量值。
