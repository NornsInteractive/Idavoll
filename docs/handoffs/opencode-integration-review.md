# 集成测试脚本复查

请先读最新源文件修正脚本本身的假设，不降低业务断言：

- 私密房创建者已经是成员，重新取票不需要密码；用全新第三用户验证无密码403。
- 初始和重连猜手应使用可重新赋值的 `let guesser`，不能在同一作用域重复 `const guesser`。
- `waitFor`返回`{frame,index}`；如果已经取`.frame`就不能再用`.index`或`.frame`。发送之前记录frames.length，再等事件。
- heartbeat只更新在线统计，不强制broadcast room；通过ready_toggle并收到state_sync确认重连后可双向通信，避免要求服务端增加无用广播。
- 聊天外层网络帧payload是ChatMessage；消息分类和内容在`f.payload.payload.type/content`；外层`f.payload.type`固定chat:message。
- 私密房新成员ticket仅保留30秒，测试跨房ticket要在生成后立即测，或明确只是无效ticket不能证明跨房隔离。
- 中途重连测试应接受当前仍合法的服务器阶段（turn_ended/selecting_word取决真实耗时），不能声称错误阶段bug；如果已轮换必须随当前role选择guess/draw。
- 如果要求回合中反复猜中测试，三玩家能保证首位猜中后仍drawing；两人首猜即turn_ended，重复提交应断言分数不变而不要求仍guess_result。
- 不记录生产token/ticket/ICE凭据，即使请求失败也输出状态和error字段，不能直接dump guest对象或join文本。

Codex补的2项连接回归测试已通过；当前全部58项单元测试通过，非UI类型检查通过。你仍须完成真实Worker集成，不能用这些结果替代联网验收。
