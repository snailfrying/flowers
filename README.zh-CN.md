# 🌸 Flowers

<div align="center">

**智能浏览器扩展 - AI 驱动的翻译、润色、笔记和知识管理工具**

[![License](https://img.shields.io/badge/license-Personal%20Use%20Non--Commercial-blue.svg)](./LICENSE)
[![Platform](https://img.shields.io/badge/platform-Chrome%20%7C%20Edge-brightgreen.svg)]()
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0+-blue.svg)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-18+-61DAFB.svg)](https://react.dev/)
[![Node.js](https://img.shields.io/badge/Node.js-18+-green.svg)](https://nodejs.org/)

[English](./README.md) | [简体中文](./README.zh-CN.md)

</div>

---

## 📺 演示视频

<div align="center">
  <video src="https://github.com/user-attachments/assets/6f4cb81d-d683-4c5d-8e07-0e6bf19d7fde" width="100%" controls autoplay loop muted></video>
  <p><i>体验 Flowers 带来的无缝 AI 增强工作流</i></p>
</div>

---

## ✨ 功能特性

### 🎯 核心能力

| 功能 | 描述 |
|-----|------|
| 🌐 **智能翻译** | 基于上下文的精准翻译，支持术语编辑 |
| ✨ **AI 润色** | 多种语气的专业文本优化 |
| 📝 **笔记生成** | 自动从网页内容生成结构化笔记 |
| 💬 **RAG 问答** | 基于个人知识库的智能对话 |
| 📄 **PDF 翻译** | 在 PDF 文档中直接选择并翻译文本 |
| 🖼️ **图片 OCR** | 右键图片提取文字，使用 LLM Vision 识别后可翻译、润色、生成笔记 |
| 🎬 **视频字幕翻译** | YouTube 等平台的实时 AI 字幕翻译 |
| 🌐 **全文翻译** | 支持技术内容保护的双语对照模式 |
| 🎨 **自定义提示词** | 为每个工作流编辑和管理 AI 提示词 |

### 🚀 亮点

- **划词弹窗** - 选中文本即可使用 AI 工具
- **图片 OCR** - 右键任意图片提取文字，需配置 Vision 模型（如 GPT-4o、Gemini、Claude 等）
- **PDF 支持** - 内置 PDF 阅读器，完整翻译功能及专业工具栏
- **多服务商支持** - 连接 OpenAI、Ollama、DeepSeek、DashScope、Anthropic、Google 等
- **自定义提示词** - 完全控制每个工作流的 AI 行为
- **侧边栏工作区** - 集成聊天、笔记和设置
- **本地优先与隐私** - 所有笔记和设置均存储在浏览器本地。不收集数据，不追踪行为。
- **可扩展架构** - 基于插件的系统，支持自定义 AI 工作流
- **语言自适应提示词** - 智能提示词切换，确保 AI 输出与您设置的界面语言一致
- **双语对照翻译** - 专业级全文翻译，支持技术内容保护

---

## 🔧 灵活配置

> 💡 **Flowers 的核心优势在于其可配置性。** 根据您的需求自由定制。

### 多服务商支持

Flowers 开箱即用地支持多种 LLM 服务商：

| 服务商 | 类型 | 说明 |
|-------|------|------|
| **OpenAI** | 云端 | GPT-4o、GPT-4、GPT-3.5-turbo |
| **Ollama** | 本地 | 本地运行模型，完全隐私 |
| **DeepSeek** | 云端 | 高性价比的优质模型 |
| **DashScope** | 云端 | 阿里云通义千问模型 |
| **Anthropic** | 云端 | Claude 模型 |
| **Google** | 云端 | Gemini 模型 |
| **任意 OpenAI 兼容** | 自定义 | LM Studio、vLLM、LocalAI 等 |

**配置非常简单：**

1. 进入 **设置** → **模型配置**
2. 添加新服务商，填写 Base URL、API Key 和模型列表
3. 选择您首选的聊天模型和嵌入模型
4. 保存即可开始使用！

### 自定义提示词

每个 AI 工作流（翻译、润色、笔记生成、聊天、图片 OCR）都使用可自定义的系统提示词：

- **编辑提示词** 以匹配您的领域或写作风格
- **语言自适应切换** 确保输出与您的界面语言一致
- **完全透明** - 查看 AI 实际接收的完整提示词

进入 **设置** → **提示词管理** 进行自定义。

---

## 📸 界面预览

> 💡 **提示**：观看上方的[演示视频](#-演示视频)以全面了解所有功能。

<details>
<summary><b>🌐 智能翻译</b></summary>

在网页上选中任意文本，即可获得基于上下文的 AI 智能翻译。

<img src="./docs/screenshots/翻译.png" alt="翻译功能" width="600">
</details>

<details>
<summary><b>📄 PDF 翻译</b></summary>

在内置的 Flowers PDF 阅读器中打开任意 PDF。选择文本即可翻译、润色或生成笔记——与普通网页体验一致。

- PDF 自动重定向至 Flowers 阅读器（含 GitHub/GitLab blob 链接）
- 专业工具栏：下载、打印、搜索、全屏、缩放、深色模式、页码跳转
- 完整的弹窗功能（翻译、润色、笔记、提问）
- 支持固定、拖动和自由定位弹窗
- 长文档懒加载

</details>

<details>
<summary><b>🖼️ 图片 OCR</b></summary>

右键任意图片，选择 **Extract Text (Flowers)**，使用 Vision 模型提取文字。

- 需配置 Vision 模型（如 GPT-4o、Claude 3、Gemini 3 Flash）
- 提取的文字进入同一弹窗，可进行翻译、润色、生成笔记或提问
- 可在 设置 → 提示词管理 中自定义 ocr_system 和 ocr_user

</details>

<details>
<summary><b>🌐 全文翻译</b></summary>

将整个网页翻译为双语对照格式：

- 🛡️ **技术内容保护** - 自动跳过代码、公式、图表
- 🧠 **上下文感知批处理** - 优化 API 调用
- 💉 **非侵入式注入** - 保持页面原有功能

<img src="./docs/screenshots/全屏翻译.png" alt="全文翻译" width="600">
</details>

<details>
<summary><b>🎬 视频字幕翻译</b></summary>

实时视频字幕翻译，支持智能批处理与缓存。

<img src="./docs/screenshots/字幕翻译.png" alt="视频字幕翻译" width="600">

**支持平台**：YouTube（DOM 和 TextTrack）、通用视频（TextTrack）
</details>

<details>
<summary><b>💬 RAG 问答 & 📝 笔记</b></summary>

<img src="./docs/screenshots/聊天.png" alt="聊天界面" width="400">
<img src="./docs/screenshots/笔记管理.png" alt="笔记管理" width="400">
</details>

---

## 🏗️ 系统架构

```
┌─────────────────────────────────────────────────────────┐
│                     浏览器扩展                           │
├──────────────────┬──────────────────┬───────────────────┤
│   划词 UI        │   工作区         │   API 桥接        │
│   PDF 阅读器     │   图片 OCR       │                   │
│   视频翻译       │   全文翻译       │                   │
└────────┬─────────┴────────┬─────────┴─────────┬─────────┘
         │                  │                   │
         └──────────────────┼───────────────────┘
                            │
                    ┌───────▼────────┐
                    │   后端服务层    │
                    ├────────────────┤
                    │  • LLM 客户端  │
                    │  • RAG 引擎    │
                    │  • 存储层      │
                    └────────────────┘
```

---

## 🚀 快速开始

### 环境要求

- **Node.js** >= 18.0.0
- **npm** 或 **pnpm**
- **OpenAI 兼容** API 密钥

### 安装步骤

```bash
# 克隆仓库
git clone https://github.com/snailfrying/flowers.git
cd flowers

# 安装依赖
cd backend && npm install
cd ../frontend && npm install

# 配置 API 密钥
cp backend/env.yaml.example backend/env.yaml
# 编辑 backend/env.yaml，填入您的 API 密钥

# 构建
cd backend && npm run build
cd ../frontend && npm run build

# 加载到浏览器
# 1. 打开 chrome://extensions/
# 2. 启用"开发者模式"
# 3. 点击"加载已解压的扩展程序"
# 4. 选择 frontend/dist/ 目录
```

---

## 📖 使用指南

### 划词工具

1. 在网页（或 PDF）上选中任意文本
2. Flowers 弹窗自动出现
3. 选择功能：**翻译** | **润色** | **生成笔记** | **AI 提问**

### 图片 OCR

1. 右键网页上的任意图片
2. 选择 **Extract Text (Flowers)**
3. OCR 结果会出现在弹窗中，可进行翻译、润色或生成笔记
4. 需在 设置 → 模型配置 中配置 Vision 模型（如 GPT-4o、Claude 3、Gemini 3 Flash）

### PDF 文档

PDF 文件会自动在 Flowers PDF 阅读器中打开，完整支持翻译功能。

### 侧边栏工作区

点击 Flowers 扩展图标访问：

- **💬 聊天** - 使用知识库与 AI 对话
- **📝 笔记** - 浏览和管理笔记
- **⚙️ 设置** - 配置模型、提示词和偏好设置

---

## 🛠️ 开发指南

### 项目结构

```
flowers/
├── backend/              # AI 编排层
│   ├── src/
│   │   ├── agent/        # 工作流节点
│   │   ├── services/     # LLM, RAG, 提示词
│   │   └── storage/      # 数据持久化
│
├── frontend/             # 浏览器扩展 UI
│   ├── src/
│   │   ├── components/   # React 组件
│   │   ├── background/   # Service Worker
│   │   ├── content/      # 内容脚本
│   │   │   ├── video/    # 视频字幕翻译
│   │   │   └── fullpage/ # 全文翻译
│   │   ├── pages/
│   │   │   └── pdf-viewer/  # PDF 阅读器
│   │   └── sidepanel/    # 主工作区
```

### 开发模式

```bash
cd backend && npm run dev    # 后端（监听模式）
cd frontend && npm run dev   # 前端（热重载）
```

---

## 🤝 参与贡献

我们欢迎贡献！请查看 [CONTRIBUTING.md](./CONTRIBUTING.md) 了解详情。

---

## 📋 路线图

- [ ] Firefox 扩展支持
- [ ] 本地 LLM 集成（Ollama, LM Studio）
- [ ] 提示词版本控制
- [ ] 高级 RAG 功能
- [ ] 移动端配套应用

---

## ❓ 常见问题

<details>
<summary><b>Q: 我的数据会被发送到外部服务器吗？</b></summary>

A: 只有 AI API 调用会发送到外部。所有笔记和设置都存储在您的浏览器本地。
</details>

<details>
<summary><b>Q: 可以使用本地 LLM 吗？</b></summary>

A: 可以！配置任何 OpenAI 兼容的 API 端点。支持 Ollama、LM Studio 等。
</details>

<details>
<summary><b>Q: 如何自定义提示词？</b></summary>

A: 进入 设置 → 提示词管理，编辑每个工作流的系统提示词。
</details>

<details>
<summary><b>Q: 图片 OCR 失败，需要什么模型？</b></summary>

A: 图片 OCR 需要 Vision 语言模型（VLM）。请在 设置 → 模型配置 中配置（如 GPT-4o、Claude 3、Gemini 3 Flash）。若模型不支持图片，API 会返回错误提示。
</details>

---

## 📄 许可证

**个人使用非商业许可证** - 详见 [LICENSE](./LICENSE) 文件。

---

## 📞 联系与支持

- **问题反馈**: [GitHub Issues](https://github.com/snailfrying/flowers/issues)
- **讨论区**: [GitHub Discussions](https://github.com/snailfrying/flowers/discussions)
- **邮箱**: <snailfrying@gmail.com>

---

<div align="center">

[![Star History Chart](https://api.star-history.com/svg?repos=snailfrying/flowers&type=Date)](https://star-history.com/#snailfrying/flowers&Date)

**用 💜 制作 by Flowers 团队**

[⬆ 回到顶部](#-flowers)

</div>
