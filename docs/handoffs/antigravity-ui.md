# Idavoll UI 接入交接

用户要求：所有 UI 工作均由 Antigravity 完成，复用名为 idavoll 的原会话 d711e253-e519-446f-b7b2-84903676fdf0；完成后由此会话推送 GitHub 并更新 Cloudflare，再交 OpenCode 免费模型验收。

用户最新明确分工优先于下文旧阶段说明：Codex只负责业务逻辑修复、接口约束和可复现的功能问题；UI样式、布局、界面结构、控件位置全部由agy原idavoll会话自行设计。后续任务只给功能验收条件，不由Codex规定UI设计。OpenCode免费模型仅负责测试、测试脚本与报告，禁止修复产品业务或UI。当前项目已发布，后续修复继续由agy提交推送和更新Cloudflare。

最新UI目标：用户要求你画我猜界面重新恢复 `temp/stitch_idavoll` 内HTML的样式与结构，并具备响应式布局。此要求优先于下文“保留现有设计”的旧说明；agy独立读取参考HTML/资源并设计实现，Codex只提供真实功能接口与行为验收条件。

当前阶段只实现 UI，暂不提交、推送或部署，等待 Codex 后续明确的发布任务。Codex 正在同步完善服务端、协议、services、stores；不要修改这些业务文件或后端、协议、依赖锁。你负责 apps/web/src/pages、components、routes.tsx、App.tsx、main.tsx、index.css 及 packages/ui 内的展示组件。保留 DESIGN.md 和现有设计、桌面/手机响应式结构，修复实际操作，不引入 UI 框架或新依赖。

## 已落地接口（Codex 负责，可据此接入）

apps/web/src/services/api.ts 导出：
- guestLogin(nickname, avatar) -> {user:{id,nickname,avatar},token}，然后 useUserStore.setUser({...user,token})。
- fetchProfile() -> {user,stats:{totalGames,wins,winRate,drawings,guesses,correctGuesses,accuracy}}，统计为累计统计。
- saveProfile(nickname,avatar) -> {user}，保存成功再 setUser(user)。fetchMatches() -> {matches}，fetchDrawings() -> {drawings}，fetchDrawing(id) -> {word,strokes,width:800,height:600}。只有本人可获取画作。
- fetchRooms() -> {rooms:[{roomId,roomCode,title,hostId,status,playerCount,maxPlayers,isPrivate}]}，仅返回可加入公开房。
- createRoom(settings) -> {roomId}。使用共享 RoomSettingsSchema 的字段，不要独立规定不一致的范围。公开房提交 password:undefined，私密密码 4–64 位。
- quickMatch() -> {roomId,roomCode,ticket}。connectRoom(roomId,undefined,ticket) 避免重复加入。
- fetchPresence() -> {onlineCount}，heartbeat() 每 25 秒保持在线。登录有效时启动、退出/未登录时清理。大厅房间与人数每 15 秒更新（用现有 TanStack Query）；无数据为空态。

apps/web/src/services/room-session.ts：
- await connectRoom(idOrCode,password?,initialTicket?) -> canonical roomId。第一次获取真实房号/身份/快照需要等 WebSocket room 变成非 null。创建后 connectRoom 返回的 id 导航 /room/:roomId。
- leaveRoom() 发真正退出并释放连接/语音；disconnectRoom() 仅关闭本地连接，不能用来替代用户退出；retryRoom() 手动恢复。路由切换 room/game/result 保持同一连接；刷新游戏页面可用 sessionStorage['idavoll-room-id'] 恢复。
- sendRoomAction(topic,payload) 仅供有必要的非现有 store 动作。

useRoomStore：room:null|RoomState、messages、danmakus、connectionState、error、voiceStatus、voiceError、isMuted、isDeafened、speakingUserIds、voiceMode。
- togglePlayerReady() 无参数，startGame()、restartGame()、sendMessage(content,isDanmaku?)、updateSettings(settings)、clearError()。
- 不要在页面 addMessage 构造假确认；真实消息由 socket 加入。
- room.status 为 waiting/playing/settlement。当前用户是否房主用 room.hostId === user.id。准备与开始等待服务端确认。

useGameStore：gameState:null|DrawAndGuessState、currentWord（仅画手）、isDrawer、canUndo、historyStrokes、guessResult:null|{correct,earned,timestamp}。
- addStroke(stroke)、undoStroke()、redoStroke()、clearStrokes()、selectWord(word)、submitGuess(guess)、rerollWord()、revealHint()、passTurn()。
- submitGuess 不返回正确与否；看服务端 guessResult 或 gameState.scores.hasGuessedCorrectly。每回合 turnIndex 变化后重置猜题动画状态。
- game.status: selecting_word/drawing/turn_ended/game_over；timeLeft 和 deadline 来自服务器。禁止本地倒计时结束直接跳结算。
- wordChoices 仅选词画手有；显示选词对话框/界面让画手从 options 中选，不造词。其他人展示等待画手选词。
- turnSummary.secretWord 仅回合结束公开；gamePodium 为真实结算。aborted=true 展示人数不足终止，不能庆祝虚构赢家。
- rerollsLeft/hintsLeft 为剩余次数，画手按钮按状态启用。猜中后换词服务端拒绝。revealHint 由服务端公布首字。

apps/web/src/services/voice.ts（Codex 正在实现，按此契约）：
- async toggleMute()、toggleDeafen()、setVoiceMode('open'|'hold')、setPushToTalk(boolean)、stopVoice()。
- 麦克风只在用户主动开麦时请求；语音连接成功后才展示已连接。voiceStatus/voiceError/真实 speakingUserIds 绑定 store。
- 按住说话需要 pointerdown 开、pointerup/pointercancel/失焦关；闭音必须实际禁用播放。

## 必须完成的页面行为

1. 登录接真实 API，错误不进入大厅。路由保护，持久化凭据失效回登录。主题/强调色/语言启动恢复真实偏好（主题 DOM 和 i18n 在 App/Layout 同步）。退出登录清理连接和身份。
2. 大厅真实房列表/在线人数、快速匹配、房号加入、私密密码输入和错误提示。所有加入路径一致；空房列表不造卡片。
3. 游戏库移除假评分，只将你画我猜标为可玩；其他游戏不可进入并明确未开放。游戏详情文案基于真实规则和 WordBank，不假称词数/玩家数。
4. 创建房间完整提交 settings，等待页显示真实玩家、真实房号和复制邀请链接；人数/在线/准备 gating。房主能修改真实设置；非房主无开始能力。
5. 房间/游戏/结算的自动视角由服务端状态和 drawerId 决定，所有 game route 共享一个路由层状态协调，避免各页竞争导航。未加入者返回大厅或恢复真实 room，不能 initDemo。
6. 画手/猜手/全屏绘画都用标准 800x600 坐标，画板保持 4:3 比例，手机/桌面同步。加入过程中加载态，实时笔迹同步；支持最少 onStrokeComplete，建议完整笔迹预览通过 onStrokeAppend 构造同一 id 的累计 DrawStroke（30Hz以内）并调用 addStroke。点数上限2048；必须让长笔画分段且每段独立 id。如需改变 DrawBoard 回调以发累计 stroke，你可实现 UI 的画板事件接线。
7. 删除所有假聊天、预制绘画、假猜词反馈、写死身份/答案/房号、硬编码领奖台、分数、语音状态/波形、历史示例及假在线/奖项。
8. 猜测、聊天、弹幕全部走服务器；正确判题动画只来自 guessResult；普通 UI 随机动画/头像候选/调色板/快捷短语不属于假数据。
9. 个人中心真实保存昵称/头像、累计统计、真实最近战绩及画作查看；没统计不能造等级、荣誉或猜中率，没画作展示空态。
10. 所有现有 UI 控件必须实际工作或依据真实状态禁用并明确原因。保留移动、桌面和全屏、中文/英文、明暗主题；完成网络失败、错误、权限拒绝、复制失败、重试反馈和键盘可访问性。

可自行删除大量演示 JSX，但避免无必要的视觉重做。完成返回文件列表、真实功能说明和剩余问题，禁止把未执行的测试或部署说成通过。Codex 汇合代码后会交 OpenCode 做验证，并把 UI 问题交回同一会话。
