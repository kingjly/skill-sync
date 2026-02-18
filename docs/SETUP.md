# SETUP - 环境配置文档

## 系统要求

| 要求 | 版本 |
|------|------|
| Node.js | >= 20.0.0 |
| npm | >= 10.0.0 |
| Git | >= 2.0.0 |
| 操作系统 | Windows 10+, macOS 10.15+, Linux |

## 快速开始

### 1. 克隆项目

```powershell
git clone https://github.com/your-username/skill-sync.git
cd skill-sync
```

### 2. 安装依赖

```powershell
npm install
```

### 3. 启动开发服务器

```powershell
npm run dev
```

访问 http://localhost:3000 打开应用。

## 项目结构

```
skill-sync/
├── server/                 # 后端服务 (Fastify)
│   ├── src/
│   │   ├── index.ts       # 入口
│   │   ├── app.ts         # 应用配置
│   │   ├── detectors/     # 工具检测器
│   │   ├── services/      # 业务服务
│   │   └── routes/        # API 路由
│   └── package.json
├── web/                    # 前端 (React + Vite)
│   ├── src/
│   │   ├── App.tsx
│   │   ├── pages/
│   │   ├── components/
│   │   └── ...
│   └── package.json
├── docs/                   # 文档
├── scripts/                # 脚本
├── package.json            # Monorepo 根配置
└── tsconfig.base.json      # 共享 TS 配置
```

## 可用脚本

### 根目录

| 命令 | 描述 |
|------|------|
| `npm run dev` | 同时启动前后端开发服务器 |
| `npm run start` | 启动生产服务器 |
| `npm run build` | 构建前后端 |
| `npm run lint` | 运行 ESLint 检查 |
| `npm run lint:fix` | 自动修复 ESLint 问题 |
| `npm run format` | 格式化代码 |
| `npm run quality` | 运行完整质量检查 |
| `npm run quality:fix` | 运行质量检查并自动修复 |
| `npm run typecheck` | TypeScript 类型检查 |

### 后端 (server/)

| 命令 | 描述 |
|------|------|
| `npm run dev` | 启动开发服务器 (热重载) |
| `npm run start` | 启动生产服务器 |
| `npm run build` | 编译 TypeScript |
| `npm run typecheck` | 类型检查 |

### 前端 (web/)

| 命令 | 描述 |
|------|------|
| `npm run dev` | 启动 Vite 开发服务器 |
| `npm run build` | 构建生产版本 |
| `npm run preview` | 预览生产构建 |

## Lint 配置

### ESLint

配置文件: `.eslintrc.js`

**质量规则**:
- 圈复杂度 < 10
- 文件行数 < 500
- 嵌套深度 ≤ 3
- 函数长度 < 50 行
- 参数数量 ≤ 5

**排除目录**:
- `node_modules/`
- `dist/`
- `build/`
- `docs/`
- `scripts/`

### Prettier

配置文件: `.prettierrc.json`

**格式化规则**:
- 分号: 是
- 引号: 单引号
- 缩进: 2 空格
- 行宽: 100 字符

## 质量检查

运行质量检查脚本:

```powershell
.\scripts\quality-check.ps1
```

带自动修复:

```powershell
.\scripts\quality-check.ps1 -Fix
```

## 环境变量

暂不需要环境变量配置。

## 端口

| 服务 | 端口 |
|------|------|
| 前端 (Vite) | 3000 |
| 后端 (Fastify) | 3001 |

## 数据存储

应用数据存储在用户目录:

```
~/.skill-sync/
├── skills/              # Skill 仓库
│   ├── skill-name/
│   │   ├── SKILL.md
│   │   └── meta.json
├── config.json          # 配置
├── sync-status.json     # 同步状态
└── history/             # 版本历史
```

## 常见问题

### Q: Windows 上 symlink 失败?

A: Windows 创建符号链接需要管理员权限。应用会自动检测并降级为复制模式。

### Q: 端口被占用?

A: 修改 `server/src/index.ts` 和 `web/vite.config.ts` 中的端口配置。

### Q: 依赖安装失败?

A: 尝试删除 `node_modules` 目录和 `package-lock.json`，然后重新运行 `npm install`。
