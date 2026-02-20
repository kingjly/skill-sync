# Skill Sync

一个用于管理和同步 AI 编程工具 Skills 的 Web 应用。支持将中央仓库的 Skills 同步到多个 AI 编程助手工具。

## 支持的工具

| 工具 | 类型 | 状态 |
|------|------|------|
| Claude Code | CLI | ✅ |
| Cursor | IDE | ✅ |
| Windsurf | IDE | ✅ |
| Trae | IDE | ✅ |
| Kiro | IDE | ✅ |
| Gemini CLI | CLI | ✅ |
| GitHub Copilot | IDE/CLI | ✅ |
| OpenAI Codex | CLI | ✅ |
| Cline | VS Code Extension | ✅ |

## 功能特性

- **中央仓库管理**: 统一管理所有 Skills
- **多工具同步**: 一键将 Skills 同步到多个 AI 编程工具
- **符号链接支持**: 使用 symlink 方式同步，节省磁盘空间
- **Skill 预览**: 支持 Markdown 渲染预览，自动解析 SKILL.md 元信息
- **工具检测**: 自动检测已安装的 AI 编程工具
- **批量操作**: 支持批量导入、同步、删除

## 技术栈

- **前端**: React 18 + TypeScript + Vite + Tailwind CSS + TanStack Query
- **后端**: Fastify + TypeScript
- **渲染**: react-markdown + remark-gfm + @tailwindcss/typography

## 快速开始

### 安装依赖

```bash
npm install
```

### 启动开发服务器

```bash
# 启动后端 (端口 3001)
npx tsx server/src/index.ts

# 启动前端 (端口 3000)
cd web && npm run dev
```

### 构建生产版本

```bash
npm run build
```

## 项目结构

```
skill-sync/
├── server/                 # 后端服务
│   └── src/
│       ├── routes/         # API 路由
│       ├── services/       # 业务逻辑
│       └── types/          # 类型定义
├── web/                    # 前端应用
│   └── src/
│       ├── components/     # 公共组件
│       ├── pages/          # 页面组件
│       ├── lib/            # 工具库
│       └── store/          # 状态管理
└── icons/                  # 工具图标
```

## API 接口

### Skills

- `GET /api/skills` - 获取所有 Skills 列表
- `GET /api/skills/:id` - 获取单个 Skill 详情
- `GET /api/skills/:id/preview` - 获取 Skill 文件内容（用于预览）
- `POST /api/skills/import` - 导入 Skills 到中央仓库
- `POST /api/skills/delete` - 删除 Skills

### Tools

- `GET /api/tools` - 获取所有工具列表
- `GET /api/tools/:id/skills` - 获取工具的 Skills 列表
- `POST /api/tools/:id/sync` - 同步 Skills 到工具
- `POST /api/tools/:id/delete-skills` - 删除工具中的 Skills

### Config

- `GET /api/config` - 获取配置
- `PUT /api/config` - 更新配置

## Skill 规范

每个 Skill 包应该包含 `SKILL.md` 文件，格式如下：

```markdown
---
name: Skill Name
description: Skill description
---

# Skill Content

...
```

## 图标来源

工具图标来自 [lobe-icons](https://github.com/lobehub/lobe-icons) 项目。

## License

MIT
