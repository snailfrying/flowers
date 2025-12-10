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

