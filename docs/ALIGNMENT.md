# ALIGNMENT - 需求对齐文档

## 1. 原始需求

### 问题陈述
AI 编码助手（Claude Code、Cursor、Windsurf、Trae 等）的 Skills 配置分散在各自目录中，难以统一管理。用户需要：
- 一处编写 skill，多处同步使用
- 自动检测已安装的 IDE/CLI 工具
- 归并已有的分散 skills
- 版本管理和历史回溯

### 目标用户
- 自己使用
- 开源到 GitHub 供他人使用

---

## 2. 边界确认

### 范围内（IN SCOPE）

| 功能 | 描述 |
|------|------|
| 元 Skill 仓库 | 用户目录下的统一 skill 存放位置 |
| 工具检测 | 自动检测系统已安装的 AI IDE/CLI |
| Skill 归并 | 首次使用时归并各工具已有的 skills |
| Symlink 同步 | 一键同步到各工具配置目录 |
| 启用/禁用 | 控制哪些 skill 同步到哪个工具 |
| 版本管理 | Git-based 版本控制，支持历史/回滚 |
| Web UI | 本地运行的 Web 界面管理 |

### 范围外（OUT OF SCOPE）

| 功能 | 原因 |
|------|------|
| 云同步 | 暂不考虑，纯本地应用 |
| 用户系统 | 纯本地，不需要登录 |
| Skill 市场 | 后续版本考虑 |
| 加密存储 | 暂不需要 |
| 团队协作 | 个人使用优先 |

---

## 3. 支持的工具列表

### GUI IDE

| 工具 | 全局路径 | 项目路径 | 检测方式 |
|------|----------|----------|----------|
| Kiro IDE | `~/.kiro/skills/` | `.kiro/skills/` | `~/.kiro/` 存在 |
| Cursor | `~/.cursor/skills/` | `.cursor/skills/` | `~/.cursor/` 存在 |
| VS Code Copilot | `~/.copilot/skills/` | `.github/skills/` | `code --version` |
| Windsurf | `~/.codeium/windsurf/skills/` | `.windsurf/skills/` | `~/.codeium/` 存在 |
| Antigravity | `~/.gemini/antigravity/skills/` | `.agent/skills/` | `~/.gemini/antigravity/` |
| Codebuddy | - | `.codebuddy/skills/` | `.codebuddy/` 存在 |
| Roo Code | `~/.roo/skills/` | `.roo/skills/` | `~/.roo/` 存在 |
| Qoder | `~/.qoder/skills/` | `.qoder/skills/` | `~/.qoder/` 存在 |
| Trae | `~/.trae/skills/` | `.trae/skills/` | `~/.trae/` 存在 |

### CLI 工具

| 工具 | 全局路径 | 项目路径 | 检测方式 |
|------|----------|----------|----------|
| Claude Code | `~/.claude/skills/` | `.claude/skills/` | `claude --version` |
| Gemini CLI | `~/.gemini/skills/` | `.gemini/skills/` | `gemini` 命令 |
| OpenAI Codex | `~/.agents/skills/` | `.agents/skills/` | `codex` 命令 |
| Factory Droid | `~/.factory/skills/` | `.factory/skills/` | `~/.factory/` 存在 |
| OpenCode | `~/.config/opencode/skills/` | `.opencode/skills/` | `opencode` 命令 |

---

## 4. 疑问澄清

### 已确认

1. **项目类型**: Web 应用 + 本地后端（非桌面应用）
2. **技术栈**: React + Vite + Tailwind CSS (前端) + Fastify + TypeScript (后端)
3. **同步方式**: 全局 skill 用 symlink，合并后的内容用 copy
4. **版本管理**: 基于 Git 的简单版本控制

### 需要用户确认

1. **合并策略**: `extend`（追加到末尾）是否够用？还是需要更复杂的插入逻辑？
   - **决策**: 先实现 `extend` 模式，后续按需扩展

2. **项目发现**: 手动添加项目路径 vs 自动扫描？
   - **决策**: 手动添加 + 保存历史记录

3. **项目级 skill 继承**: 是否需要支持项目级 skill 继承全局 skill？
   - **决策**: 暂不支持，保持简单。全局 skill 和项目 skill 独立管理

---

## 5. 非功能需求

| 需求 | 标准 |
|------|------|
| 性能 | 启动时间 < 3s，同步操作 < 1s |
| 兼容性 | Windows 10+ (优先), macOS, Linux |
| 易用性 | 单命令启动，浏览器访问 |
| 可维护性 | 代码清晰，模块化设计 |

---

## 6. 风险评估

| 风险 | 影响 | 缓解措施 |
|------|------|----------|
| 各工具配置格式差异 | 中 | 统一使用 SKILL.md 格式，工具兼容自己处理 |
| Windows symlink 权限 | 中 | 检测权限，降级为 copy |
| 工具更新导致路径变化 | 低 | 配置可更新，社区贡献 |

---

## 7. 成功标准

1. ✅ 能够检测到系统已安装的 AI 工具
2. ✅ 能够创建/编辑/删除 skill
3. ✅ 能够一键同步 skill 到选定的工具
4. ✅ 首次使用时能够归并已有的 skills
5. ✅ 能够查看 skill 的版本历史
6. ✅ 单命令启动整个应用
