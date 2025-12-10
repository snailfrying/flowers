# Frontend

<div align="center">

**Browser extension UI for Flowers**

[![React](https://img.shields.io/badge/React-18+-61DAFB.svg)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.6+-blue.svg)](https://www.typescriptlang.org/)
[![Vite](https://img.shields.io/badge/Vite-5+-646CFF.svg)](https://vitejs.dev/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-3+-38B2AC.svg)](https://tailwindcss.com/)

[🏠 Back to Main Project](../README.md)

</div>

---

## 📋 Table of Contents

- [Overview](#-overview)
- [Technology Stack](#-technology-stack)
- [Prerequisites](#-prerequisites)
- [Directory Structure](#-directory-structure)
- [Data Flow](#-data-flow)
- [Key Features](#-key-features)
- [Component Map](#-component-map)
- [Quick Start](#-quick-start)
- [Development](#-development)
- [Extension Manifest](#-extension-manifest)
- [Testing](#-testing)
- [Troubleshooting](#-troubleshooting)
- [Contributing](#-contributing)

---

## 🎯 Overview

The frontend is a Chrome/Edge browser extension built with modern web technologies, providing:

- **Selection Popover**: In-page AI tools triggered by text selection
- **Side Panel Workspace**: Full-featured interface for chat, notes, and settings
- **Service Worker**: Background script for API bridging and event handling
- **Local-First Architecture**: All data stored in browser IndexedDB
- **Internationalization**: Full i18n support (English & Chinese)

Built with Vite + React + TypeScript + Tailwind CSS for optimal developer experience and performance.

---

## 🛠️ Technology Stack

### Core Framework

| Technology | Purpose | Version |
|------------|---------|---------|
| **React** | UI framework | 18.2+ |
| **TypeScript** | Type-safe development | 5.6+ |
| **Vite** | Build tool & dev server | 5.1+ |
| **Tailwind CSS** | Utility-first styling | 3.4+ |

### State & Data Management

| Technology | Purpose |
|------------|---------|
| **Zustand** | Global state management |
| **TanStack Query** | Async state & caching |
| **Dexie** | IndexedDB wrapper (via backend) |

### UI Components

| Technology | Purpose |
|------------|---------|
| **Radix UI** | Headless accessible components |
| **Lucide React** | Icon library |
| **React Markdown** | Markdown rendering |
| **React Syntax Highlighter** | Code syntax highlighting |

### Internationalization

| Technology | Purpose |
|------------|---------|
| **i18next** | i18n framework |
| **react-i18next** | React bindings |

---

## ✅ Prerequisites

Before you begin, ensure you have:

- **Node.js** >= 18.0.0 ([Download](https://nodejs.org/))
- **npm** >= 9.0.0 or **pnpm** >= 8.0.0
- **Chrome** or **Edge** browser (Manifest V3 support)
- **Backend built**: Run `cd backend && npm run build` first

> **Important**: The frontend imports types from `backend/dist/`, so ensure the backend is built before starting frontend development.

---

## 📂 Directory Structure

```
src/
├── background/            # Service Worker
│   └── service-worker.ts # → Extension event handler

├── content/              # Content Scripts
│   ├── content-script.ts # → Selection detection
│   └── content-script.css# → Injected styles

├── popup/                # Toolbar Popup
│   ├── popup.tsx        # → Quick actions UI
│   └── popup.html       # → Entry HTML

├── sidepanel/            # Side Panel Workspace
│   ├── sidepanel.tsx    # → Main workspace app
│   └── sidepanel.html   # → Panel entry

├── components/           # React Components
│   ├── chat/           # → Chat interface
│   ├── notes/          # → Note management
│   ├── settings/       # → Config panels
│   ├── popover/        # → Selection popover
│   ├── layout/         # → App shells
│   ├── common/         # → Shared widgets
│   └── ui/             # → Base UI primitives

├── shared/              # Cross-surface shared code
│   ├── api/            # → Backend API clients
│   ├── store/          # → Global state (Zustand)
│   ├── hooks/          # → Reusable hooks
│   ├── i18n/           # → Localization
│   ├── types/          # → Type definitions
│   └── utils/          # → Helper functions

├── styles/              # Global styles
│   └── globals.css     # → Tailwind + custom CSS

└── manifest.json        # Extension manifest
```

---

## 🔄 Data Flow

```
User Action (selection, click)
      ↓
[content-script] ──→ Detect & send message
      ↓
[service-worker] ──→ Call backend API via shared/api/
      ↓
[shared/store]   ──→ Update global state
      ↓
[components/*]   ──→ Re-render UI
      ↓
Display Result ←────── Stream/static response
```

---

## ⚡ Key Features

| Surface | Components | Purpose |
|---------|-----------|---------|
| **Content Script** | `SelectionPopover` | In-page translation/polish tooltip |
| **Side Panel** | `ChatPage`, `NotesPage`, `SettingsPage` | Full workspace for chat, notes, config |
| **Popup** | Quick actions | Fast access shortcuts |
| **Background** | Service Worker | API bridge, event handling, permissions |

---

## 🎨 Component Map

```
components/
├── chat/          → ChatPage, ChatInput, ChatMessage, ModelTypeSelector
├── notes/         → NotesPage, NoteEditor, NoteCard, VirtualizedNotesList
├── settings/      → SettingsPage, ModelConfig, PromptManagement
├── popover/       → SelectionPopover, ActionButtons, ResultDisplay
├── layout/        → MainLayout, SidepanelLayout
├── common/        → Loading, EmptyState, ErrorBoundary, Toaster
└── ui/            → button, input, dialog, tabs, etc. (shadcn/ui-style)
```

---

## 🚀 Quick Start

### 1. Install Dependencies

```bash
cd frontend
npm install
```

### 2. Build for Production

```bash
npm run build    # → Build to dist/
```

The extension will be built to `dist/` directory.

### 3. Load Extension in Browser

1. Open `chrome://extensions/` (or `edge://extensions/`)
2. Enable **"Developer mode"** (toggle in top-right)
3. Click **"Load unpacked"**
4. Select the `frontend/dist/` directory

### 4. Verify Installation

- Extension icon should appear in toolbar
- Click icon to open side panel
- Try selecting text on any webpage to see the popover

---

## � Development

### Development Mode with HMR

```bash
npm run dev      # → Dev server with Hot Module Replacement
```

**How HMR works in extensions**:

- Vite dev server runs on `http://localhost:5173`
- Changes to React components hot-reload instantly
- Content script and service worker require manual extension reload

### Reload Extension After Changes

After modifying content scripts or service worker:

1. Go to `chrome://extensions/`
2. Click the **refresh icon** on the Flowers extension card
3. Reload the webpage to see content script changes

> **Tip**: Use the [Extension Reloader](https://chromewebstore.google.com/detail/extensions-reloader/fimgfedafeadlieiabdeeaodndnlbhid) extension to speed up this process.

### Type Checking

```bash
npm run typecheck  # → Check types without building
```

### Preview Production Build

```bash
npm run preview   # → Preview production build locally
```

### Project Structure Best Practices

- **API calls**: Use `src/shared/api/*` clients (typed, error-handled)
- **State**: Keep in `src/shared/store/*` (Zustand slices)
- **Styling**: Tailwind utilities + `globals.css` for overrides
- **New features**: Add routes in `shared/router.tsx`, components in `components/`
- **Localization**: Edit `src/shared/i18n/locales/*.json`

---

## 🔧 Extension Manifest

| Key | Value |
|-----|-------|
| **manifest_version** | 3 |
| **background** | `service-worker.js` |
| **content_scripts** | `content-script.js` + CSS |
| **side_panel** | `sidepanel.html` |
| **action.default_popup** | `popup.html` |

**Permissions**:

- `storage`: Local data persistence
- `sidePanel`: Side panel API
- `activeTab`: Access current tab content
- `scripting`: Inject content scripts

---

## 🧪 Testing

```bash
# Type checking (recommended before commit)
npm run typecheck

# Build verification
npm run build

# Test extension loading
# 1. Build the extension
# 2. Load in browser
# 3. Test all features manually
```

> **Note**: Automated testing framework is planned for future releases. Currently, type checking and manual testing are the primary validation methods.

---

## 🔧 Troubleshooting

### Extension Not Loading

**Problem**: "Manifest file is missing or unreadable"

**Solution**:

```bash
npm run build
# Ensure dist/ directory exists with manifest.json
```

### Content Script Not Injecting

**Problem**: Selection popover doesn't appear

**Solution**:

1. Check browser console for errors
2. Verify content script is listed in `chrome://extensions/` → Details → Content scripts
3. Reload the extension and refresh the webpage
4. Check that the website allows content scripts (some sites block extensions)

### Service Worker Errors

**Problem**: API calls failing or background script not responding

**Solution**:

1. Open `chrome://extensions/`
2. Click "Inspect views: service worker" under Flowers extension
3. Check console for errors
4. Verify backend is built and types are available

### Build Errors

**Problem**: `Cannot find module` from backend

**Solution**:

```bash
# Build backend first
cd ../backend
npm run build

# Then build frontend
cd ../frontend
npm run build
```

### HMR Not Working

**Problem**: Changes not reflecting in dev mode

**Solution**:

1. Ensure dev server is running: `npm run dev`
2. For content script changes: reload extension manually
3. For React component changes: should hot-reload automatically
4. Check browser console for HMR errors

### Styling Issues

**Problem**: Tailwind classes not applying

**Solution**:

1. Verify `tailwind.config.js` includes all content paths
2. Check `globals.css` is imported in entry files
3. Rebuild: `npm run build`

### Chrome API Errors

**Problem**: `chrome.* is undefined`

**Solution**:

- Chrome APIs only work in extension contexts (not dev server)
- Load the built extension to test Chrome API features
- Use type definitions from `@types/chrome` for development

---

## 🤝 Contributing

We welcome contributions to the frontend! Please see the main [Contributing Guide](../CONTRIBUTING.md) for general guidelines.

### Frontend-Specific Guidelines

- **Component Structure**: Follow atomic design principles (atoms → molecules → organisms)
- **Styling**: Use Tailwind utilities; avoid inline styles
- **State Management**: Use Zustand for global state, React Query for server state
- **Type Safety**: Leverage TypeScript; avoid `any` types
- **Accessibility**: Ensure all interactive elements are keyboard accessible
- **i18n**: Wrap all user-facing strings with `t()` from `react-i18next`

### Component Development

1. Create component in appropriate directory (`components/*/`)
2. Add TypeScript interfaces for props
3. Implement with Tailwind styling
4. Add to Storybook (if available)
5. Update relevant page/layout to use component

### Development Workflow

1. Fork the repository
2. Create a feature branch: `git checkout -b feat/frontend-feature`
3. Make your changes in `frontend/src/`
4. Run type checking: `npm run typecheck`
5. Build and test: `npm run build` → load in browser
6. Commit with conventional commits: `git commit -m 'feat(frontend): add new feature'`
7. Push and open a Pull Request

---

## ⚠️ Development Tips

- Ensure `backend/dist` exists before starting (frontend imports types from it)
- Use `@/` path alias for `src/` imports
- Chrome APIs only available in extension contexts (not dev server)
- Reload extension after each build via `chrome://extensions/`
- Use React DevTools extension for debugging component state
- Check service worker console separately from page console

---

<div align="center">

**[⬆ Back to Top](#frontend)** | **[📖 Main Documentation](../README.md)**

Made with 💜 by the Flowers Team

</div>
