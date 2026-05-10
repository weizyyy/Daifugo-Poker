# 大富豪扑克 (Daifugo Poker)

一款支持 3~9 人的实时多人 Web 卡牌游戏，还原日本大富豪（大富豪 / Dai-Fu-Gou）扑克玩法。

## 技术栈

- **后端**: Node.js + TypeScript + Socket.IO + Express
- **前端**: React + Vite + TailwindCSS + Socket.IO Client
- **架构**: monorepo (npm workspaces)

## 游戏特色

- 3~9 人同局，根据人数自动配置牌堆（1~2 副牌 + Joker）
- 完整的大富豪规则：革命、大革命、11 革命、8 切牌、阶梯，花色锁定等
- 9 种身份等级：教皇、皇帝、大富豪、富豪、平民、贫民、大贫民、奴隶、家畜
- 基于 Socket.IO 的实时房间系统，支持断线重连
- SPA 单页应用，响应式 UI

## 快速开始

### 环境要求

- Node.js >= 18
- npm >= 9

### 本地开发

```bash
# 克隆项目
git clone <repo-url>
cd poke

# 安装依赖
npm install

# 配置环境变量
cp client/.env.example client/.env

# 同时启动前后端
npm run dev
```

前端默认运行在 `http://localhost:5173`，后端运行在 `http://localhost:3001`。

### 生产构建

```bash
# 构建前端
npm run build

# 启动后端
npm start
```

构建后的前端静态文件位于 `client/dist/`，可用 Nginx 等 Web 服务器托管。

## 项目结构

```
├── client/                 # 前端 (React + Vite)
│   ├── src/
│   │   ├── components/     # UI 组件
│   │   ├── hooks/          # 自定义 hooks (Socket.IO)
│   │   ├── App.jsx         # 应用入口
│   │   ├── constants.js    # 游戏常量
│   │   └── index.css       # Tailwind 样式
│   └── .env.example        # 环境变量示例
├── server/                 # 后端 (Node.js + TypeScript)
│   ├── src/
│   │   ├── index.ts        # 服务器入口
│   │   ├── socket.ts       # Socket.IO 事件处理
│   │   ├── roomManager.ts  # 房间管理
│   │   ├── gameState.ts    # 游戏状态管理
│   │   ├── deck.ts         # 牌堆逻辑
│   │   ├── types.ts        # TypeScript 类型定义
│   │   └── validators.ts   # 出牌规则验证
│   └── .env.example        # 环境变量示例
├── game_rules.md           # 详细游戏规则文档
└── package.json            # monorepo 根配置
```

## 环境变量

### 前端 (`client/.env`)

| 变量 | 说明 | 默认值 |
|------|------|--------|
| `VITE_SOCKET_URL` | 后端 Socket.IO 地址 | `http://localhost:3001` |

### 后端 (`server/.env`)

| 变量 | 说明 | 默认值 |
|------|------|--------|
| `PORT` | 后端服务端口 | `3001` |
| `ALLOWED_ORIGINS` | CORS 允许的域名（逗号分隔） | `http://localhost:5173` |

## 游戏命令 (Socket.IO 事件)

| 事件 | 说明 |
|------|------|
| `createRoom` | 创建房间 |
| `joinRoom` | 加入房间 |
| `leaveRoom` | 离开房间 |
| `getRoomList` | 获取房间列表 |
| `startGame` | 开始游戏 |
| `playCards` | 出牌 |
| `pass` | 过牌 |
| `startNewRound` | 开始新一轮 |

## 协议

[MIT License](LICENSE)
