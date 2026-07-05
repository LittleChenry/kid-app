# 宝贝乐园 - Kid App

儿童电视站、书法练习、算术学习的 Web 应用（PWA），
运行在家庭 Linux 服务器上，通过 SMB 挂载 NAS 视频目录作为内容源。

## 技术栈

| 层 | 技术 |
|---|---|
| 前端 | React 18 + TypeScript + Vite + Tailwind CSS + Zustand |
| API 服务器 | NestJS + Prisma + SQLite |
| 媒体服务器 | Express + FFmpeg (HLS 转码/直播代理) |
| 包管理 | pnpm monorepo |
| 移动端 | PWA (manifest + service worker + iOS standalone) |
| 手写识别 | 离线模板匹配 (像素 F1-score + 宽高比) |
| NAS | SMB mount (mount.cifs) + FFmpeg H.264 实时转码 |

## 目录结构

```
kid-app/
├── packages/
│   ├── frontend/        # React SPA (Vite + Tailwind)
│   ├── api-server/      # NestJS API (Prisma + SQLite)
│   ├── media-server/    # 媒体服务 (FFmpeg 转码/直播代理)
│   └── shared/          # 共享 TypeScript 类型
├── scripts/             # 服务管理 & 格式转换脚本
├── deploy/              # Docker 构建配置
├── docker-compose.yml   # Docker Compose (前端 + API)
└── pnpm-workspace.yaml  # Monorepo 配置
```

## 功能

### 电视站
- NAS 视频目录浏览器（面包屑导航 + 列表/网格切换）
- MP4/MOV 直接流式播放（支持 range request 拖拽）
- MKV → H.264 实时转码（libx264 + AAC）
- HLS 直播频道代理（卡酷少儿、金鹰卡通、湖南卫视、浙江卫视）

### 书法练习
- Canvas 手写板 + 离线汉字识别（模板匹配）

### 算术
- 加减法题目 + 手写识别答案输入

### PWA
- iOS 独立模式（`apple-touch-icon`、`black-translucent` 状态栏）
- `display_override: standalone`
- iOS safe area 适配

## 快速开始

### 前置条件

- Node.js >= 20
- pnpm >= 9
- FFmpeg（含 ffprobe）
- NAS 挂载点（可选，用于视频服务）

### 安装 & 启动

```bash
# 安装依赖
pnpm install

# 初始化数据库
pnpm --filter @kid-app/api-server exec prisma generate
pnpm --filter @kid-app/api-server exec prisma db push

# 启动开发服务器（前端 + API + 媒体服务）
pnpm dev
```

### 启动后访问

- 前端：http://localhost:3000
- API 服务：http://localhost:4000
- 媒体服务：http://localhost:4001

### NAS 挂载（可选）

编辑 `packages/media-server/scripts/mount-nas.sh`，配置你的 NAS 地址和凭据，然后执行：

```bash
cd packages/media-server && ./scripts/mount-nas.sh
```

## 生产部署

```bash
# 编译
pnpm build

# 启动
cd packages/api-server && node dist/main.js &
cd packages/media-server && node dist/index.js &
cd packages/frontend && npx vite --host 0.0.0.0 --port 3000 &
```

或使用 Docker：

```bash
docker-compose up -d
```

## 视频格式转换

NAS 上的 MKV/AVI 等格式可批量转码为 MP4：

```bash
# 预览
./scripts/convert-to-mp4.sh --dry-run

# 执行转换（后台运行）
nohup ./scripts/convert-to-mp4.sh > convert.log 2>&1 &
```
