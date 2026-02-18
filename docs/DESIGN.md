# DESIGN - 系统设计文档

## 1. 技术栈

### 主要语言
**TypeScript 5.3+**

### 运行时
**Node.js 20 LTS**

### 前端
| 技术 | 版本 | 用途 |
|------|------|------|
| React | 18.2 | UI 框架 |
| Vite | 5.0 | 构建工具 |
| Tailwind CSS | 3.4 | 样式框架 |
| React Router | 6.20 | 路由管理 |
| Zustand | 4.4 | 状态管理 |
| React Query | 5.8 | 数据获取 |
| Lucide React | 0.294 | 图标库 |

### 后端
| 技术 | 版本 | 用途 |
|------|------|------|
| Fastify | 4.24 | Web 框架 |
| fastify-static | 6.12 | 静态文件服务 |
| simple-git | 3.21 | Git 操作 |
| uuid | 9.0 | ID 生成 |
| chokidar | 3.5 | 文件监听 |

### 开发工具
| 工具 | 用途 |
|------|------|
| ESLint 8 | 代码检查 |
| Prettier 3 | 代码格式化 |
| TypeScript ESLint | TS 代码规则 |
| concurrently | 并行启动 |

---

## 2. 系统架构

### 整体架构图

```mermaid
graph TB
    subgraph "Browser"
        UI[React UI]
    end
    
    subgraph "Node.js Process"
        subgraph "Frontend Dev Server :3000"
            Vite[Vite HMR]
        end
        subgraph "Backend API :3001"
            Fastify[Fastify Server]
            Routes[API Routes]
            Services[Core Services]
        end
    end
    
    subgraph "File System"
        SyncDir[~/.skill-sync/]
        SkillsDir[skills/]
        ConfigFile[config.json]
        HistoryDir[history/]
        ToolDirs[AI Tool Directories]
    end
    
    UI --> Vite
    UI -->|API Calls| Fastify
    Fastify --> Routes
    Routes --> Services
    Services --> SyncDir
    Services --> SkillsDir
    Services --> ConfigFile
    Services --> HistoryDir
    Services -->|Symlink/Copy| ToolDirs
```

### 分层设计

```mermaid
graph LR
    subgraph "Presentation Layer"
        Pages[Pages]
        Components[Components]
        Hooks[Hooks]
    end
    
    subgraph "API Layer"
        Routes[Routes]
        Validators[Validators]
    end
    
    subgraph "Service Layer"
        SkillRepo[SkillRepo]
        SyncService[SyncService]
        DetectorService[DetectorService]
        VersionService[VersionService]
    end
    
    subgraph "Data Layer"
        FileSystem[File System]
        GitRepo[Git Repository]
    end
    
    Pages --> Components
    Components --> Hooks
    Hooks -->|HTTP| Routes
    Routes --> Validators
    Routes --> Services
    SkillRepo --> FileSystem
    SyncService --> FileSystem
    VersionService --> GitRepo
    DetectorService --> FileSystem
```

---

## 3. 核心模块设计

### 3.1 工具检测器 (Detector)

```mermaid
classDiagram
    class BaseDetector {
        <<abstract>>
        +id: string
        +name: string
        +type: cli|ide
        +globalPath: string
        +projectPath: string
        +detect(): Promise~DetectorResult~
        #checkCommand(cmd: string): Promise~boolean~
        #checkPath(path: string): Promise~boolean~
    }
    
    class ClaudeCodeDetector {
        +id: "claude-code"
        +detect(): Promise~DetectorResult~
    }
    
    class CursorDetector {
        +id: "cursor"
        +detect(): Promise~DetectorResult~
    }
    
    class TraeDetector {
        +id: "trae"
        +detect(): Promise~DetectorResult~
    }
    
    BaseDetector <|-- ClaudeCodeDetector
    BaseDetector <|-- CursorDetector
    BaseDetector <|-- TraeDetector
```

### 3.2 Skill 仓库服务 (SkillRepo)

```mermaid
classDiagram
    class SkillRepo {
        -skillsPath: string
        +list(): Promise~Skill[]~
        +get(id: string): Promise~Skill~
        +create(data: CreateSkillDTO): Promise~Skill~
        +update(id: string, data: UpdateSkillDTO): Promise~Skill~
        +delete(id: string): Promise~void~
        +scanFromTool(tool: Tool): Promise~Skill[]~
    }
```

### 3.3 同步服务 (SyncService)

```mermaid
classDiagram
    class SyncService {
        -skillRepo: SkillRepo
        -config: Config
        +sync(skillId: string, toolId: string): Promise~SyncResult~
        +unsync(skillId: string, toolId: string): Promise~void~
        +syncAll(): Promise~SyncResult[]~
        +getSyncStatus(skillId: string): Promise~SyncStatus[]~
        -createSymlink(src: string, dest: string): Promise~void~
        -copyFile(src: string, dest: string): Promise~void~
    }
```

### 3.4 版本管理服务 (VersionService)

```mermaid
classDiagram
    class VersionService {
        -git: SimpleGit
        -historyPath: string
        +init(): Promise~void~
        +commit(skillId: string, message: string): Promise~void~
        +getHistory(skillId: string): Promise~Version[]~
        +rollback(skillId: string, version: string): Promise~void~
    }
```

---

## 4. 数据流向

### 4.1 首次归并流程

```mermaid
sequenceDiagram
    participant U as User
    participant UI as React UI
    participant API as API Server
    participant D as DetectorService
    participant R as SkillRepo
    participant M as MergeService
    participant FS as FileSystem
    
    U->>UI: 启动应用
    UI->>API: POST /api/tools/detect
    API->>D: detectAll()
    D->>FS: 检查各工具路径
    FS-->>D: 路径存在性
    D-->>API: 已安装工具列表
    API-->>UI: 工具列表
    
    UI->>API: GET /api/merge/scan
    API->>M: scanExistingSkills()
    M->>FS: 扫描各工具 skills 目录
    FS-->>M: 已有 skills
    M->>M: 检测重复/冲突
    M-->>API: 扫描结果
    API-->>UI: 归并预览
    
    U->>UI: 确认归并策略
    UI->>API: POST /api/merge/execute
    API->>M: executeMerge(strategy)
    M->>R: 复制 skills 到元仓库
    R->>FS: 写入文件
    M-->>API: 归并结果
    API-->>UI: 完成
```

### 4.2 同步流程

```mermaid
sequenceDiagram
    participant U as User
    participant UI as React UI
    participant API as API Server
    participant S as SyncService
    participant R as SkillRepo
    participant FS as FileSystem
    
    U->>UI: 选择 skill 和目标工具
    UI->>API: POST /api/sync/execute
    API->>S: sync(skillId, toolId)
    S->>R: get(skillId)
    R-->>S: Skill 数据
    S->>FS: 检查目标路径
    FS-->>S: 路径状态
    alt 使用 Symlink
        S->>FS: 创建符号链接
    else 使用 Copy
        S->>FS: 复制文件
    end
    S->>FS: 更新同步状态
    S-->>API: 同步结果
    API-->>UI: 成功/失败
```

---

## 5. 接口契约

### 5.1 工具检测接口

```typescript
interface DetectorResult {
  toolId: string;
  isInstalled: boolean;
  installedPath?: string;
  version?: string;
}

interface IDetector {
  id: string;
  name: string;
  type: 'cli' | 'ide';
  globalPath: string;
  projectPath: string;
  detect(): Promise<DetectorResult>;
}
```

### 5.2 Skill 接口

```typescript
interface Skill {
  id: string;
  name: string;
  content: string;
  description?: string;
  tags?: string[];
  source: {
    type: 'created' | 'imported' | 'merged';
    originalTools?: string[];
  };
  syncStatus: SyncStatus[];
  version: number;
  createdAt: string;
  updatedAt: string;
}

interface CreateSkillDTO {
  name: string;
  content: string;
  description?: string;
  tags?: string[];
}

interface UpdateSkillDTO {
  name?: string;
  content?: string;
  description?: string;
  tags?: string[];
}
```

### 5.3 同步接口

```typescript
interface SyncRequest {
  skillIds: string[];
  toolIds: string[];
  method?: 'symlink' | 'copy';
}

interface SyncResult {
  skillId: string;
  toolId: string;
  success: boolean;
  method: 'symlink' | 'copy';
  targetPath: string;
  error?: string;
}

interface SyncStatus {
  skillId: string;
  toolId: string;
  enabled: boolean;
  method: 'symlink' | 'copy' | 'none';
  lastSynced?: string;
  targetPath: string;
}
```

---

## 6. 异常处理策略

### 6.1 错误类型

| 错误码 | 类型 | 描述 | 处理方式 |
|--------|------|------|----------|
| E001 | SkillNotFound | Skill 不存在 | 返回 404 |
| E002 | ToolNotInstalled | 工具未安装 | 返回 400，提示安装 |
| E003 | SyncFailed | 同步失败 | 返回 500，记录日志 |
| E004 | PermissionDenied | 权限不足 | 返回 403，提示管理员权限 |
| E005 | PathExists | 目标路径已存在 | 返回 409，询问覆盖 |
| E006 | GitError | Git 操作失败 | 返回 500，降级处理 |

### 6.2 错误处理流程

```mermaid
flowchart TD
    A[API 请求] --> B{参数验证}
    B -->|失败| C[返回 400]
    B -->|成功| D[执行业务逻辑]
    D --> E{执行结果}
    E -->|成功| F[返回 200]
    E -->|业务错误| G{错误类型}
    G -->|NotFound| H[返回 404]
    G -->|Permission| I[返回 403]
    G -->|Conflict| J[返回 409]
    G -->|其他| K[返回 500 + 日志]
```

---

## 7. 安全考虑

### 7.1 本地安全

| 风险 | 措施 |
|------|------|
| 路径遍历 | 验证所有路径在允许范围内 |
| 文件覆盖 | 同步前检查目标存在性 |
| 敏感信息 | 不存储密钥，只管理 skill 文件 |

### 7.2 API 安全

| 风险 | 措施 |
|------|------|
| 只监听本地 | 绑定 127.0.0.1，不暴露外网 |
| 输入验证 | 所有输入经过 schema 验证 |
| 错误信息 | 不暴露系统路径等敏感信息 |

---

## 8. 性能考虑

### 8.1 启动优化

- 前端 Vite 开发模式：按需编译
- 后端 Fastify：快速启动，延迟加载检测器
- 并行初始化：工具检测并行执行

### 8.2 运行时优化

- Skill 列表缓存：内存缓存 + 文件监听刷新
- 增量同步：只同步变更的 skill
- 懒加载：版本历史按需加载

---

## 9. UI 组件设计

### 9.1 页面结构

```
App
├── Layout
│   ├── Header
│   │   ├── Logo
│   │   ├── NavTabs
│   │   └── Actions (检测工具, 设置)
│   └── Main
│       ├── Dashboard (首页概览)
│       ├── Skills (Skill 管理)
│       ├── Tools (工具管理)
│       └── Settings (设置)
```

### 9.2 核心组件

| 组件 | 用途 | Props |
|------|------|-------|
| SkillCard | 展示单个 skill | skill, onEdit, onDelete, onSync |
| ToolCard | 展示单个工具 | tool, skillCount, onSync |
| SyncDialog | 同步选择对话框 | skills, tools, onConfirm |
| MergeDialog | 归并对话框 | conflicts, onResolve |
| SkillEditor | Skill 编辑器 | content, onChange, onSave |

---

## 10. 文件格式规范

### 10.1 Skill 目录结构

```
~/.skill-sync/skills/
├── code-review/
│   ├── SKILL.md          # 必需：skill 内容
│   └── meta.json         # 元数据（自动生成）
├── security-audit/
│   ├── SKILL.md
│   └── meta.json
└── ...
```

### 10.2 meta.json 格式

```json
{
  "id": "uuid-v4",
  "name": "code-review",
  "description": "代码审查 skill",
  "tags": ["review", "code"],
  "source": {
    "type": "created",
    "originalTools": []
  },
  "version": 1,
  "createdAt": "2024-01-01T00:00:00.000Z",
  "updatedAt": "2024-01-01T00:00:00.000Z"
}
```

### 10.3 config.json 格式

```json
{
  "version": "1.0.0",
  "skillsPath": "~/.skill-sync/skills/",
  "syncConfig": {
    "defaultMethod": "symlink"
  },
  "lastDetectedTools": []
}
```

---

## 11. 测试策略

### 11.1 单元测试

| 模块 | 测试重点 |
|------|----------|
| Detectors | 各检测器的检测逻辑 |
| SkillRepo | CRUD 操作 |
| SyncService | 同步逻辑，symlink/copy |
| VersionService | Git 操作封装 |

### 11.2 集成测试

| 场景 | 测试重点 |
|------|----------|
| 首次归并 | 扫描 → 冲突检测 → 归并 |
| 同步流程 | 选择 → 预览 → 执行 |
| 版本回滚 | 提交 → 历史 → 回滚 |

### 11.3 E2E 测试（可选）

| 场景 | 验证点 |
|------|--------|
| 完整流程 | 启动 → 归并 → 同步 → 验证文件 |
