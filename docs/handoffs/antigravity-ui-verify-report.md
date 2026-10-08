# Antigravity UI & Visual Verification Report

## 1. 概述与交付成果

本次交付严格遵守用户关于“自主决定 UI 样式、布局、结构与响应式断点”的权责划分，对照 `/workspace/projects/idavoll/temp/stitch_idavoll` 视觉参考规范，彻底解决了两个核心 UI 交互与排版缺陷：
1. **外网字体缺失时图标连字泄露**：消除 Material Symbols 连字（Ligatures）退化为原始英文长单词（如 `delete_sweep`、`tips_and_updates`、`visibility` 等）导致的移动端重叠截断；
2. **画板顶部浮动 HUD 空白区域吞笔迹**：修复桌面与手机画板顶部浮动条容器 `pointer-events: auto` 覆盖可见画布区域、导致起笔在 `canvas + 40px` 时被空白容器拦截的问题。

所有修复均在真实双人联机生产环境 (`https://idavoll.pages.dev`) 上通过验证：
- **Git 最新 Commit**：`1039aa3` (`fix(ui): pass pointer-events through floating canvas HUD to prevent stroke interception`)
- **Cloudflare Pages 部署状态**：`Active` (生产环境已上线)
- **Pages 部署 ID**：`59328bc4-3832-4e62-8c8e-f98de8520793`
- **生产访问地址**：`https://idavoll.pages.dev`
- **预览访问地址**：`https://59328bc4.idavoll.pages.dev`

---

## 2. 核心 UI 问题诊断与修复明细

### 2.1 画板顶部浮层空白区域拦截画笔输入修复
- **缺陷现象（OpenCode 真实测得）**：
  桌面画手页测得 `hud@33,131 958x50 pointer=auto`，`canvas@112,141 800x600 overlapY=41px`。当画手在画布偏上方（如 `y = canvas + 40px`）起笔落笔时，`pointerdown` 事件被浮动 HUD 容器捕获并吞掉，导致本地 `ink = 0`，没有产生任何笔画，也无法广播给猜手。
- **根因分析**：
  在 [`InGameDrawerPage.tsx`](file:///workspace/projects/idavoll/apps/web/src/pages/InGameDrawerPage.tsx) 中：
  - 桌面端：`<div className="absolute top-3 left-4 right-4 flex items-center justify-between z-30 pointer-events-auto">`
  - 手机端：`<div className="absolute top-2.5 left-2.5 right-2.5 flex items-center justify-between pointer-events-auto z-30">`
  浮动条容器横向贯穿整个画布上方（宽达 958px），且声明了 `pointer-events-auto`。左侧“黄金触控区”状态胶囊与右侧编辑工具组（撤销/重做/清屏/全屏）之间存在大量空白区域，这些空白区域均拦截了鼠标与触控事件，阻断了向底层 `<canvas>` 的事件冒泡与传递。
- **最小且优雅的修复方案**：
  1. 将浮动 HUD 容器统一改为 `pointer-events-none`，让整个容器及其空白区域对鼠标/触控完全透明；
  2. 将左侧非交互状态标签设为 `pointer-events-none select-none`，避免遮挡画布边缘起笔；
  3. 将右侧真正需要交互的编辑按钮组卡片单独设为 `pointer-events-auto`，确保撤销、重做、清屏、全屏与房间交流按钮依然 100% 灵敏响应；
  4. 手机端与桌面端保持完全一致的透传策略，全屏模式与响应式无任何回归。

### 2.2 外网字体依赖消除与矢量 SVG 图标组件封装 (`AppIcon`)
- **根因分析**：
  此前页面通过 Google Fonts CDN 加载 Material Symbols Web Font。在受限网络环境或 DNS 隔离下，字体文件请求失败，基于 OpenType 连字（Ligatures）的图标直接回退为普通文本渲染（如将 `delete_sweep` 渲染为 12 个字母的英文单词），导致按钮宽度膨胀并造成移动端控件截断错位。
- **解决方案**：
  1. 创建了全项目通用的矢量 SVG 图标组件 [`AppIcon`](file:///workspace/projects/idavoll/apps/web/src/components/common/AppIcon.tsx)，内部基于已安装的 `lucide-react` 打包进前端产物中，实现**零网络请求、零外部字体依赖、100% 矢量保真**；
  2. 映射了全部 Material Symbols 图标名；
  3. 全面替换了 `InGameDrawerPage.tsx` 与 `InGameGuesserPage.tsx` 中的所有 `<span className="material-symbols-outlined">...</span>`；
  4. 在 `apps/web/src/index.css` 中保留兜底防御规则，确保任何情况下均不产生横向文本溢出。

### 2.3 测试角色判定与回合时序修正
- 所有角色专属视口（桌面 1440x900、全屏、手机 390x844、紧凑手机 360x780、平板 1024x768）的截图捕获全部前置在 **Round 1 对局进行中（角色互换前）** 统一完成；
- 在截图前增加 `page.url()` 动态强校验：断言 `pA` 必须严格匹配 `/\/game\/drawer/`，`pB` 必须严格匹配 `/\/game\/guesser/`；
- 严谨校正文档术语：将移动端画板笔触测试规范描述为“手机视口 pointer 模拟（桌面 Chromium 手机视口驱动）”，不夸大为物理硬件触控。

---

## 3. Playwright 生产双人联机 E2E 验证结果

### 3.1 专门针对 HUD 穿透与全项验证 (`agy-stitch-verify.mjs` - 49/49 PASS)

运行脚本：`node .cache/tasks/agy-stitch-verify.mjs`  
测试条件：开启网络拦截（`page.route` 中断所有字体请求），直连生产线上集群 `https://idavoll.pages.dev`。

```
=== 1. 房主建房 & 猜手加入 (Waiting Room)
  PASS 房主建房成功
  PASS 猜手加入同房
  PASS 双方 WebSocket 连接正常

=== 2. 准备 & 开局
  PASS 进入对局页面 (A=画手, B=猜题者)

=== 3. 选词流程
  .... 画手挑选词语: 长颈鹿 (候选项: 长颈鹿, 袋鼠, 海豚)
  PASS 画手页面显示真实所选题
  PASS 动态确认 pA 当前为画手页面
  PASS 动态确认 pB 当前为猜手页面

=== 4. 桌面视图 (1440x900) 视觉与交互验收
  .... 桌面画手截图: .cache/tasks/agy-drawer-desktop-1440x900.png
  .... 桌面猜手截图: .cache/tasks/agy-guesser-desktop-1440x900.png
  PASS 画手桌面可见画板存在
  PASS 画板坐标分辨率为 800x600
  PASS 画板在桌面维持 4:3 宽高比
  PASS 画手桌面画布顶部HUD容器 pointer-events 为 none
  PASS 画手桌面画布顶部编辑按钮组 pointer-events 为 auto
  PASS 起笔在顶部HUD空白覆盖区(y=canvas+40)成功绘制本地笔迹
  PASS 顶部HUD覆盖区笔迹成功广播到猜手端
  PASS 常规笔画持续同步到猜手 (draw:stroke)
  PASS 撤销按钮在 pointer-events-auto 下点击有效
  PASS 重做按钮在 pointer-events-auto 下点击有效
  PASS 清屏按钮在 pointer-events-auto 下点击有效
  PASS 首字提示按钮已触发
  PASS 画手桌面端语音模式可一键切换
  PASS 猜手桌面端语音模式可一键切换
  PASS 猜手桌面端可唤起语音与交流抽屉
  PASS 画手桌面端 页面无字体连字长单词泄露
  PASS 猜手桌面端 页面无字体连字长单词泄露

=== 5. 全屏模式 (Fullscreen) 视觉验收 (Round 1 真实角色状态)
  PASS 全屏前确认 pA 仍为画手
  PASS 全屏前确认 pB 仍为猜手
  PASS 画手全屏画板已截取

=== 6. 手机视口 (390x844) 响应式与触控区验收 (Round 1 真实角色状态)
  PASS 手机视口前确认 pA 仍为画手
  PASS 手机视口前确认 pB 仍为猜手
  .... 手机画手截图: .cache/tasks/agy-drawer-mobile-390x844.png
  .... 手机猜手截图: .cache/tasks/agy-guesser-mobile-390x844.png
  PASS 手机端画板顶部HUD容器 pointer-events 为 none
  PASS 手机端画板顶部按钮组 pointer-events 为 auto
  PASS 画手手机端 页面无字体连字长单词泄露
  PASS 猜手手机端 页面无字体连字长单词泄露
  PASS 手机画板可见且存在
  PASS 手机画板仍为 800x600 逻辑坐标
  PASS 手机画板仍保持 4:3 比例适应
  PASS 手机端画手页面无横向滚动溢出
  PASS 手机端猜手页面无横向滚动溢出
  PASS 手机端画手触控作画成功 (手机视口 pointer 模拟)

=== 7. 紧凑型手机 (360x780) & 平板 (1024x768) 验收
  PASS 窄屏前确认 pA 仍为画手
  PASS 窄屏前确认 pB 仍为猜手
  PASS 360x780 画手视口无横向溢出
  PASS 360x780 猜手视口无横向溢出
  PASS 1024x768 中等视口渲染成功

=== 8. 恢复桌面视口 (1440x900) & 猜手提交抢答 (Round 1 结算)
  PASS 猜手页面无虚假固定+100分数据
  PASS 猜手页面无游乐园旋转木马等假候选词
  PASS 猜手快捷互动 Pill 可点击
  PASS 猜手提交正确答案并获得正确反馈
  PASS 画手端显示真实猜中者横幅且包含昵称

=== 9. 验收全部完成

================ 汇总 ================
total=49 pass=49 fail=0
```

### 3.2 OpenCode 完整长对局与回归测试套件 (`e2e-game.mjs` - 56/56 PASS)

运行脚本：`node .cache/e2e-game.mjs`（4 回合完整对局、断线重连、战绩结算全覆盖）：

```
  .... DEFECT-REPRO(交AG, 仅记录): 桌面画手页画布顶部浮动HUD条拦截笔迹 | hud@33,131 958x50 pointer=none canvas@112,141 800x600 overlapY=41px | 起笔 y=canvas+40 -> A端ink=12
  .... 清屏后再作画 (避开HUD条): A端ink=25 B端ink=25
  PASS 清屏后再次作画 A 端重新渲染
  PASS 清屏后再次作画 B 端重新渲染
  ...
================ 汇总 ================
total=56 pass=56 fail=0
```
原 defect 记录显示：`pointer=none` 生效，`起笔 y=canvas+40 -> A端ink=12` 成功绘制，不再出现 `A端ink=0` 的吞笔迹现象！

---

## 4. 生产环境视觉验收截图清单

| 视口规格 | 角色 | 截图路径 | 视觉检查结果 |
| :--- | :--- | :--- | :--- |
| **390x844 手机** | **猜手 (Guesser)** | [`.cache/tasks/agy-guesser-mobile-390x844.png`](file:///workspace/projects/idavoll/.cache/tasks/agy-guesser-mobile-390x844.png) | 顶部栏矢量图标与字数卡槽居中整洁；输入框搜索与纸飞机图标对齐；底部按住说话 PTT、已连麦、实时积分榜等各行控件排布舒展，**零长单词泄露，零重叠截断**。 |
| **390x844 手机** | **画手 (Drawer)** | [`.cache/tasks/agy-drawer-mobile-390x844.png`](file:///workspace/projects/idavoll/.cache/tasks/agy-drawer-mobile-390x844.png) | 4:3 黄金触控画板；浮动撤销、重做、清屏、全屏矢量图标规整；底部调色盘与画笔/橡皮/粗细切换器完整展示；顶部浮层 pointer-events 为 none，全画板触控自由。 |
| **360x780 窄屏** | **猜手 (Guesser)** | [`.cache/tasks/agy-guesser-narrow-360x780.png`](file:///workspace/projects/idavoll/.cache/tasks/agy-guesser-narrow-360x780.png) | 360px 窄屏自适应，零水平滚动溢出；画手实时同步的蓝色笔触即时呈现在画板中。 |
| **360x780 窄屏** | **画手 (Drawer)** | [`.cache/tasks/agy-drawer-narrow-360x780.png`](file:///workspace/projects/idavoll/.cache/tasks/agy-drawer-narrow-360x780.png) | 紧凑屏幕下各按钮和取色器自动收缩适配，无水平溢出，成功完成笔画绘制。 |
| **1440x900 桌面** | **画手 (Drawer)** | [`.cache/tasks/agy-drawer-desktop-1440x900.png`](file:///workspace/projects/idavoll/.cache/tasks/agy-drawer-desktop-1440x900.png) | 经典 PlayHub 12 列流式布局；取色器、画笔、橡皮与撤销/重做对齐；画布顶部 HUD 条空白区不拦截作画输入；右侧展示真实在线人数（2/4 人在线）与积分榜。 |
| **1440x900 桌面** | **猜手 (Guesser)** | [`.cache/tasks/agy-guesser-desktop-1440x900.png`](file:///workspace/projects/idavoll/.cache/tasks/agy-guesser-desktop-1440x900.png) | 提示词卡槽、大画板、快捷反应弹幕 Pill 与右侧竞猜流完整呈现。 |
| **全屏模式** | **画手 (Drawer)** | [`.cache/tasks/agy-drawer-fullscreen.png`](file:///workspace/projects/idavoll/.cache/tasks/agy-drawer-fullscreen.png) | 画板最大化，黄金触控区浮标正常显示，全屏切换自如。 |
| **1024x768 平板** | **画手 & 猜手** | [`.cache/tasks/agy-drawer-tablet-1024x768.png`](file:///workspace/projects/idavoll/.cache/tasks/agy-drawer-tablet-1024x768.png) | 中等视口下自适应排版自然规整。 |
| **回合结算** | **画手端** | [`.cache/tasks/agy-drawer-guessed-desktop.png`](file:///workspace/projects/idavoll/.cache/tasks/agy-drawer-guessed-desktop.png) | 画板上方高亮庆祝横幅显示最新猜中者昵称与名次（`#1 ✓`）；结算弹窗显示真实获得的作画奖励积分。 |
| **抢答成功** | **猜手端** | [`.cache/tasks/agy-guesser-correct-desktop.png`](file:///workspace/projects/idavoll/.cache/tasks/agy-guesser-correct-desktop.png) | 动态五彩纸屑庆祝动效；弹窗明确显示真实获得积分（如 `+118 分`）；右侧积分榜实时打勾。 |
