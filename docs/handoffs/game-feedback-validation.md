# 提示、聊天滚动、随机昵称与题库验证

日期：2026-10-09。UI 与页面接线由 Antigravity 原 idavoll 会话完成；Codex 修复服务端逻辑、昵称生成器、词库和回归测试。OpenCode 免费模型仅执行测试，不修产品或发布。

## 修改与范围

- 普通 `chat:send` 不再被服务端当作猜词，只有 `game:submit_guess` 计猜词并发送反馈。申请提示、快捷求提示、反应和普通聊天不增加猜词次数、不覆盖先前反馈。聊天中公布答案仍被拒绝。
- 全屏未猜中的成员显式提交猜词；画手和已猜中成员仍发送聊天。
- Antigravity 修复房间与共享聊天容器高度约束，消息在列表内部滚动；保留原界面样式与响应式。
- 登录初始为英文词组合昵称；40 个形容词 × 32 个主题词 × 64 个动物词，共 81,920 种组合，随机按钮不会产生与当前相同的名称。全部组合满足昵称长度和服务器约束。
- 词库从 22 扩充到 342 个词，13 个主题；简单 110、标准 110、困难 122，保留旧词。选词用 Fisher–Yates 洗牌，不修改原词库，不重复同一次候选。
- 无数据库结构、依赖、协议字段或 TURN 配置变化。普通聊天和猜词使用已经存在的两个协议入口。

## 本地验证

- `pnpm exec vitest run`：15 文件、92/92。新增服务端真实消息处理分流、防答案泄露、统计/反馈回归及昵称空间/边界校验，扩充题库数据质量与各难度候选回归。
- `pnpm typecheck`：7/7；Antigravity 的 web production build 通过。
- `opencode/mimo-v2.6-flash-free` 执行 `.cache/e2e-game-feedback-ready.mjs`：31/31，31.3 秒，Node 退出码 0，模型步骤费用 0。
- 真实 Chromium 三个独立浏览器上下文，经 UI 登录、创建/加入房间、发消息、准备开局、选词、提示、模式切换和全屏交互。隔离本地 Miniflare DO/D1/R2；无 API/WS/store mock、无游戏计时加速。
- 初始随机昵称、5 次刷新不同默认名、20 次随机按钮、默认昵称真实提交到房间通过。
- 50 条真实 UI 聊天后 PC 框高度保持 705px；列表 clientHeight=589px、scrollHeight=2620px，历史能上下滚动，输入可见、页面不撑长。1280×720 与 390×844 聊天滚动、输入可见与无横向溢出通过。
- 真实困难候选为捉迷藏/贴春联/穿山甲；三个不同扩充词。猜手视图没有 currentWord/wordChoices。
- 桌面与手机申请提示均是普通聊天、无 guess_result/submit_guess、保留输入草稿。快捷提示同样不触发猜词；画手真实公布首字提示正常。
- 错误猜词仍返回 correct=false；聊天模式无猜词反馈、不能公布答案；全屏正确抢答显式 submit_guess 并加分，第三人未猜中时仍 drawing，已猜中成员和画手全屏聊天都不重复猜词。
- 初轮脚本准备按钮定位错误（实际名称是“准备”）已纠正，只改测试。初轮不作为最终完整通过证据；最终单轮 31/31。
- 本地日志 `.cache/e2e-game-feedback-local.log`，截图 `.cache/tasks/result-modal/feedback-*.png`；测试脚本/日志/截图/数据库不提交。

## 发布与线上验证

- 功能提交：`edf1edc7d7b4a419b9033cd7bde017d9ba724237`。
- [GitHub CI](https://github.com/NornsInteractive/Idavoll/actions/runs/37887125606)：Success；92 单测、7 包 typecheck、web build 通过。
- Cloudflare Pages Production：`5326d42a-4ae4-4a04-81ba-18f8c4dd8e07`，对应功能提交，deploy/success；[生产站点](https://idavoll.pages.dev)。
- Pages 成功后由 Antigravity 使用现有 Wrangler `deploy --keep-vars` 发布 Worker；deployment `40aecf0e-1dd8-4271-b239-b4bd1a64e0c5`，version `cf9c0682-f6ed-4d6c-a1b1-510377777871`，100% 流量，健康端点正常。
- 未运行远端数据库迁移，已有 DO/D1/R2/KV 绑定不变。Secret 名称仍为 JWT_SECRET、TURN_SERVERS_JSON、TURN_KEY_ID、TURN_KEY_API_TOKEN；未写入或删除 Secrets，保留自有 coturn 和 Cloudflare TURN 备用。
- OpenCode 同一免费模型线上执行同一套真实三人 UI/WS 测试：31/31，57.7 秒，Node 退出码 0，模型步骤费用 0。默认昵称、随机按钮、50 条聊天与三个视口、提示/输入草稿/首字提示、普通聊天、答案保护和全屏角色行为全部通过。
- 线上困难候选为猪笼草/拔萝卜/杯弓蛇影，确认 Worker 实际使用扩充词库；客户端候选与答案的权限隔离正常。
- 线上测试保留 HTTPS/WSS 真实域名与证书校验，用 Cloudflare IPv4 host-resolver 规则避免本机 DNS 环境问题，未 mock API/WS/store。
- 线上日志 `.cache/e2e-game-feedback-production.log`，截图 `.cache/tasks/game-feedback-production/`。该报告后续归档提交只改文档，产品与已验证版本一致，不再次部署 Worker。

## 验证边界

手机为 Chromium 390×844 模拟视口，未测实体手机/Safari；未重复完整语音中继测试。浏览器需刷新才能加载本次前端，旧全屏页面发送聊天来猜词的旧行为已由新页面显式猜词取代。
