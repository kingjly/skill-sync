# Skill Sync

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-blue.svg)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-18-61DAFB.svg)](https://reactjs.org/)
[![Fastify](https://img.shields.io/badge/Fastify-4.x-000000.svg)](https://fastify.io/)

**[中文文档](./README_CN.md)**

A modern web application for managing and synchronizing AI coding assistant skills across multiple tools. Centralize your skills repository and sync them to Claude Code, Cursor, Windsurf, Trae, and more.

## ✨ Features

- 🗂️ **Central Repository** - Manage all your AI coding skills in one place
- 🔄 **Multi-Tool Sync** - One-click sync to multiple AI coding assistants
- 🔗 **Symlink Support** - Efficient synchronization using symbolic links
- 👁️ **Skill Preview** - Markdown rendering with YAML frontmatter parsing
- 🔍 **Auto Detection** - Automatically detect installed AI coding tools
- 📦 **Batch Operations** - Import, sync, and delete skills in bulk
- 🎨 **Modern UI** - Clean, responsive interface with dark mode support

## 🛠️ Supported Tools

| Tool | Type | Status |
|------|------|:------:|
| [Claude Code](https://claude.ai/code) | CLI | ✅ |
| [Cursor](https://cursor.sh) | IDE | ✅ |
| [Windsurf](https://codeium.com/windsurf) | IDE | ✅ |
| [Trae](https://trae.ai) | IDE | ✅ |
| [Kiro](https://kiro.dev) | IDE | ✅ |
| [Gemini CLI](https://github.com/google-gemini/gemini-cli) | CLI | ✅ |
| [GitHub Copilot](https://github.com/features/copilot) | IDE/CLI | ✅ |
| [OpenAI Codex](https://github.com/openai/codex) | CLI | ✅ |
| [Cline](https://github.com/cline/cline) | VS Code Extension | ✅ |

## 🚀 Quick Start

### Prerequisites

- Node.js 18+
- npm or pnpm

### Installation

```bash
# Clone the repository
git clone https://github.com/your-username/skill-sync.git
cd skill-sync

# Install dependencies
npm install
```

### Development

```bash
# Start the backend server (port 3001)
npx tsx server/src/index.ts

# In another terminal, start the frontend (port 3000)
cd web && npm run dev
```

Visit `http://localhost:3000` to access the application.

### Production Build

```bash
npm run build
```

## 📁 Project Structure

```
skill-sync/
├── server/                 # Backend service (Fastify)
│   └── src/
│       ├── routes/         # API endpoints
│       ├── services/       # Business logic
│       └── types/          # TypeScript definitions
├── web/                    # Frontend application (React + Vite)
│   └── src/
│       ├── components/     # Reusable components
│       ├── pages/          # Page components
│       ├── lib/            # Utilities
│       └── store/          # State management
└── icons/                  # Tool icons
```

## 📡 API Reference

### Skills

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/skills` | List all skills |
| GET | `/api/skills/:id` | Get skill details |
| GET | `/api/skills/:id/preview` | Preview skill files |
| POST | `/api/skills/import` | Import skills to repository |
| POST | `/api/skills/delete` | Delete skills |

### Tools

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/tools` | List all supported tools |
| GET | `/api/tools/:id/skills` | Get tool's skills |
| POST | `/api/tools/:id/sync` | Sync skills to tool |
| POST | `/api/tools/:id/delete-skills` | Delete skills from tool |

### Configuration

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/config` | Get current config |
| PUT | `/api/config` | Update config |

## 📝 Skill Format

Each skill package should contain a `SKILL.md` file with YAML frontmatter:

```markdown
---
name: Skill Name
description: A brief description of what this skill does
---

# Skill Name

Detailed skill content here...
```

## 🎨 Tech Stack

- **Frontend**: React 18, TypeScript, Vite, Tailwind CSS, TanStack Query
- **Backend**: Fastify, TypeScript
- **Rendering**: react-markdown, remark-gfm, @tailwindcss/typography

## 🙏 Acknowledgments

- Tool icons from [lobe-icons](https://github.com/lobehub/lobe-icons)
- Kiro icon from [Awesome-IDEs](https://github.com/zeelsheladiya/Awesome-IDEs)

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
