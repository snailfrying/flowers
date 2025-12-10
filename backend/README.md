# Backend

<div align="center">

**AI workflow orchestration layer for Flowers**

[![TypeScript](https://img.shields.io/badge/TypeScript-5.6+-blue.svg)](https://www.typescriptlang.org/)
[![Node.js](https://img.shields.io/badge/Node.js-18+-green.svg)](https://nodejs.org/)

[🏠 Back to Main Project](../README.md)

</div>

---

## 📋 Table of Contents

- [Overview](#-overview)
- [Technology Stack](#-technology-stack)
- [Prerequisites](#-prerequisites)
- [Directory Structure](#-directory-structure)
- [Data Flow](#-data-flow)
- [Key Modules](#-key-modules)
- [Quick Start](#-quick-start)
- [Development](#-development)
- [Testing](#-testing)
- [Troubleshooting](#-troubleshooting)
- [Contributing](#-contributing)

---

## 🎯 Overview

The backend serves as the AI orchestration layer for Flowers, handling:

- **LLM Integration**: OpenAI-compatible API client with streaming support
- **RAG Pipeline**: Vector search and retrieval-augmented generation
- **Workflow Orchestration**: Modular agent nodes for translation, polishing, note generation
- **Data Persistence**: Local-first storage for notes, vectors, and settings
- **Prompt Management**: Template system with hot-reload capabilities

This backend runs entirely in the browser extension's service worker context, providing a local-first, privacy-focused AI experience.

---

## 🛠️ Technology Stack

| Technology | Purpose | Version |
|------------|---------|---------|
| **TypeScript** | Type-safe development | 5.6+ |
| **Dexie** | IndexedDB wrapper for local storage | 3.2+ |
| **hnswlib-wasm** | Vector similarity search (HNSW algorithm) | 0.1+ |
| **dotenv** | Environment configuration | 16.4+ |

**Architecture Pattern**: Modular agent-based workflow orchestration with provider-agnostic LLM clients.

---

## ✅ Prerequisites

Before you begin, ensure you have:

- **Node.js** >= 18.0.0 ([Download](https://nodejs.org/))
- **npm** >= 9.0.0 or **pnpm** >= 8.0.0
- **OpenAI-compatible API key** (OpenAI, Azure OpenAI, or local LLM server)
- Basic understanding of TypeScript and browser extension architecture

---

## 📂 Directory Structure

```
src/
├── agent/                  # Workflow orchestration
│   ├── index.ts           # Agent bootstrap
│   └── nodes/             # Business logic nodes
│       ├── chat.ts        # → Conversational interface
│       ├── translate.ts   # → Translation pipeline
│       ├── polish.ts      # → Text polishing
│       ├── generateNote.ts# → Note synthesis
│       ├── queryTransform.ts # → RAG query rewriting
│       └── synthesis.ts   # → Context blending

├── services/              # Core services
│   ├── llm/              # → LLM adapters (OpenAI, etc.)
│   ├── prompts/          # → Prompt templates & loader
│   ├── rag/              # → Vector search & retrieval
│   ├── i18n/             # → Backend localization
│   ├── message-handler.ts# → Request router
│   └── error-handler.ts  # → Error normalization

├── storage/              # Persistence layer
│   ├── notesStore.ts     # → Note CRUD
│   ├── vectorStore.ts    # → Embedding storage
│   ├── settings.ts       # → User preferences
│   └── syncService.ts    # → Multi-device sync

├── config/               # Configuration
│   ├── env.ts           # → Environment vars
│   ├── defaults.ts      # → System defaults
│   └── publicConfig.ts  # → Shared frontend config

├── utils/                # Utilities
│   ├── markdown.ts      # → Markdown processing
│   ├── llm-config.ts    # → Model routing
│   └── cache.ts         # → Caching layer

└── index.ts              # Main export
```

---

## 🔄 Data Flow

```
Frontend Request
      ↓
[message-handler] ──→ Route by type
      ↓
[agent/nodes/*]   ──→ Load prompt + context
      ↓
[services/llm]    ──→ Execute LLM call
      ↓
[storage/*]       ──→ Persist results
      ↓
Response ←─────────── Serialize & return
```

---

## ⚡ Key Modules

| Module | Purpose |
|--------|---------|
| **agent/nodes/** | Each file = one workflow (translate, polish, chat, etc.) |
| **services/prompts/** | Template registry with hot-reload support |
| **services/rag/** | Vector search + chunk ranking for RAG |
| **storage/** | Abstraction layer for notes, vectors, settings |
| **services/llm/** | Provider-agnostic LLM client (OpenAI-compatible) |

---

## 🚀 Quick Start

### 1. Install Dependencies

```bash
cd backend
npm install
```

### 2. Configure Environment

Create `env.yaml` in the backend directory:

```yaml
# Example configuration
llm:
  provider: openai
  apiKey: sk-your-api-key-here
  baseURL: https://api.openai.com/v1
  model: gpt-4-turbo-preview

rag:
  enabled: true
  embeddingModel: text-embedding-3-small
```

> **Note**: You can also use `.env` file. See `src/config/env.ts` for all available options.

### 3. Build

```bash
npm run build    # → Compile to dist/
```

The compiled output will be in `dist/` directory, which the frontend extension imports.

---

## 💻 Development

### Development Mode

```bash
npm run dev      # → Watch mode with auto-rebuild
```

This runs TypeScript compiler in watch mode. Changes will automatically recompile.

### Type Checking

```bash
npm run typecheck  # → Check types without emitting files
```

### Clean Build

```bash
npm run clean    # → Remove dist/ directory
npm run build    # → Fresh build
```

### Adding New Workflows

1. Create a new file in `src/agent/nodes/`, e.g., `summarize.ts`
2. Implement the workflow logic following existing patterns
3. Add corresponding prompt template in `src/services/prompts/templates/`
4. Register the workflow in `src/agent/index.ts`
5. Update message handler in `src/services/message-handler.ts`

---

## 🧪 Testing

```bash
# Type checking (recommended before commit)
npm run typecheck

# Clean and rebuild (verify no build errors)
npm run clean && npm run build
```

> **Note**: Unit tests are planned for future releases. Currently, type checking and build verification are the primary validation methods.

---

## 🔧 Troubleshooting

### Build Errors

**Problem**: `Cannot find module` errors during build

**Solution**: Ensure all dependencies are installed:

```bash
npm run clean
rm -rf node_modules package-lock.json
npm install
npm run build
```

### Type Errors

**Problem**: TypeScript errors in imported types

**Solution**: Run type checking to see detailed errors:

```bash
npm run typecheck
```

### Environment Configuration

**Problem**: API calls failing with authentication errors

**Solution**:

1. Verify `env.yaml` exists and contains valid API key
2. Check `baseURL` matches your LLM provider
3. Ensure the API key has proper permissions

### Frontend Integration Issues

**Problem**: Frontend cannot import backend types

**Solution**:

1. Ensure backend is built: `npm run build`
2. Check that `dist/` directory exists with `.d.ts` files
3. Verify frontend's `tsconfig.json` includes backend path

---

## 🤝 Contributing

We welcome contributions to the backend! Please see the main [Contributing Guide](../CONTRIBUTING.md) for general guidelines.

### Backend-Specific Guidelines

- **Code Style**: Follow existing TypeScript patterns
- **Modularity**: Keep agent nodes focused on single responsibilities
- **Type Safety**: Avoid `any` types; use proper type definitions
- **Documentation**: Add JSDoc comments for public APIs
- **Prompts**: Store all LLM prompts in `services/prompts/templates/`

### Development Workflow

1. Fork the repository
2. Create a feature branch: `git checkout -b feat/backend-feature`
3. Make your changes in `backend/src/`
4. Run type checking: `npm run typecheck`
5. Build and verify: `npm run build`
6. Commit with conventional commits: `git commit -m 'feat(backend): add new feature'`
7. Push and open a Pull Request

---

<div align="center">

**[⬆ Back to Top](#backend)** | **[📖 Main Documentation](../README.md)**

Made with 💜 by the Flowers Team

</div>
