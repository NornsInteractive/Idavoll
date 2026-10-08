# UI 审查补充（在原会话修复）

Codex 只审查，不替代 UI 编辑。首次实现结束后请处理这些已发现问题，并检查所有调用处。

1. 游戏drawer/guesser仍有roomCode||'84920'等假数据兜底；没有真实room/game请显示加载/恢复/失败态。删除固定字数4/时间60的状态兜底，仅使用真实状态；等待选词可以用明确文字。大厅onlineCount??1也不能当真实人数，缺数据用加载/不可用（不是捏造0）。i18n详情rating仍有4.9/12.8k假评价，删除未使用假文案，src/i18n允许由你修改。
2. fullscreen handleSendDanmaku 同时submitGuess和sendMessage，导致双提交、重复猜测统计和正确后报泄露答案。只发送一次sendMessage(trimmed,true)，服务端聊天会判题；或只submitGuess，但不可两个都发。
3. InGameChatDrawer必须补齐players/isMuted/onToggleMute等必需props；闭音和voiceMode不能只useState切换，要受控props绑定services/voice真实动作。在packages/ui组件里通过props，不导入web的业务store。清掉组件默认房号/画手/轮数和任何样本历史。发送quick phrase/emoji允许正常常量，但不要样本聊天/波形。
4. private invite /room/:roomId 新朋友直接访问时，RoomWaitingPage不能403后直接跳大厅丢失邀请码：展示密码输入，重试connectRoom(roomId,password)，并展示错误密码。404/410/断线显示原因和恢复/回大厅。已登录用户进入别的room URL时必须核验room.roomId是否匹配路由，不显示旧房间。
5. GameRouteCoordinator和RoomWaitingPage避免双重恢复竞争。Codex connectRoom已对相同identifier pending请求去重、不同请求取消。Coordinator只在room/game路线协调，普通profile/lobby不应被后台旧房间强制跳回游戏；结果页应能滚动，不使用绘画页的overflow-hidden剪掉榜单和再来一局。
6. Waiting canStart必须同时要求online、ready和connectionState connected；当前仅看isHost||ready，会允许离线玩家时点击并被服务端拒绝。设置保存须等待room:state_sync确认或显示服务器错误，不能关闭弹窗假装已成功。
7. DrawBoard canvas w-full/h-full/object-contain 会有CSS letterbox，pointer rect对应外框不是实际像素显示区域；请保证实际canvas盒子4:3并适配父容器剩余宽高，画布居中，指针映射使用实际可见canvas矩形。坐标须clamp到0..width/height，pointer capture移出边界不能产生负点导致整个stroke拒绝。画手权限仅status drawing时开启，selection/review/loading不可绘画。
8. DrawBoard pointerup同时onStrokeUpdate和onStrokeComplete，页面两者都addStroke，重复最终提交。保留live updates与最终一次提交，callback接线不要重复。
9. guesser的slots拿wordHint[index]，服务器wordHint是“首字：苹”这样的文案，不能显示成「首」「字」等答案位置；可独立展示hint文字，字数slots保持空白。
10. fullscreen也要处理selecting_word/turn_ended状态，不然画手在选词时刷新fullscreen无选词控件；退出全屏按当前drawerId路由，不用navigate(-1)回到旧身份路由。
11. 网络/401 logout必须清理，Codex已增加身份订阅断开房间；恢复后按当前server状态跳转。所有关键操作加入disabled与错误提示，不可无条件标成功。
12. 合成测试数据只保留tests，生产不留假胜者、昵称、成绩、波形/“很接近”等没有服务端依据的反馈。服务端词库共22项，难度hard只有2词；不声明固定3个备选，按wordChoices数组实际显示。

修复后执行全量类型检查以捕捉props/接口错误，提供改动与未验证项。最终联网、浏览器和语音验收交OpenCode免费模型。
13. ProfilePage.saveProfile/fetchDrawing 的 catch 当前静默吞错，必须显示错误并可重试。TanStack Query 的 profile/matches/drawings key 带 userId（或登出明确清空cache），否则同一浏览器切换游客后60秒内显示上一个身份的统计/战绩/画作。登录成功与完成结算后应刷新相应个人查询。
14. 初次直达/login现在脱离Layout：确保主题/语言偏好也在App全局初始化，不能只在Layout里生效。用户切换英文后新页面关键标题/控件仍硬编码中文，需补入现有i18n，不只语言选择按钮变化。
# 复查补充

- ProfilePage 当前把 API 已经返回的0..100百分比再乘100，会显示10000%；winRate/accuracy直接toFixed(1)。所有profile/history/drawings queryKey都必须含userId，logout/new identity清理缓存。保存/预览请求失败必须显式展示错误；加载/请求失败不能冒充“暂无记录”。
- DrawBoard 当前 `aspect-[4/3] w-full h-full` 同时指定宽高，aspect-ratio不会约束，仍然拉伸；必须根据容器实际尺寸计算 fit width=min(containerWidth,containerHeight*4/3)、height=width*3/4，用 ResizeObserver 或等效真正letterbox。不能用 object-contain 并按整个canvas rect映射坐标。canDraw变false时取消活动笔画与pointer capture，防止下一回合残留绘画。只传onStrokeUpdate时pointerup仍需发最终stroke；传complete时只发complete一次。
- RoomWaitingPage连接成功后用connectRoom返回的真实UUID规范化URL（replace），包括密码重试。直接访问`/room/六位房号`时不能拿UUID和房号反复比较导致断开/加入循环；只在URL确实切换到另一房间时切换。
