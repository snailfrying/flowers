# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.1.0] - 2025-01-20

### Added

- 🌐 **Smart Translation**: Context-aware translation with editable terminology
- ✨ **AI Polish**: Professional text refinement with multiple tone options
- 📝 **Note Generation**: Auto-generate structured notes from web content
- 💬 **RAG-Powered Chat**: Ask questions grounded in your personal knowledge base
- 🎨 **Customizable Prompts**: Edit and manage AI prompts for each workflow
- 🔄 **Multi-Device Sync**: Keep your notes synchronized across devices
- 📱 **Selection Popover**: Instant AI tools when you highlight text on web pages
- 🎯 **Side Panel Workspace**: Integrated chat, notes, and settings interface
- 🌍 **Internationalization**: Full support for English and Chinese (简体中文)
- 💾 **Data Export**: Export notes as Markdown or JSON format
- 🔒 **Local-First Architecture**: All data stored locally in browser IndexedDB
- 🔐 **Privacy-Focused**: No data collection, no tracking

### Technical

- Built with TypeScript for type safety
- React 18+ with modern hooks and components
- Tailwind CSS for styling
- Vite for fast development and building
- Chrome Extension Manifest V3 support
- Service Worker architecture for background processing
- Vector search using HNSW algorithm (hnswlib-wasm)
- Support for multiple LLM providers (OpenAI-compatible, Ollama, DashScope, etc.)

### Documentation

- Comprehensive README in English and Chinese
- Contributing guidelines (CONTRIBUTING.md)
- Backend and Frontend specific documentation
- API documentation in code comments

### Security

- API keys stored securely in Chrome Storage (not in code)
- Environment configuration via `env.yaml` (not committed to repo)
- No sensitive data in version control

---

## [video branch] - 2025-12-22

> ⚠️ This is an experimental branch for testing. Not merged into main yet.

### Added

- 🎬 **Video Subtitle Translation**: Real-time AI translation of video subtitles
  - **VideoSubtitleDetector**: Auto-detects videos with subtitles on YouTube and other platforms
  - **SubtitleExtractor**: Extracts subtitles from TextTrack API or DOM elements
  - **SubtitleTranslator**: Intelligent batching and caching of subtitle translations
  - **SubtitleOverlayRenderer**: Stylish overlay display for translated subtitles
  - **SubtitleToggleButton**: Native-style toggle button integrated into video player controls
  - **VideoSubtitleTranslationManager**: Unified manager orchestrating all subtitle modules

### Supported Platforms

- ✅ YouTube (DOM Captions)
- ✅ YouTube (TextTrack API)
- ✅ Generic videos (TextTrack API)
- 🚧 Netflix (Planned)

### Full Page Translation (video branch)

- 🌐 **Full Page Translation**: Bilingual comparison mode for entire webpages
  - **NodeSelector**: Intelligent content identification with developer-focused filtering
  - **BatchProcessor**: Context-aware batching to optimize API calls and preserve context
  - **DOMInjector**: Non-intrusive injection with `data-flowers-translated` state tracking
  - **DynamicContentObserver**: Real-time monitoring of DOM changes for SPA support
  - **FloatingButton**: Quick-access toggle for full-page translation mode
- 🛡️ **Technical Content Protection**: Automatically skips code blocks (`<pre>`, `<code>`), math formulas (KaTeX, MathJax), and diagrams (Mermaid)
- 🧠 **Nesting Prevention**: Advanced algorithm to avoid redundant translations in nested DOM structures

### Technical Details

- Smart batching: Waits for streaming subtitles to complete before translating
- Translation caching to avoid redundant API calls
- Automatic language sync with user settings
- Extension context invalidation handling for robustness
- Proper cleanup on video removal
- **Messaging Protocol Fix**: Resolved "Unknown translation error" by aligning Service Worker message routing with standard backend protocols
- **Enhanced Logging**: Detailed lifecycle logging in `message-handler.ts` and `sw-adapter.ts` for better observability

---

## [Unreleased]

### Added

- Language-aware prompt switching so Translate/Polish outputs always match the UI language
- Note generation now strictly preserves selected content and automatically appends all source links
- Calendar view shows subtle markers on days that contain notes for quick filtering

### Planned

- Firefox extension support
- Local LLM integration improvements (Ollama, LM Studio)
- Prompt version control
- Multi-language prompt templates
- Advanced RAG features (hybrid search, re-ranking)
- Mobile companion app
- Plugin marketplace
- Unit and integration tests
- CI/CD pipeline

---

[0.1.0]: https://github.com/snailfrying/flowers/releases/tag/v0.1.0
