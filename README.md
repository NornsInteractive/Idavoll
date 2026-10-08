# 🎨 Idavoll (PlayHub)

> **次世代多人派对社交游戏平台 · 你画我猜 (Draw & Guess)**
> 基于 Google Stitch 设计令牌、Anti-Slop 前端工程规范 (`taste-skill`)、Cloudflare Workers 实时房间引擎打造的跨平台多端全栈应用。

---

## 🌟 核心特色与架构

### 1. 客户端 (Client)
- **核心框架:** React 19 + TypeScript + Vite
- **UI & 样式:** Tailwind CSS + Radix UI (shadcn/ui 体系) + Stitch 设计系统原生 CSS 变量
- **动画动效:** Framer Motion (Snappy Spring Physics, 触感微交互)
- **多语言 (i18n):** `i18next` 深度支持简体中文 (`zh-CN`) 与英文 (`en`) 实时切换
- **主题与换色:** 支持暗色/亮色模式切换，以及 5 款高质感主题强调色（活力紫、暖珊瑚、薄荷绿、明媚橙、电波紫）实时切换
- **画板引擎:** 原生 Canvas 2D + `perfect-freehand` 自然压感算法笔触，支持笔刷尺寸、多调色板、橡皮擦、撤销与清空
- **可复用聊天体系:** 通用聊天组件 `ChatWindow`、全屏弹幕引擎 `DanmakuOverlay`、多玩家语音状态指示 `VoiceDock`，各游戏无缝复用
- **状态管理与数据:** Zustand (持久化玩家状态与本地房间模拟) + TanStack Query

### 2. 服务端 (Cloudflare Workers)
- **Web 框架:** Hono + Hono Router
- **实时房间底座:** Cloudflare Durable Objects (SQLite 后端) + WebSocket Hibernation
- **回合计时:** Durable Object Alarms + Cron Triggers
- **鉴权与加密:** Web Crypto HS256 JWT
- **存储与数据库:** D1 (Drizzle ORM) + R2 (画作与资源存储) + KV (功能开关)

### 3. 多端构建支持 (Multi-Platform)
- **桌面端 (Desktop):** Tauri (`src-tauri/tauri.conf.json`)，支持 Windows、macOS 与 Linux
- **移动端 (Mobile):** Capacitor (`capacitor.config.ts`)，支持 iOS 与 Android 打包

---

## 🖼️ 13 界面全量复刻列表 (Stitch Screens)

| # | 界面名称 | 路由 | 核心特性 |
|---|---|---|---|
| 1 | **启动与登录** | `/login` | 游客极速登录、个性化卡通头像挑选、随机昵称生成器 |
| 2 | **大厅首页** | `/lobby` | 实时在线玩家计数、新赛季宣传横幅、快速匹配、输入房间号直达、热门游戏精选 |
| 3 | **游戏库** | `/games` | 聚会/绘画/桌游多分类 Tab 过滤、游戏详情跳转、搜索过滤 |
| 4 | **游戏详情 (你画我猜)** | `/games/draw-and-guess` | 规则详解、多轮计分玩法介绍、词库范围展示、即刻开局入口 |
| 5 | **创建房间** | `/create-room` | React Hook Form + Zod 校验，支持房间名、作画时间(45/60/90s)、玩家数、私密密码设定 |
| 6 | **房间等待页** | `/room/:roomId` | 8/12人座席网格、房主徽标、准备状态指示、一键复制房号与邀请码、通用语音与聊天对接 |
| 7 | **游戏内：猜题者视角 (移动端)** | `/game/guesser` | 实时同步观摩画板、字数与分类提示、抢答输入框与秒级校验、彩带粒子结算 |
| 8 | **游戏内：沉浸大画板与全屏弹幕** | `/game/fullscreen` | 无边界全屏画板、浮动发射弹幕栏、全屏飞行动画、极简倒计时 HUD |
| 9 | **游戏内侧边聊天与语音** | 全局内置抽屉/侧栏 | 语音开麦/闭麦/波形反馈、快捷表情气泡、正确答案系统全场高亮通知 |
| 10 | **游戏内：画手视角 (桌面端)** | `/game/drawer` | 题目保密展示、压感画笔、调色盘、橡皮擦、撤销/清空、实时积分榜与语音栏分栏并排 |
| 11 | **游戏内：猜题者视角 (桌面端)** | `/game/guesser` | 桌面端宽屏分栏布局，左侧排行榜，中间画板，右侧持久化聊天猜词流 |
| 12 | **游戏结算页** | `/game/result` | 领奖台 (冠亚季军 1/2/3)、MVP 玩家卡片、单局精彩数据、彩带特效、再来一局/回大厅 |
| 13 | **个人中心** | `/profile` | 玩家头像与昵称修改、段位徽章、战绩统计、主题模式与主题色切换器、语言切换 |

---

## 📂 Monorepo 项目结构

```text
idavoll/
├── apps/
│   ├── web/                    # React 19 + Vite 客户端
│   │   ├── src/pages/          # 13 个全量复刻界面
│   │   ├── src-tauri/          # Tauri 桌面端配置
│   │   └── capacitor.config.ts # Capacitor 移动端配置
│   └── server/                 # Cloudflare Workers + Hono + Durable Objects
├── packages/
│   ├── protocol/               # Zod 协议与版本控制 (v1)
│   ├── game-sdk/               # GameModule, RoomHost, Transport, AIProvider 抽象
│   ├── client-core/            # 框架无关网络管理、断线重连、序号去重、状态机
│   ├── games/
│   │   └── draw-and-guess/     # 你画我猜规则引擎、词库字典、计分器
│   └── ui/                     # 通用组件库、Canvas 画板、ChatWindow、弹幕、主题
├── tests/                      # Vitest 单元测试
└── DESIGN.md                   # 依据 taste-skill 与 Stitch 导出的语义设计文档
```

---

## 🚀 启动与开发

```bash
# 安装依赖
pnpm install

# 运行单元测试
pnpm test

# 启动 Web 端开发服务器
pnpm --filter @idavoll/web dev

# 构建 Web 端
pnpm --filter @idavoll/web build
```
