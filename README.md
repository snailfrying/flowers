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

---

## 📺 Demo

<div align="center">
  <video src="https://github.com/user-attachments/assets/6f4cb81d-d683-4c5d-8e07-0e6bf19d7fde" width="100%" controls autoplay loop muted></video>
  <p><i>Experience the seamless AI-powered workflow of Flowers</i></p>
</div>

---

## ✨ Features

### 🎯 Core Capabilities

| Feature | Description |
|---------|-------------|
| 🌐 **Smart Translation** | Context-aware translation with editable terminology |
| ✨ **AI Polish** | Professional text refinement with multiple tone options |
| 📝 **Note Generation** | Auto-generate structured notes from web content |
| 💬 **RAG-Powered Chat** | Ask questions grounded in your personal knowledge base |
| 📄 **PDF Translation** | Select and translate text directly within PDF documents |
| 🖼️ **Image OCR** | Right-click images to extract text via LLM Vision, then translate/polish/notes |
| 🎬 **Video Subtitle Translation** | Real-time AI translation of video subtitles (YouTube, etc.) |
| 🌐 **Full Page Translation** | Bilingual comparison mode with technical content protection |
| 🎨 **Customizable Prompts** | Edit and manage AI prompts for each workflow |

### 🚀 Highlights

- **Popup on Selection** - Instant AI tools when you highlight text
- **Image OCR** - Right-click any image to extract text with Vision models (GPT-4o, Gemini, Claude, etc.)
- **PDF Support** - Built-in PDF reader with full translation capabilities and professional toolbar
- **Multi-Provider Support** - Connect to OpenAI, Ollama, DeepSeek, DashScope, Anthropic, Google, and more
- **Custom Prompts** - Full control over AI behavior for each workflow
- **Side Panel Workspace** - Integrated chat, notes, and settings
- **Local-First & Privacy** - All notes and settings are stored locally in your browser. No data collection, no tracking.
- **Extensible Architecture** - Plugin-based system for custom AI workflows
- **Language-Aware Prompts** - Smart prompt switching ensures AI output matches your preferred UI language
- **Bilingual Comparison** - Professional-grade full-page translation with technical content protection

---

## 🔧 Flexible Configuration

> 💡 **The core strength of Flowers is its configurability.** Adapt the extension to your exact needs.

### Multi-Provider Support

Flowers supports a wide range of LLM providers out of the box:

| Provider | Type | Notes |
|----------|------|-------|
| **OpenAI** | Cloud | GPT-4o, GPT-4, GPT-3.5-turbo |
| **Ollama** | Local | Run models locally with full privacy |
| **DeepSeek** | Cloud | Cost-effective high-quality models |
| **DashScope** | Cloud | Alibaba Cloud Qwen models |
| **Anthropic** | Cloud | Claude models |
| **Google** | Cloud | Gemini models |
| **Any OpenAI-Compatible** | Custom | LM Studio, vLLM, LocalAI, etc. |

**Configuration is simple:**

1. Go to **Settings** → **Model Configuration**
2. Add a new provider with Base URL, API Key, and model list
3. Select your preferred Chat Model and Embedding Model
4. Save and start using!

### Custom Prompts

Every AI workflow (Translation, Polish, Note Generation, Chat, Image OCR) uses customizable system prompts:

- **Edit prompts** to match your domain or writing style
- **Language-aware switching** ensures output matches your UI language
- **Full prompt visibility** - see exactly what the AI receives

Go to **Settings** → **Prompt Management** to customize.

---

## 📸 Screenshots

> 💡 **Tip**: Watch the [Demo Video](#-demo) above for a comprehensive walkthrough of all features.

<details>
<summary><b>🌐 Smart Translation</b></summary>

Select any text on a webpage and instantly translate it with context-aware AI translation.

<img src="./docs/screenshots/翻译.png" alt="Translation Feature" width="600">
</details>

<details>
<summary><b>📄 PDF Translation</b></summary>

Open any PDF in the built-in Flowers PDF Reader. Select text to translate, polish, or generate notes - just like on regular web pages.

- Automatic PDF redirect to Flowers reader (including GitHub/GitLab blob URLs)
- Professional toolbar: download, print, search, fullscreen, zoom, dark mode, page jump
- Full popover functionality (translate, polish, notes, ask)
- Pin, drag, and position the popover anywhere
- Lazy loading for long documents

</details>

<details>
<summary><b>🖼️ Image OCR</b></summary>

Right-click any image and choose **Extract Text (Flowers)** to extract text using a Vision Language Model.

- Requires a VLM (e.g. GPT-4o, Claude 3, Gemini 3 Flash)
- Extracted text flows into the same popover for translate, polish, notes, or ask
- Customizable `ocr_system` and `ocr_user` prompts in Settings → Prompt Management

</details>

<details>
<summary><b>🌐 Full Page Translation</b></summary>

Translate entire webpages into a bilingual comparison format with:

- 🛡️ **Technical Content Protection** - Skips code, math, diagrams
- 🧠 **Context-Aware Batching** - Optimized API usage
- 💉 **Non-Intrusive Injection** - Preserves page functionality

<img src="./docs/screenshots/全屏翻译.png" alt="Full Page Translation" width="600">
</details>

<details>
<summary><b>🎬 Video Subtitle Translation</b></summary>

Real-time video subtitle translation with intelligent batching and caching.

<img src="./docs/screenshots/字幕翻译.png" alt="Video Subtitle Translation" width="600">

**Supported Platforms**: YouTube (DOM & TextTrack), Generic (TextTrack)
</details>

<details>
<summary><b>💬 RAG Chat & 📝 Notes</b></summary>

<img src="./docs/screenshots/聊天.png" alt="Chat Interface" width="400">
<img src="./docs/screenshots/笔记管理.png" alt="Notes Management" width="400">
</details>

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────┐
│                     Browser Extension                    │
├──────────────────┬──────────────────┬───────────────────┤
│   Selection UI   │   Workspace      │   API Bridge      │
│   PDF Viewer     │   Image OCR      │                   │
│   Video Trans    │   Full Page      │                   │
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
                    └────────────────┘
```

---

## 🚀 Quick Start

### Prerequisites

- **Node.js** >= 18.0.0
- **npm** or **pnpm**
- **OpenAI-compatible API** key

### Installation

```bash
# Clone
git clone https://github.com/snailfrying/flowers.git
cd flowers

# Install dependencies
cd backend && npm install
cd ../frontend && npm install

# Configure API keys
cp backend/env.yaml.example backend/env.yaml
# Edit backend/env.yaml with your API key

# Build
cd backend && npm run build
cd ../frontend && npm run build

# Load in browser
# 1. Open chrome://extensions/
# 2. Enable "Developer mode"
# 3. Click "Load unpacked"
# 4. Select frontend/dist/ directory
```

---

## 📖 Usage

### Text Selection Tools

1. Highlight any text on a webpage (or PDF)
2. The Flowers popover appears automatically
3. Choose: **Translate** | **Polish** | **Generate Note** | **Ask AI**

### Image OCR

1. Right-click any image on a webpage
2. Select **Extract Text (Flowers)**
3. OCR result appears in the popover—then translate, polish, or generate notes
4. Requires a Vision model (e.g. GPT-4o, Claude 3, Gemini 3 Flash) in Settings → Model Config

### PDF Documents

PDFs are automatically opened in the Flowers PDF Reader with full translation support.

### Side Panel Workspace

Click the Flowers extension icon to access:

- **💬 Chat** - Converse with AI using your knowledge base
- **📝 Notes** - Browse and manage your notes
- **⚙️ Settings** - Configure models, prompts, and preferences

---

## 🛠️ Development

### Project Structure

```
flowers/
├── backend/              # AI orchestration layer
│   ├── src/
│   │   ├── agent/        # Workflow nodes
│   │   ├── services/     # LLM, RAG, prompts
│   │   └── storage/      # Data persistence
│
├── frontend/             # Browser extension UI
│   ├── src/
│   │   ├── components/   # React components
│   │   ├── background/   # Service worker
│   │   ├── content/      # Content scripts
│   │   │   ├── video/    # Video subtitle translation
│   │   │   └── fullpage/ # Full page translation
│   │   ├── pages/
│   │   │   └── pdf-viewer/  # PDF reader
│   │   └── sidepanel/    # Main workspace
```

### Development Mode

```bash
cd backend && npm run dev    # Backend (watch mode)
cd frontend && npm run dev   # Frontend (with HMR)
```

---

## 🤝 Contributing

We welcome contributions! See [CONTRIBUTING.md](./CONTRIBUTING.md) for details.

---

## 📋 Roadmap

- [ ] Firefox extension support
- [ ] Local LLM integration (Ollama, LM Studio)
- [ ] Prompt version control
- [ ] Advanced RAG features
- [ ] Mobile companion app

---

## ❓ FAQ

<details>
<summary><b>Q: Is my data sent to external servers?</b></summary>

A: Only AI API calls are sent externally. All notes and settings are stored locally in your browser.
</details>

<details>
<summary><b>Q: Can I use this with local LLMs?</b></summary>

A: Yes! Configure any OpenAI-compatible API endpoint. Works with Ollama, LM Studio, etc.
</details>

<details>
<summary><b>Q: How do I customize prompts?</b></summary>

A: Go to Settings → Prompt Management to edit system prompts for each workflow.
</details>

<details>
<summary><b>Q: Image OCR says it failed—what model do I need?</b></summary>

A: Image OCR requires a Vision Language Model (VLM). Configure one in Settings → Model Config (e.g. GPT-4o, Claude 3, Gemini 3 Flash). If the model doesn't support images, the API will return an error.
</details>

---

## 📄 License

**Personal Use Non-Commercial License** - See [LICENSE](./LICENSE) for details.

---

## 📞 Contact & Support

- **Issues**: [GitHub Issues](https://github.com/snailfrying/flowers/issues)
- **Discussions**: [GitHub Discussions](https://github.com/snailfrying/flowers/discussions)
- **Email**: <snailfrying@gmail.com>

---

<div align="center">

[![Star History Chart](https://api.star-history.com/svg?repos=snailfrying/flowers&type=Date)](https://star-history.com/#snailfrying/flowers&Date)

**Made with 💜 by the Flowers Team**

[⬆ Back to Top](#-flowers)

</div>
