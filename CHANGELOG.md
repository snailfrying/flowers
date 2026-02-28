# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.4.1] - 2026-02-28

### Fixed

- 🖥️ **HiDPI PDF Rendering**: Eliminated blurriness on Retina/4K displays by implementing high-resolution canvas scaling based on `devicePixelRatio`

### Changed

- 🖼️ **Modern Flat PDF Viewer**: Overhauled the PDF reader interface with a clean, Zinc-based color palette and flat UI aesthetics
- 🎨 **Glassmorphism UI**: SelectionPopover now features a premium frosted glass effect with backdrop-blur and refined shadows
- 🌈 **Enhanced Result Display**: Added subtle color gradients to translation/polish result boxes for better visual hierarchy

### Added

- 📏 **Smart Boundary Detection**: Popover intelligently adjusts its position to stay within screen edges, preventing overflow

---

## [0.4.0] - 2026-02-26

### Added

- 📺 **Demo Video**: Added demo video showcasing the full Flowers workflow
- 🖼️ **Image OCR**: Extract text from images via right-click context menu
  - **Right-click "Extract Text (Flowers)"** on any image to run OCR via LLM Vision
  - OCR result flows into SelectionPopover for translate, polish, notes, and ask
  - **ocr_system / ocr_user prompts**: Bilingual defaults with user customization in Settings
  - No hardcoded VLM whitelist: directly calls API, surfaces errors to user

### Changed

- 📄 **PDF Reader Enhancements**:
  - **Toolbar**: Download, print, search, fullscreen, zoom, dark mode, page jump
  - **GitHub/GitLab fix**: Auto-convert blob URLs to raw for HTML-embedded PDFs
  - **Performance**: IntersectionObserver lazy loading for long documents
  - **Stability**: Fixed "Canvas in use" rendering conflicts and scaling crashes
  - **UX**: Loading and error states, URL normalization
- Bootstrap loads prompt overrides before first request

### Technical

- Added `image-ocr` flow: context menu → fetch → Base64 → agent:ocr → popover
- Prompt overrides loaded in Service Worker bootstrap
- Star History chart in README footer

---

## [0.3.0] - 2026-01-12

### Added

- 📄 **PDF Translation Support**: Full translation capabilities within PDF documents
  - **Built-in PDF Reader**: Automatic redirect of PDF links to Flowers PDF Reader
  - **Text Selection**: Select any text in PDFs to translate, polish, or generate notes
  - **Full Popover Features**: Same popover UI as web pages with pin, drag, and close functionality
  - **Smooth Scrolling**: Professional PDF viewing experience with zoom controls
  - **pdfjs-dist Integration**: High-fidelity PDF rendering with text layer support

### Technical

- Added `pdf-viewer` page component with React integration
- Implemented `declarativeNetRequest` dynamic rules for PDF redirect
- Integrated `pdfjs-dist` v3.x for PDF rendering
- Added `--scale-factor` CSS variable support for text layer alignment
- Proper popover positioning with fixed/unfixed state management

---

## [0.2.0] - 2025-12-23

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

### Full Page Translation

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

## [Unreleased]

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

[0.4.0]: https://github.com/snailfrying/flowers/compare/v0.3.0...v0.4.0
[0.3.0]: https://github.com/snailfrying/flowers/compare/v0.2.0...v0.3.0
[0.2.0]: https://github.com/snailfrying/flowers/compare/v0.1.0...v0.2.0
[0.1.0]: https://github.com/snailfrying/flowers/releases/tag/v0.1.0
