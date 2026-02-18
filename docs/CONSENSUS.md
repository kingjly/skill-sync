# CONSENSUS - 需求共识文档

## 1. 项目概述

### 项目名称
**Skill Sync** - AI 编码工具 Skills 统一管理器

### 一句话描述
一个本地 Web 应用，统一管理多个 AI 编码工具的 Skills，通过 symlink 实现一处编写、多处同步。

### 核心价值
- **单一来源**: 元仓库作为 skill 的唯一真相来源
- **自动检测**: 自动识别已安装的 AI 工具
- **一键同步**: 勾选 skill 和目标工具，一键同步
- **无损归并**: 首次使用时智能归并已有 skills

---

## 2. 技术方案

### 技术栈

```
前端: React 18 + Vite 5 + Tailwind CSS 3
后端: Fastify 4 + TypeScript 5
版本管理: simple-git
启动方式: 单一 npm start 同时启动前后端
```

### 架构概览

```
┌─────────────────────────────────────────────────────────┐
│                    Browser (localhost:3000)             │
│  ┌─────────────────────────────────────────────────┐   │
│  │              React Frontend                      │   │
│  │  ┌──────────┐ ┌──────────┐ ┌──────────┐        │   │
│  │  │Dashboard │ │ Skills   │ │ Tools    │        │   │
│  │  └──────────┘ └──────────┘ └──────────┘        │   │
│  └─────────────────────────────────────────────────┘   │
└────────────────────────┬────────────────────────────────┘
                         │ HTTP API
┌────────────────────────▼────────────────────────────────┐
│                  Fastify Backend (:3001)                │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐       │
│  │ Detectors   │ │ SkillRepo   │ │ SyncService │       │
│  └─────────────┘ └─────────────┘ └─────────────┘       │
└────────────────────────┬────────────────────────────────┘
                         │ File System
┌────────────────────────▼────────────────────────────────┐
│                    ~/.skill-sync/                       │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐       │
│  │ skills/     │ │ config.json │ │ history/    │       │
│  └─────────────┘ └─────────────┘ └─────────────┘       │
└─────────────────────────────────────────────────────────┘
                         │ Symlink/Copy
┌────────────────────────▼────────────────────────────────┐
│              AI Tools Skills Directories                │
│  ~/.claude/skills/  ~/.cursor/skills/  ~/.trae/skills/  │
└─────────────────────────────────────────────────────────┘
```

---

## 3. 数据模型

### Tool (工具)

```typescript
interface Tool {
  id: string;              // 'claude-code'
  name: string;            // 'Claude Code'
  type: 'cli' | 'ide';
  globalPath: string;      // '~/.claude/skills/'
  projectPath: string;     // '.claude/skills/'
  detectMethods: {
    command?: string;      // 'claude --version'
    pathExists?: string;   // '~/.claude/'
  };
  isInstalled: boolean;
  installedPath?: string;
}
```

### Skill

```typescript
interface Skill {
  id: string;
  name: string;
  content: string;         // SKILL.md 内容
  description?: string;
  tags?: string[];
  source: {
    type: 'created' | 'imported' | 'merged';
    originalTools?: string[];
  };
  syncStatus: SyncStatus[];
  version: number;
  createdAt: Date;
  updatedAt: Date;
}

interface SyncStatus {
  toolId: string;
  syncedAt?: Date;
  method: 'symlink' | 'copy' | 'none';
  enabled: boolean;
}
```

### 配置文件

```typescript
// ~/.skill-sync/config.json
interface Config {
  version: string;
  skillsPath: string;      // 默认 ~/.skill-sync/skills/
  syncConfig: {
    defaultMethod: 'symlink' | 'copy';
  };
  tools: Tool[];
}

// ~/.skill-sync/sync-status.json
interface SyncState {
  skills: {
    [skillId: string]: {
      [toolId: string]: {
        enabled: boolean;
        method: 'symlink' | 'copy';
        lastSynced?: string;
      };
    };
  };
}
```

---

## 4. 目录结构

```
skill-sync/
├── server/                    # 后端服务
│   ├── index.ts              # 入口
│   ├── detectors/            # 工具检测器
│   │   ├── base.ts           # 基类
│   │   ├── claude-code.ts
│   │   ├── cursor.ts
│   │   ├── windsurf.ts
│   │   ├── trae.ts
│   │   └── index.ts          # 检测器注册
│   ├── services/
│   │   ├── skill-repo.ts     # Skill 仓库管理
│   │   ├── sync.ts           # Symlink 同步
│   │   ├── detector.ts       # 工具检测服务
│   │   └── version.ts        # 版本管理
│   └── routes/
│       ├── skills.ts
│       ├── tools.ts
│       ├── sync.ts
│       └── merge.ts
├── web/                       # 前端
│   ├── src/
│   │   ├── pages/
│   │   │   ├── Dashboard.tsx
│   │   │   ├── Skills.tsx
│   │   │   ├── Tools.tsx
│   │   │   └── Settings.tsx
│   │   ├── components/
│   │   │   ├── SkillCard.tsx
│   │   │   ├── ToolCard.tsx
│   │   │   ├── SyncDialog.tsx
│   │   │   └── MergeDialog.tsx
│   │   ├── hooks/
│   │   ├── api/
│   │   └── App.tsx
│   ├── index.html
│   ├── vite.config.ts
│   └── package.json
├── scripts/
│   └── quality-check.ps1
├── docs/
│   ├── ALIGNMENT.md
│   ├── CONSENSUS.md
│   ├── DESIGN.md
│   ├── TASK.md
│   ├── ACCEPTANCE.md
│   ├── SETUP.md
│   └── FINAL.md
├── package.json
├── tsconfig.json
├── .eslintrc.js
├── .prettierrc.json
└── .gitignore
```

---

## 5. API 设计

### 工具相关

| Method | Path | 描述 |
|--------|------|------|
| GET | `/api/tools` | 获取所有支持的工具定义 |
| POST | `/api/tools/detect` | 检测已安装的工具 |
| GET | `/api/tools/installed` | 获取已安装工具列表 |

### Skill 相关

| Method | Path | 描述 |
|--------|------|------|
| GET | `/api/skills` | 获取元仓库所有 skill |
| GET | `/api/skills/:id` | 获取单个 skill 详情 |
| POST | `/api/skills` | 创建 skill |
| PUT | `/api/skills/:id` | 更新 skill |
| DELETE | `/api/skills/:id` | 删除 skill |

### 归并相关

| Method | Path | 描述 |
|--------|------|------|
| GET | `/api/merge/scan` | 扫描各 IDE 已有 skills |
| POST | `/api/merge/preview` | 预览归并结果（冲突检测） |
| POST | `/api/merge/execute` | 执行归并 |

### 同步相关

| Method | Path | 描述 |
|--------|------|------|
| GET | `/api/sync/status` | 获取同步状态 |
| POST | `/api/sync/preview` | 预览同步操作 |
| POST | `/api/sync/execute` | 执行同步 |
| POST | `/api/sync/skill/:id` | 同步单个 skill |

### 版本相关

| Method | Path | 描述 |
|--------|------|------|
| GET | `/api/skills/:id/versions` | 获取版本历史 |
| POST | `/api/skills/:id/rollback/:v` | 回滚到指定版本 |

---

## 6. 核心流程

### 首次使用流程

```
1. 启动应用
   ↓
2. 检测已安装工具
   ↓
3. 扫描各工具已有 skills
   ↓
4. 展示归并预览（冲突检测）
   ↓
5. 用户确认归并策略
   ↓
6. 执行归并到元仓库
   ↓
7. 进入主界面
```

### 日常使用流程

```
1. 启动应用
   ↓
2. 查看已安装工具和 skill 状态
   ↓
3. 创建/编辑 skill
   ↓
4. 选择目标工具
   ↓
5. 执行同步
   ↓
6. 查看同步结果
```

---

## 7. 验收标准

### 功能验收

- [ ] 能够检测到至少 10 种 AI 工具
- [ ] 能够创建、编辑、删除 skill
- [ ] 能够同步 skill 到至少 5 种工具
- [ ] 首次使用时能够归并已有 skills
- [ ] 能够查看 skill 版本历史
- [ ] 能够回滚到历史版本

### 非功能验收

- [ ] 启动时间 < 3 秒
- [ ] 同步操作 < 1 秒
- [ ] 单命令启动 (`npm start`)
- [ ] 浏览器访问 UI

### 质量验收

- [ ] 代码圈复杂度 < 10
- [ ] 单文件行数 < 500
- [ ] 嵌套层级 ≤ 3
- [ ] Lint 检查通过

---

## 8. 里程碑

| 阶段 | 内容 | 交付物 |
|------|------|--------|
| M1 | 项目骨架 + 工具检测 | 可检测已安装工具 |
| M2 | Skill 仓库 CRUD | 可管理 skills |
| M3 | 归并功能 | 首次使用可归并 |
| M4 | 同步功能 | 可同步到工具 |
| M5 | 前端 UI | 完整 Web 界面 |
| M6 | 版本管理 | 历史和回滚 |
| M7 | 打包优化 | 一键启动 |
