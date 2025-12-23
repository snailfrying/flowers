# 🌸 Flowers

<div align="center">

**An intelligent browser extension for AI-powered translation, polishing, note-taking, and knowledge management**

[![License](https://img.shields.io/badge/license-Personal%20Use%20Non--Commercial-blue.svg)](./LICENSE)
[![Platform](https://img.shields.io/badge/platform-Chrome%20%7C%20Edge-brightgreen.svg)]()
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0+-blue.svg)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-18+-61DAFB.svg)](https://react.dev/)
[![Node.js](https://img.shields.io/badge/Node.js-18+-green.svg)](https://nodejs.org/)

[English](./README.md) | [简体中文](./README.zh-CN.md)

</div>

> ⚠️ **Branch Notice**: This is the `video` branch, which includes experimental **Video Subtitle Translation** feature. This branch is kept separate from `main` for testing purposes and will not be merged until the feature is thoroughly tested. Please report any issues you encounter.

---

## ✨ Features

### 🎯 Core Capabilities

- **🌐 Smart Translation** - Context-aware translation with editable terminology
- **✨ AI Polish** - Professional text refinement with multiple tone options
- **📝 Note Generation** - Auto-generate structured notes from web content
- **💬 RAG-Powered Chat** - Ask questions grounded in your personal knowledge base
- **🎨 Customizable Prompts** - Edit and manage AI prompts for each workflow
- **🔄 Multi-Device Sync** - Keep your notes synchronized across devices
- **🎬 Video Subtitle Translation** *(video branch)* - Real-time AI translation of video subtitles on YouTube and other platforms
- **🌐 Full Page Translation** - Bilingual comparison mode with **Technical Content Protection** (skips code/math/diagrams) and **Smart Batching**

### 🚀 Highlights

- **Popup on Selection** - Instant AI tools when you highlight text
- **Side Panel Workspace** - Integrated chat, notes, and settings
- **Local-First** - Your data stays on your device
- **Privacy-Focused** - No data collection, no tracking
- **Extensible** - Plugin architecture for custom workflows
- **Language-Aware Prompts** - Translation/Polish prompts automatically switch to the language you set in Settings

---

## 📸 Screenshots

### 🌐 Smart Translation

Select any text on a webpage and instantly translate it with context-aware AI translation.

<img src="./docs/screenshots/翻译.png" alt="Translation Feature" width="600">

### 🌐 Full Page Translation

Translate entire webpages into a bilingual comparison format. Unlike standard translators, Flowers is designed for developers and power users:

- **🛡️ Technical Content Protection**: Automatically identifies and skips code blocks (`<pre>`, `<code>`), math formulas (KaTeX, MathJax), and diagrams (Mermaid) to preserve technical integrity.
- **🧠 Context-Aware Batching**: Intelligently merges multiple paragraphs into a single API request, maintaining context while significantly reducing token usage and latency.
- **💉 Non-Intrusive Injection**: Uses a unique DOM injection method that preserves the original webpage structure and event listeners, ensuring compatibility with complex SPAs.
- **🔄 Dynamic Content Support**: Real-time monitoring of DOM changes (via MutationObserver) to automatically translate newly loaded content (e.g., infinite scroll).

<img src="./docs/screenshots/全屏翻译.png" alt="Full Page Translation" width="600">

### 💬 RAG-Powered Chat

Ask questions grounded in your personal knowledge base. The AI retrieves relevant context from your notes to provide accurate answers.

<img src="./docs/screenshots/聊天.png" alt="Chat Interface" width="600">

### 📝 Note Generation

Automatically generate structured notes from web content with AI-powered summarization and key information extraction.

<img src="./docs/screenshots/总览.png" alt="Note Generation" width="600">

### 📚 Note Management

Browse, search, and manage your notes with tags, calendar view, and full-text search capabilities.

<img src="./docs/screenshots/笔记管理.png" alt="Notes Management" width="600">

---

## 🎬 Video Subtitle Translation *(video branch)*

This branch includes experimental real-time video subtitle translation. Key features:

<img src="./docs/screenshots/字幕翻译.png" alt="Video Subtitle Translation" width="600">

- **🎯 Auto-Detection** - Automatically detects videos with subtitles on YouTube and other platforms
- **🔘 Toggle Button** - In-player toggle button to enable/disable translation
- **📝 Real-time Batching** - Intelligently buffers and batches streaming subtitles to handle fast-paced dialogue without losing context.
- **🎨 Overlay Display** - Shows translated subtitles as a stylish, non-blocking overlay on the video.
- **⚡ Caching & Sync** - Caches translations to avoid redundant API calls and automatically uses your preferred language from Settings.

### Supported Platforms

| Platform | Subtitle Source | Status |
|----------|----------------|--------|
| YouTube  | DOM Captions   | ✅ Supported |
| YouTube  | TextTrack API  | ✅ Supported |
| Generic  | TextTrack API  | ✅ Supported |
| Netflix  | -              | 🚧 Planned |

### How to Use

1. Navigate to a YouTube video with subtitles enabled
2. Look for the **🌐 Translation** icon in the video player controls
3. Click the icon to enable real-time subtitle translation
4. Translated subtitles will appear as a yellow overlay above the original subtitles

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────┐
│                     Browser Extension                    │
├──────────────────┬──────────────────┬───────────────────┤
│   (Selection UI) │   (Workspace)    │  (API Bridge)     │
│   (Video Trans)  │                  │                   │
│   (Full Page)    │                  │                   │
└────────┬─────────┴────────┬─────────┴─────────┬─────────┘
         │                  │                   │
         └──────────────────┼───────────────────┘
                            │
                    ┌───────▼────────┐
                    │  Backend Layer │
                    ├────────────────┤
                    │  • LLM Client  │
                    │  • RAG Engine  │
                    │  • Storage     │
                    │  • Sync        │
                    └────────────────┘
```

---

## 🚀 Quick Start

### Prerequisites

- **Node.js** >= 18.0.0
- **npm** or **pnpm**
- **OpenAI-compatible API** key

### Installation

1. **Clone the repository**

   ```bash
   git clone https://github.com/snailfrying/flowers.git
   cd flowers
   ```

2. **Install dependencies**

   ```bash
   # Backend
   cd backend
   npm install

   # Frontend
   cd ../frontend
   npm install
   ```

3. **Configure API keys**

   ```bash
   # Copy example config
   cp backend/env.yaml.example backend/env.yaml
   
   # Edit with your API key
   # vim backend/env.yaml
   ```

4. **Build the extension**

   ```bash
   # Build backend
   cd backend
   npm run build

   # Build frontend
   cd ../frontend
   npm run build
   ```

5. **Load in browser**
   - Open `chrome://extensions/`
   - Enable "Developer mode"
   - Click "Load unpacked"
   - Select `frontend/dist/` directory

---

## 📖 Usage

### Text Selection Tools

1. Highlight any text on a webpage
2. Click the Flowers icon in the popup
3. Choose from:
   - **Translate** - Translate to your target language
   - **Polish** - Refine and improve the text
   - **Generate Note** - Create a structured note
   - **Ask AI** - Get AI insights about the selection

### Side Panel Workspace

1. Click the Flowers extension icon
2. Access three main sections:
   - **💬 Chat** - Converse with AI using your knowledge base
   - **📝 Notes** - Browse and manage your notes
   - **⚙️ Settings** - Configure models, prompts, and preferences

### Note Management

- **Create**: Generate notes from web content or manual input
- **Edit**: Modify titles, content, and tags (generated notes always keep original facts and links)
- **Search**: Find notes by keywords or tags
- **Export**: Download as Markdown or JSON
- **Calendar Filter**: Calendar view highlights dates that contain notes so you can filter with a single click

---

## 🛠️ Development

### Project Structure

```
flowers/
├── backend/          # AI orchestration layer
│   ├── src/
│   │   ├── agent/   # Workflow nodes
│   │   ├── services/# LLM, RAG, prompts
│   │   └── storage/ # Data persistence
│   └── package.json
│
├── frontend/         # Browser extension UI
│   ├── src/
│   │   ├── components/  # React components
│   │   ├── background/  # Service worker
│   │   ├── content/     # Content scripts
│   │   │   └── video/   # Video subtitle translation (video branch)
│   │   │       ├── VideoSubtitleDetector.ts
│   │   │       ├── SubtitleExtractor.ts
│   │   │       ├── SubtitleTranslator.ts
│   │   │       ├── SubtitleOverlayRenderer.ts
│   │   │       ├── SubtitleToggleButton.ts
│   │   │       └── VideoSubtitleTranslationManager.ts
│   │   │   └── fullpage/# Full page translation
│   │   │       ├── NodeSelector.ts
│   │   │       ├── BatchProcessor.ts
│   │   │       ├── DOMInjector.ts
│   │   │       ├── DynamicContentObserver.ts
│   │   │       ├── FloatingButton.ts
│   │   │       └── FullPageTranslationManager.ts
│   │   └── sidepanel/   # Main workspace
│   └── package.json
│
├── LICENSE
└── README.md
```

### Development Mode

```bash
# Backend (watch mode)
cd backend
npm run dev

# Frontend (with HMR)
cd frontend
npm run dev
```

### Testing

```bash
# Run tests
npm run test

# Run linter
npm run lint
```

---

## 🤝 Contributing

We welcome contributions! Please see our [Contributing Guide](./CONTRIBUTING.md) for details.

### Quick Contribution Steps

1. Fork the repository
2. Create a feature branch (`git checkout -b feat/amazing-feature`)
3. Commit your changes (`git commit -m 'feat: add amazing feature'`)
4. Push to the branch (`git push origin feat/amazing-feature`)
5. Open a Pull Request

---

## 📋 Roadmap

- [ ] Firefox extension support
- [ ] Local LLM integration (Ollama, LM Studio)
- [ ] Prompt version control
- [ ] Multi-language prompt templates
- [ ] Advanced RAG features (hybrid search, re-ranking)
- [ ] Mobile companion app
- [ ] Plugin marketplace

---

## ❓ FAQ

<details>
<summary><b>Q: Is my data sent to external servers?</b></summary>

A: Only AI API calls (to OpenAI or your configured provider) are sent externally. All notes and settings are stored locally in your browser.
</details>

<details>
<summary><b>Q: Can I use this with local LLMs?</b></summary>

A: Yes! Configure any OpenAI-compatible API endpoint in settings. Works with Ollama, LM Studio, and other local inference servers.
</details>

<details>
<summary><b>Q: How do I customize prompts?</b></summary>

A: Go to Settings → Prompt Management. You can edit system prompts for each workflow (translation, polish, note generation, etc.).
</details>

<details>
<summary><b>Q: Can I export my notes?</b></summary>

A: Yes! Use the Export button in the Notes page to download all notes as Markdown or JSON.
</details>

---

## 📄 License

This project is licensed under the **Personal Use Non-Commercial License**.

- ✅ Personal use
- ✅ Modification and distribution (non-commercial)
- ❌ Commercial use
- ❌ Selling or monetizing

See [LICENSE](./LICENSE) for full details.

---

## 🙏 Acknowledgments

- Built with [React](https://react.dev/), [TypeScript](https://www.typescriptlang.org/), and [Tailwind CSS](https://tailwindcss.com/)
- UI components from [shadcn/ui](https://ui.shadcn.com/)
- Icons from [Lucide](https://lucide.dev/)

---

## 📞 Contact & Support

- **Issues**: [GitHub Issues](https://github.com/snailfrying/flowers/issues)
- **Discussions**: [GitHub Discussions](https://github.com/snailfrying/flowers/discussions)
- **Email**: <snailfrying@gmail.com>

---

<div align="center">

**Made with 💜 by the Flowers Team**

[⬆ Back to Top](#-flowers)

</div>
