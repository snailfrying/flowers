# 图片 OCR 识别与翻译技术方案设计文档

## 1. 概述

本文档旨在调研和设计图片 OCR 文本提取及翻译功能的技术方案，作为 Flowers Chrome 扩展的新特性。用户可以在任何网页上右键点击图片，通过 Flowers 扩展提取图片中的文字，并将提取结果作为输入，执行翻译、润色、笔记生成等已有工作流。

### 1.1 目标

- **核心目标**：在 Chrome 扩展中实现右键图片 → OCR 文本提取 → 复用现有 AI 工作流（翻译/润色/笔记/提问）
- **使用场景**：用户浏览包含文字的图片（截图、文档图片、图表、海报等），需要提取并翻译其中的文本
- **技术特点**：结合本地 OCR 和 LLM Vision 能力，融入现有弹窗交互流程

### 1.2 当前实现情况

#### 1.2.1 现有能力

**右键菜单（Context Menu）**

当前扩展已注册 `contextMenus` 权限，在 `service-worker.ts` 中创建了 PDF 相关的右键菜单项：

```typescript
chrome.contextMenus.create({
  id: 'open-in-flowers-pdf',
  title: 'Open in Flowers PDF Reader',
  contexts: ['page', 'link']
});
```

尚未注册 `contexts: ['image']` 类型的菜单项。

**SelectionPopover 组件**

现有的 `SelectionPopover` 组件接收 `selectedText` prop，用户可编辑文本后执行翻译/润色/笔记等操作。核心数据流为：

```
selectedText (prop) → state.text.selected → state.text.editable → agentAPI.translate/polish/... → state.result
```

该组件已具备完整的文本输入→AI 处理→结果展示链路，OCR 提取的文本可直接注入此流程。

**VLM（Vision Language Model）支持**

聊天模块已支持图片上传，`OpenAIClient` 支持 `image_url` 类型的消息内容：

```typescript
{
  type: 'image_url',
  image_url: { url: 'data:image/png;base64,...' }
}
```

**消息通信架构**

```
Content Script ──sendMessage──▶ Service Worker ──handleMessage──▶ Backend Agent
                                    │
                              MessageRequest {
                                action: 'agent:translate' | 'agent:polish' | ...
                                params: { text, targetLang, sourceUrl }
                              }
```

#### 1.2.2 技术栈

- **Backend**: TypeScript, Node.js
- **Frontend**: React, TypeScript, Vite, Shadow DOM
- **LLM 集成**: 支持多 Provider（OpenAI, Ollama, DeepSeek, DashScope, Anthropic, Google 等）
- **消息通信**: Chrome Extension Message API
- **扩展规范**: Manifest V3

### 1.3 当前方案的局限性

- **仅支持文本选择**：当前输入方式依赖用户选中文本，无法处理图片中的文字
- **无 OCR 能力**：缺少图片文本提取机制
- **无图片右键菜单**：`contextMenus` 未注册图片类型入口
- **SelectionPopover 仅接受文本**：需要扩展以支持 OCR 提取文本的注入

---

## 2. 市场技术调研

### 2.1 现有 Chrome 扩展方案

#### 2.1.1 OCR Extract Text from Image

- **实现方式**：注册 `contexts: ['image']` 右键菜单，点击后在侧边栏中显示离线 OCR 结果
- **技术栈**：Tesseract.js 本地 OCR
- **特点**：完全离线处理，支持复制识别结果
- **局限**：仅提取文本，无后续 AI 处理能力

#### 2.1.2 OCR - Image Reader

- **实现方式**：Tesseract.js，支持 100+ 语言
- **特点**：低置信度时自动反色重试，支持区域选择
- **技术创新**：自适应图片预处理提升识别率

#### 2.1.3 ScreenAI

- **实现方式**：使用 Gemini Vision 模型进行图片分析
- **技术栈**：BYOK（Bring Your Own Key）+ LLM Vision API
- **特点**：支持自定义 Prompt，可执行复杂图片理解任务（如从 ER 图生成 SQL）
- **局限**：依赖外部 API，有网络延迟和成本

#### 2.1.4 Image-to-Text Contextmenu

- **实现方式**：Chrome Built-in Prompt API（实验性功能）
- **CORS 处理**：通过 Canvas 渲染 + base64 编码绕过跨域限制
- **特点**：利用浏览器内置 AI 能力

### 2.2 OCR 技术方案深度调研

#### 2.2.1 Tesseract.js v5（本地 OCR）

Tesseract.js v5 是 Google Tesseract OCR 引擎的纯 JavaScript/WASM 实现，2024-2025 年持续优化：

**性能数据**：

| 指标 | v4 | v5 | 提升 |
|------|-----|-----|------|
| 英文语言包体积 | ~10MB | ~4.6MB | -54% |
| 中文语言包体积 | ~22MB | ~6MB | -73% |
| Worker 内存占用 | 311MB | 164MB | -47% |
| 首次运行速度 | 基准 | ~50% 更快 | +50% |

**WebAssembly 优化**：
- 自动选择最优 WASM 构建版本（SIMD / LSTM / SIMD+LSTM）
- Relaxed SIMD 支持带来 ~1.58x 额外加速（Chrome 最新版本）
- 语言数据从 jsDelivr CDN 加载，提升可靠性

**Chrome 扩展集成要点**：
```typescript
// Manifest V3 需要禁用 Blob Worker URL
const worker = await Tesseract.createWorker({
  workerPath: '/libs/tesseractjs/worker.min.js',
  workerBlobURL: false,  // 关键：避免 CSP 违规
  langPath: '/libs/tesseractjs',
});
```

**优势**：
- 完全离线，数据不离开用户设备
- 无 API 调用成本
- 支持 100+ 语言
- 成熟稳定，社区活跃

**劣势**：
- 复杂排版（多列、表格）识别率有限
- 手写文字和艺术字体效果差
- 首次加载需下载语言包（中文 ~6MB）
- 内存占用较高（164MB/Worker）

#### 2.2.2 LLM Vision API（云端 OCR）

利用现有 LLM 的多模态视觉能力进行文本提取。Flowers 已集成多个支持 Vision 的 LLM Provider。

**2026 年 Vision 模型 OCR 性能排名**：

| 模型 | Vision 评分 | OCR 准确率 | 特点 |
|------|------------|-----------|------|
| **Gemini 3 Flash** | 79.0 | ~79% | 原生多模态架构，1M token 上下文 |
| **GPT-5.2 (medium)** | 75.0 | ~75% | 强上下文理解，内容审核能力 |
| **Claude Opus 4.5** | 74.0 | ~74% | 文档分析能力强 |
| **Qwen 2.5 VL (72B)** | — | ~75% | 开源可本地部署 |

**优势**：
- 复杂排版识别能力远超传统 OCR
- 理解图片语义上下文，而非仅提取字符
- 可一步完成 OCR + 翻译（减少一次 API 调用）
- 支持自定义 Prompt，可针对特定场景优化
- 复用现有 VLM 基础设施（`OpenAIClient` 已支持）

**劣势**：
- 依赖网络，有延迟（200-500ms 起）
- 有 API 调用成本
- 结果不完全稳定（同一图片可能产生不同输出）
- 涉及用户数据上传隐私顾虑

#### 2.2.3 Chrome Built-in AI API（浏览器原生）

Chrome 138+ 已稳定支持部分内置 AI API：
- **Translator API** / **Language Detector API**（稳定版）
- **Summarizer API**（稳定版）
- **Writer / Rewriter / Proofreader API**（Origin Trial）
- **Prompt API**（扩展可用，Chrome 138+）

**当前状态**：
- 尚未提供专门的 OCR API
- Prompt API 可配合图片实现基础文字提取
- 硬件要求较高（22GB 存储、16GB RAM、4 核 CPU）
- 语言支持有限（英语、西班牙语、日语，Chrome 140+）

**结论**：Built-in AI 暂不适合作为主要 OCR 方案，可作为未来扩展方向关注。

### 2.3 图片获取与 CORS 处理

在 Chrome 扩展中获取跨域图片是核心技术挑战之一。

#### 2.3.1 问题分析

```
用户右键图片 → 获取图片 URL (info.srcUrl)
                    │
          ┌─────────┴─────────┐
          │ 同源图片            │ 跨域图片
          │ 直接 Canvas 读取   │ Canvas 被 taint，无法 getImageData()
          └───────────────────┘
```

#### 2.3.2 解决方案

**方案 A：Service Worker fetch()（推荐）**

Chrome 扩展的 Service Worker 拥有 `host_permissions`，可绕过 CORS 限制直接 fetch 任意图片：

```typescript
// Service Worker 中
async function fetchImageAsBase64(url: string): Promise<string> {
  const response = await fetch(url);
  const blob = await response.blob();
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result as string);
    reader.readAsDataURL(blob);
  });
}
```

Flowers 已声明 `host_permissions: ["http://*/", "https://*/"]`，无需额外权限。

**方案 B：Offscreen Document + OffscreenCanvas**

对需要图片预处理（缩放、去噪）的场景，使用 Offscreen Document 提供 DOM 环境：

```typescript
// 创建 Offscreen Document
await chrome.offscreen.createDocument({
  url: 'offscreen.html',
  reasons: ['DOM_PARSER'],
  justification: 'Image preprocessing for OCR'
});
```

**方案 C：Content Script Canvas**

在当前页面上下文中处理，适用于同源图片的快速提取。

### 2.4 技术方案对比

| 方案 | 准确率 | 延迟 | 成本 | 隐私性 | 复杂排版 | 集成难度 |
|------|--------|------|------|--------|---------|---------|
| **Tesseract.js v5** | 中等 | 1-3s | 免费 | ⭐⭐⭐ 最佳 | 较差 | 中等 |
| **LLM Vision API** | 高 | 1-5s | 按量计费 | 中等 | ⭐⭐⭐ 优秀 | 低（已有基础设施） |
| **Tesseract + LLM 后处理** | 高 | 2-5s | 低 | 中等 | 良好 | 较高 |
| **Chrome Built-in AI** | 未知 | — | 免费 | ⭐⭐⭐ 最佳 | 未知 | 暂不可用 |

### 2.5 推荐实施策略

**推荐方案：双引擎架构（Tesseract.js + LLM Vision），用户可选**

核心理由：
1. Flowers 的核心定位是**可配置性**，用户应该能选择 OCR 引擎
2. Tesseract.js 满足离线/隐私场景，LLM Vision 满足高精度场景
3. LLM Vision 可一步完成 OCR + 翻译，体验更好
4. 两种方案的集成路径均清晰，且 LLM Vision 已有基础设施

**Phase 1（MVP）**：LLM Vision API
- 复用现有 VLM 基础设施，集成成本最低
- 准确率高，支持复杂排版
- 可一步完成 OCR + 翻译（可选）

**Phase 2（离线能力）**：Tesseract.js
- 提供完全离线的 OCR 选项
- 适合隐私敏感场景
- 降低 API 成本

**Phase 3（优化增强）**：
- 图片预处理管线（去噪、二值化、倾斜校正）
- 区域选择 OCR（框选图片局部区域）
- OCR 结果缓存

---

## 3. 架构设计

### 3.1 整体架构

```
┌──────────────────────────────────────────────────────────────────────────┐
│                         图片 OCR 翻译功能架构                              │
├──────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  ┌────────────┐    ┌──────────────┐    ┌──────────────┐                  │
│  │ 用户交互层  │    │  图片获取层   │    │  OCR 引擎层  │                  │
│  │            │    │              │    │              │                  │
│  │ • 右键菜单 │───▶│ • URL 解析   │───▶│ • LLM Vision │                  │
│  │ • 弹窗 UI  │    │ • fetch 下载 │    │ • Tesseract  │                  │
│  │ • 结果展示 │    │ • Base64 编码│    │ • 引擎切换   │                  │
│  └────────────┘    └──────────────┘    └──────┬───────┘                  │
│                                               │                          │
│                                               ▼                          │
│                                        ┌──────────────┐                  │
│                                        │  文本后处理   │                  │
│                                        │              │                  │
│                                        │ • 文本清理   │                  │
│                                        │ • 语言检测   │                  │
│                                        │ • 置信度评估 │                  │
│                                        └──────┬───────┘                  │
│                                               │                          │
│                                               ▼                          │
│  ┌──────────────────────────────────────────────────────────────────┐    │
│  │                    现有 AI 工作流（复用）                          │    │
│  │  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐            │    │
│  │  │ 翻译     │ │ 润色     │ │ 笔记生成 │ │ AI 提问  │            │    │
│  │  │ agentAPI │ │ agentAPI │ │ agentAPI │ │ agentAPI │            │    │
│  │  │.translate│ │.polish   │ │.genNote  │ │.ask      │            │    │
│  │  └──────────┘ └──────────┘ └──────────┘ └──────────┘            │    │
│  └──────────────────────────────────────────────────────────────────┘    │
│                                                                          │
└──────────────────────────────────────────────────────────────────────────┘
```

### 3.2 消息流设计

#### 3.2.1 右键 OCR 完整流程

```
┌──────────┐   右键图片    ┌──────────────┐  contextMenu   ┌────────────────┐
│ 用户     │──────────────▶│ Chrome 浏览器 │──────click────▶│ Service Worker │
│ (网页)   │               │ (右键菜单)    │               │                │
└──────────┘               └──────────────┘               │ 1. 获取 srcUrl  │
                                                          │ 2. fetch 图片   │
                                                          │ 3. 转 Base64    │
                                                          └───────┬────────┘
                                                                  │
                               ┌──────────────────────────────────┘
                               ▼
                 ┌──────────────────────────┐
                 │    OCR 引擎路由           │
                 │                          │
                 │  用户设置 == 'vision' ?   │
                 │  ├─ Yes: LLM Vision API  │
                 │  └─ No:  Tesseract.js    │
                 └───────────┬──────────────┘
                             │
                             ▼
                 ┌──────────────────────────┐
                 │    OCR 结果              │
                 │  {                       │
                 │    text: string,         │
                 │    confidence: number,   │
                 │    language: string      │
                 │  }                       │
                 └───────────┬──────────────┘
                             │
                             ▼
┌──────────┐   显示弹窗   ┌──────────────────────────┐
│ Content  │◀─────────────│ Service Worker           │
│ Script   │ sendMessage  │ → tabs.sendMessage({     │
│          │              │     action: 'showOCR',   │
│          │              │     text, imageUrl        │
│          │              │   })                      │
└────┬─────┘              └──────────────────────────┘
     │
     ▼
┌──────────────────────────┐
│ SelectionPopover         │
│ (OCR 模式)               │
│                          │
│ • 显示原图缩略图         │
│ • 文本可编辑区域         │
│ • 操作按钮：             │
│   翻译 | 润色 | 笔记 | 问 │
└──────────────────────────┘
```

#### 3.2.2 消息类型定义

```typescript
// 新增消息类型
interface OCRRequest {
  action: 'agent:ocr';
  params: {
    imageBase64: string;     // Base64 编码的图片数据
    mimeType: string;        // 图片 MIME 类型
    engine: 'vision' | 'tesseract';  // OCR 引擎选择
    languages?: string[];    // 期望识别的语言列表
    sourceUrl?: string;      // 图片来源 URL
  };
  requestId: string;
}

interface OCRResponse {
  success: boolean;
  data?: {
    text: string;            // 提取的文本
    confidence: number;      // 置信度 (0-1)
    detectedLanguage?: string;
    blocks?: TextBlock[];    // 文本块（含位置信息）
  };
  error?: string;
}

interface TextBlock {
  text: string;
  confidence: number;
  bbox: { x: number; y: number; width: number; height: number };
}

// Content Script 接收的消息
interface ShowOCRResultMessage {
  action: 'showOCRResult';
  text: string;
  imageUrl: string;
  confidence: number;
}
```

### 3.3 核心模块设计

#### 3.3.1 模块拆分

```
frontend/
├── src/
│   ├── background/
│   │   └── service-worker.ts          # 扩展：图片右键菜单注册 + 图片 fetch
│   ├── content/
│   │   ├── content-script.ts          # 扩展：接收 OCR 结果，触发弹窗
│   │   └── image-ocr/
│   │       ├── ImageOCRManager.ts     # OCR 流程管理器
│   │       └── ImagePreprocessor.ts   # 图片预处理（Phase 3）
│   ├── components/
│   │   └── popover/
│   │       ├── SelectionPopover.tsx   # 扩展：支持 OCR 模式
│   │       └── OCRImagePreview.tsx    # 新增：图片预览组件
│   └── shared/
│       └── api/
│           └── agent.ts              # 扩展：添加 ocr() 方法

backend/
├── src/
│   ├── agent/
│   │   ├── index.ts                  # 扩展：添加 ocr() 方法
│   │   └── nodes/
│   │       └── ocr.ts                # 新增：OCR 节点
│   ├── services/
│   │   ├── message-handler.ts        # 扩展：路由 agent:ocr
│   │   ├── message-types.ts          # 扩展：OCR 相关类型
│   │   └── ocr/
│   │       ├── OCREngine.ts          # OCR 引擎接口
│   │       ├── VisionOCREngine.ts    # LLM Vision 实现
│   │       └── TesseractOCREngine.ts # Tesseract.js 实现（Phase 2）
```

#### 3.3.2 OCR 引擎接口

```typescript
// backend/src/services/ocr/OCREngine.ts

interface OCRResult {
  text: string;
  confidence: number;
  detectedLanguage?: string;
  blocks?: TextBlock[];
}

interface OCROptions {
  languages?: string[];
  preprocessImage?: boolean;
}

interface OCREngine {
  readonly name: string;
  recognize(imageBase64: string, mimeType: string, options?: OCROptions): Promise<OCRResult>;
  isAvailable(): Promise<boolean>;
}
```

#### 3.3.3 LLM Vision OCR 引擎（Phase 1）

```typescript
// backend/src/services/ocr/VisionOCREngine.ts

class VisionOCREngine implements OCREngine {
  readonly name = 'vision';
  
  private llmClient: LLMClient;
  
  constructor(llmClient: LLMClient) {
    this.llmClient = llmClient;
  }
  
  async recognize(imageBase64: string, mimeType: string, options?: OCROptions): Promise<OCRResult> {
    const systemPrompt = this.buildSystemPrompt(options?.languages);
    
    const messages: ChatMessage[] = [
      {
        role: 'system',
        content: systemPrompt
      },
      {
        role: 'user',
        content: 'Please extract all text from this image.',
        images: [{ mimeType, data: imageBase64 }]
      }
    ];
    
    const response = await this.llmClient.chat(messages, {
      temperature: 0.1,  // 低温度确保输出稳定
      maxTokens: 4096
    });
    
    return this.parseResponse(response);
  }
  
  private buildSystemPrompt(languages?: string[]): string {
    const langHint = languages?.length
      ? `The image may contain text in: ${languages.join(', ')}.`
      : '';
    
    return `You are a precise OCR engine. Extract ALL visible text from the provided image.

Rules:
- Output ONLY the extracted text, preserving original layout and line breaks
- Maintain the reading order (top-to-bottom, left-to-right)
- Preserve paragraph structure
- Do NOT add explanations, translations, or commentary
- If no text is found, output: [NO_TEXT_DETECTED]
- For tables, use | separators to preserve structure
${langHint}

Output format:
[extracted text here]

---
CONFIDENCE: [high|medium|low]
LANGUAGE: [detected language code]`;
  }
  
  private parseResponse(response: string): OCRResult {
    const parts = response.split('---');
    const text = parts[0].trim();
    
    let confidence = 0.8;
    let detectedLanguage: string | undefined;
    
    if (parts[1]) {
      const meta = parts[1];
      if (meta.includes('high')) confidence = 0.95;
      else if (meta.includes('medium')) confidence = 0.75;
      else if (meta.includes('low')) confidence = 0.5;
      
      const langMatch = meta.match(/LANGUAGE:\s*(\w+)/);
      if (langMatch) detectedLanguage = langMatch[1];
    }
    
    return {
      text: text === '[NO_TEXT_DETECTED]' ? '' : text,
      confidence,
      detectedLanguage
    };
  }
  
  async isAvailable(): Promise<boolean> {
    return this.llmClient !== null;
  }
}
```

#### 3.3.4 Tesseract.js OCR 引擎（Phase 2）

```typescript
// backend/src/services/ocr/TesseractOCREngine.ts

import Tesseract from 'tesseract.js';

class TesseractOCREngine implements OCREngine {
  readonly name = 'tesseract';
  
  private worker: Tesseract.Worker | null = null;
  private currentLangs: string = '';
  
  async recognize(imageBase64: string, mimeType: string, options?: OCROptions): Promise<OCRResult> {
    const langs = options?.languages?.join('+') || 'eng';
    
    await this.ensureWorker(langs);
    
    const dataUrl = `data:${mimeType};base64,${imageBase64}`;
    const result = await this.worker!.recognize(dataUrl);
    
    return {
      text: result.data.text.trim(),
      confidence: result.data.confidence / 100,
      blocks: result.data.blocks?.map(block => ({
        text: block.text,
        confidence: block.confidence / 100,
        bbox: block.bbox
      }))
    };
  }
  
  private async ensureWorker(langs: string): Promise<void> {
    if (this.worker && this.currentLangs === langs) return;
    
    if (this.worker) {
      await this.worker.terminate();
    }
    
    this.worker = await Tesseract.createWorker(langs, Tesseract.OEM.LSTM_ONLY, {
      workerBlobURL: false,  // Manifest V3 CSP 兼容
      workerPath: chrome.runtime.getURL('libs/tesseract/worker.min.js'),
      corePath: chrome.runtime.getURL('libs/tesseract/tesseract-core-simd-lstm.wasm.js'),
      langPath: chrome.runtime.getURL('libs/tesseract/lang-data'),
      cacheMethod: 'none',   // 扩展环境不使用 IndexedDB 缓存
    });
    
    this.currentLangs = langs;
  }
  
  async isAvailable(): Promise<boolean> {
    return true;
  }
  
  async terminate(): Promise<void> {
    if (this.worker) {
      await this.worker.terminate();
      this.worker = null;
    }
  }
}
```

### 3.4 前端交互设计

#### 3.4.1 右键菜单注册

```typescript
// frontend/src/background/service-worker.ts（扩展）

chrome.runtime.onInstalled.addListener(() => {
  // 现有的 PDF 菜单...
  
  chrome.contextMenus.create({
    id: 'flowers-image-ocr',
    title: 'Extract Text from Image (Flowers)',
    contexts: ['image']
  });
});

chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  if (info.menuItemId === 'flowers-image-ocr' && info.srcUrl && tab?.id) {
    try {
      const imageBase64 = await fetchImageAsBase64(info.srcUrl);
      const mimeType = detectMimeType(info.srcUrl, imageBase64);
      
      // 发送 OCR 请求到 Backend
      const result = await handleMessage({
        action: 'agent:ocr',
        params: { imageBase64, mimeType, engine: getOCREngine() },
        requestId: generateId()
      });
      
      // 将结果发送到 Content Script
      chrome.tabs.sendMessage(tab.id, {
        action: 'showOCRResult',
        text: result.data.text,
        imageUrl: info.srcUrl,
        confidence: result.data.confidence
      });
    } catch (error) {
      chrome.tabs.sendMessage(tab.id, {
        action: 'showOCRError',
        error: error.message
      });
    }
  }
});
```

#### 3.4.2 SelectionPopover OCR 模式扩展

```typescript
// frontend/src/components/popover/SelectionPopover.tsx（扩展思路）

interface PopoverProps {
  selectedText: string;
  // 新增 OCR 相关 props
  mode?: 'selection' | 'ocr';
  ocrImageUrl?: string;
  ocrConfidence?: number;
}

// OCR 模式下的额外 UI：
// 1. 显示原图缩略图（可折叠）
// 2. OCR 文本预填充到可编辑区域
// 3. 置信度指示器
// 4. 重新识别按钮（切换引擎/语言）
// 5. 与现有翻译/润色/笔记按钮完全复用
```

#### 3.4.3 UI 交互流程

```
┌─────────────────────────────────────────────────┐
│ 📸 Flowers OCR                              [×] │
├─────────────────────────────────────────────────┤
│                                                 │
│  ┌───────────────────────────────────────────┐  │
│  │ 🖼️ [图片缩略图]  ▼ 折叠                  │  │
│  │                                           │  │
│  │  Confidence: ████████░░ 85%               │  │
│  └───────────────────────────────────────────┘  │
│                                                 │
│  ┌───────────────────────────────────────────┐  │
│  │ 识别结果（可编辑）：                       │  │
│  │                                           │  │
│  │ This is the extracted text from the       │  │
│  │ image. Users can edit before sending      │  │
│  │ to translation or other workflows.        │  │
│  │                                           │  │
│  └───────────────────────────────────────────┘  │
│                                                 │
│  ┌─────┐ ┌─────┐ ┌──────┐ ┌──────┐ ┌──────┐   │
│  │ 翻译 │ │ 润色 │ │ 笔记  │ │ 提问  │ │ 复制 │   │
│  └─────┘ └─────┘ └──────┘ └──────┘ └──────┘   │
│                                                 │
│  ┌───────────────────────────────────────────┐  │
│  │ 🔄 引擎: [LLM Vision ▼]  🌐 语言: [Auto ▼] │  │
│  └───────────────────────────────────────────┘  │
│                                                 │
├─────────────────────────────────────────────────┤
│ 翻译结果：                                      │
│                                                 │
│ 这是从图片中提取的文本。用户可以在发送到翻       │
│ 译或其他工作流之前进行编辑。                     │
│                                                 │
└─────────────────────────────────────────────────┘
```

---

## 4. 关键技术方案

### 4.1 跨域图片获取

#### 4.1.1 Service Worker fetch 方案（推荐）

```typescript
// 图片获取工具函数

async function fetchImageAsBase64(url: string): Promise<string> {
  // data: URL 直接返回
  if (url.startsWith('data:')) {
    return url.split(',')[1];
  }
  
  // blob: URL 需要在 Content Script 中处理
  if (url.startsWith('blob:')) {
    throw new Error('Blob URLs must be handled in content script context');
  }
  
  const response = await fetch(url, {
    headers: {
      'Accept': 'image/*'
    }
  });
  
  if (!response.ok) {
    throw new Error(`Failed to fetch image: ${response.status}`);
  }
  
  const blob = await response.blob();
  
  // 大小限制检查（10MB）
  if (blob.size > 10 * 1024 * 1024) {
    throw new Error('Image too large (max 10MB)');
  }
  
  const arrayBuffer = await blob.arrayBuffer();
  const uint8Array = new Uint8Array(arrayBuffer);
  
  let binary = '';
  const chunkSize = 8192;
  for (let i = 0; i < uint8Array.length; i += chunkSize) {
    const chunk = uint8Array.slice(i, i + chunkSize);
    binary += String.fromCharCode.apply(null, Array.from(chunk));
  }
  
  return btoa(binary);
}

function detectMimeType(url: string, base64?: string): string {
  const ext = url.split('.').pop()?.split('?')[0]?.toLowerCase();
  const mimeMap: Record<string, string> = {
    'png': 'image/png',
    'jpg': 'image/jpeg',
    'jpeg': 'image/jpeg',
    'gif': 'image/gif',
    'webp': 'image/webp',
    'bmp': 'image/bmp',
    'svg': 'image/svg+xml'
  };
  
  if (ext && mimeMap[ext]) return mimeMap[ext];
  
  // 通过 magic bytes 检测
  if (base64) {
    if (base64.startsWith('iVBOR')) return 'image/png';
    if (base64.startsWith('/9j/')) return 'image/jpeg';
    if (base64.startsWith('R0lGO')) return 'image/gif';
    if (base64.startsWith('UklGR')) return 'image/webp';
  }
  
  return 'image/png';
}
```

#### 4.1.2 Blob URL 处理

部分网站使用 Blob URL 加载图片，无法在 Service Worker 中直接 fetch。需要在 Content Script 中处理：

```typescript
// Content Script 中处理 Blob URL
async function handleBlobImage(blobUrl: string): Promise<string> {
  const response = await fetch(blobUrl);
  const blob = await response.blob();
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const result = reader.result as string;
      resolve(result.split(',')[1]);
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}
```

### 4.2 LLM Vision OCR 优化

#### 4.2.1 Prompt 工程

针对不同场景设计专用 Prompt：

```typescript
const OCR_PROMPTS = {
  // 纯文本提取
  extract: `Extract ALL visible text from this image. Output only the raw text, preserving layout and line breaks.`,
  
  // OCR + 翻译一步完成
  extractAndTranslate: (targetLang: string) =>
    `Extract all text from this image and translate it to ${targetLang}. 
     Output format:
     [ORIGINAL]
     (extracted original text)
     
     [TRANSLATION]
     (translated text)`,
  
  // 表格/结构化数据
  extractStructured: `Extract all text from this image. If the image contains a table, output it in markdown table format. Preserve the structure.`,
  
  // 代码/技术内容
  extractCode: `Extract all text from this image. If the image contains code, output it as a properly formatted code block with language detection.`
};
```

#### 4.2.2 图片压缩

大图片会增加 API 调用成本和延迟，需要适当压缩：

```typescript
async function compressImageForVision(
  base64: string,
  mimeType: string,
  maxDimension: number = 2048,
  quality: number = 0.85
): Promise<{ base64: string; mimeType: string }> {
  // 在 Offscreen Document 中执行
  const img = new Image();
  img.src = `data:${mimeType};base64,${base64}`;
  await new Promise(resolve => img.onload = resolve);
  
  const scale = Math.min(1, maxDimension / Math.max(img.width, img.height));
  
  if (scale >= 1 && mimeType === 'image/jpeg') {
    return { base64, mimeType };
  }
  
  const canvas = new OffscreenCanvas(
    Math.round(img.width * scale),
    Math.round(img.height * scale)
  );
  const ctx = canvas.getContext('2d')!;
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
  
  const blob = await canvas.convertToBlob({ type: 'image/jpeg', quality });
  const arrayBuffer = await blob.arrayBuffer();
  const compressed = btoa(String.fromCharCode(...new Uint8Array(arrayBuffer)));
  
  return { base64: compressed, mimeType: 'image/jpeg' };
}
```

### 4.3 错误处理与容错

```typescript
class ImageOCRManager {
  private engines: Map<string, OCREngine> = new Map();
  
  async recognize(
    imageBase64: string,
    mimeType: string,
    preferredEngine: string,
    options?: OCROptions
  ): Promise<OCRResult> {
    const engine = this.engines.get(preferredEngine);
    
    if (!engine) {
      throw new OCRError('INVALID_ENGINE', `Unknown OCR engine: ${preferredEngine}`);
    }
    
    if (!await engine.isAvailable()) {
      // 自动降级到备选引擎
      const fallback = this.getFallbackEngine(preferredEngine);
      if (fallback) {
        console.warn(`OCR engine "${preferredEngine}" unavailable, falling back to "${fallback.name}"`);
        return fallback.recognize(imageBase64, mimeType, options);
      }
      throw new OCRError('ENGINE_UNAVAILABLE', `OCR engine "${preferredEngine}" is not available`);
    }
    
    try {
      const result = await engine.recognize(imageBase64, mimeType, options);
      
      // 低置信度警告
      if (result.confidence < 0.5) {
        result.text = `⚠️ Low confidence (${Math.round(result.confidence * 100)}%)\n\n${result.text}`;
      }
      
      return result;
    } catch (error) {
      // 网络错误时尝试降级到本地引擎
      if (preferredEngine === 'vision' && this.engines.has('tesseract')) {
        console.warn('Vision API failed, falling back to Tesseract:', error);
        return this.engines.get('tesseract')!.recognize(imageBase64, mimeType, options);
      }
      throw error;
    }
  }
  
  private getFallbackEngine(current: string): OCREngine | null {
    const fallbackOrder = ['vision', 'tesseract'];
    for (const name of fallbackOrder) {
      if (name !== current && this.engines.has(name)) {
        return this.engines.get(name)!;
      }
    }
    return null;
  }
}

class OCRError extends Error {
  constructor(public code: string, message: string) {
    super(message);
    this.name = 'OCRError';
  }
}
```

### 4.4 设置扩展

在 Settings 页面中添加 OCR 相关配置：

```typescript
interface OCRSettings {
  engine: 'vision' | 'tesseract' | 'auto';
  defaultLanguages: string[];      // 默认识别语言列表
  autoTranslate: boolean;          // OCR 后自动翻译
  autoTranslateTarget?: string;    // 自动翻译目标语言
  imageMaxSize: number;            // 图片最大尺寸 (KB)
  showImagePreview: boolean;       // 弹窗中显示原图预览
  enableContextMenu: boolean;      // 启用右键菜单
}

const DEFAULT_OCR_SETTINGS: OCRSettings = {
  engine: 'vision',
  defaultLanguages: ['eng', 'chi_sim'],
  autoTranslate: false,
  imageMaxSize: 10240,
  showImagePreview: true,
  enableContextMenu: true
};
```

---

## 5. 实施路线

### Phase 1：MVP（LLM Vision OCR）

**预计工时**：3-5 天

**目标**：通过右键菜单 + LLM Vision 实现图片文本提取，并接入现有工作流

**任务清单**：

1. **Service Worker 扩展**
   - [ ] 注册 `contexts: ['image']` 右键菜单项
   - [ ] 实现图片 fetch + Base64 编码
   - [ ] 添加 MIME 类型检测

2. **Backend OCR 节点**
   - [ ] 定义 `OCREngine` 接口
   - [ ] 实现 `VisionOCREngine`（复用现有 `LLMClient`）
   - [ ] 在 `CoreAgent` 中添加 `ocr()` 方法
   - [ ] 在 `MessageHandler` 中路由 `agent:ocr`

3. **前端 UI**
   - [ ] `SelectionPopover` 支持 OCR 模式
   - [ ] Content Script 接收 OCR 结果并触发弹窗
   - [ ] 图片预览组件

4. **消息类型**
   - [ ] 定义 OCR 相关 `MessageRequest` / `MessageResponse` 类型

### Phase 2：离线 OCR 能力

**预计工时**：3-4 天

**目标**：集成 Tesseract.js v5，提供离线 OCR 选项

**任务清单**：

1. **Tesseract.js 集成**
   - [ ] 安装依赖，配置 Vite 打包
   - [ ] 实现 `TesseractOCREngine`
   - [ ] 处理 CSP 兼容（`workerBlobURL: false`）
   - [ ] 语言包管理（按需加载 vs 内置）

2. **引擎切换**
   - [ ] Settings 页面添加 OCR 引擎选择
   - [ ] 引擎自动降级逻辑

3. **Offscreen Document**
   - [ ] 创建 `offscreen.html` 用于 Tesseract Worker 运行
   - [ ] Service Worker ↔ Offscreen Document 消息通信

### Phase 3：优化增强

**预计工时**：4-6 天

**目标**：提升识别精度和用户体验

**任务清单**：

1. **图片预处理管线**
   - [ ] 自适应二值化
   - [ ] 倾斜校正（deskew）
   - [ ] 去噪（denoise）
   - [ ] 对比度增强

2. **区域选择 OCR**
   - [ ] 用户在图片上框选区域
   - [ ] 仅对选中区域进行 OCR

3. **OCR + 翻译一步完成**
   - [ ] Vision 引擎直接输出翻译结果
   - [ ] 减少一次 API 调用

4. **结果缓存**
   - [ ] 基于图片 URL 的 LRU 缓存
   - [ ] 避免重复识别

5. **批量 OCR**
   - [ ] 支持选择多张图片批量提取

---

## 6. 实现细节

### 6.1 Manifest.json 修改

```json
{
  "permissions": [
    "storage",
    "activeTab",
    "tabs",
    "scripting",
    "sidePanel",
    "declarativeNetRequest",
    "contextMenus",
    "offscreen"
  ],
  "host_permissions": [
    "http://*/",
    "https://*/"
  ]
}
```

新增 `"offscreen"` 权限（Phase 2 Tesseract.js 需要）。其余权限已存在。

### 6.2 Backend OCR 节点集成

```typescript
// backend/src/agent/nodes/ocr.ts

import { OCREngine, OCRResult, OCROptions } from '../../services/ocr/OCREngine';
import { VisionOCREngine } from '../../services/ocr/VisionOCREngine';
import { LRUCache } from 'lru-cache';

const ocrCache = new LRUCache<string, OCRResult>({
  max: 50,
  ttl: 1000 * 60 * 30  // 30 分钟
});

export async function ocrNode(
  imageBase64: string,
  mimeType: string,
  engine: OCREngine,
  options?: OCROptions
): Promise<OCRResult> {
  // 缓存检查（基于图片内容 hash）
  const cacheKey = hashImageData(imageBase64).substring(0, 16);
  const cached = ocrCache.get(cacheKey);
  if (cached) return cached;
  
  const result = await engine.recognize(imageBase64, mimeType, options);
  
  if (result.text) {
    ocrCache.set(cacheKey, result);
  }
  
  return result;
}

function hashImageData(base64: string): string {
  // 使用前 1KB + 后 1KB + 长度作为快速 hash
  const prefix = base64.substring(0, 1024);
  const suffix = base64.substring(base64.length - 1024);
  const key = `${prefix}|${suffix}|${base64.length}`;
  let hash = 0;
  for (let i = 0; i < key.length; i++) {
    const char = key.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash |= 0;
  }
  return Math.abs(hash).toString(36);
}
```

### 6.3 Service Worker 图片处理流程

```typescript
// frontend/src/background/service-worker.ts（核心流程）

async function handleImageOCR(info: chrome.contextMenus.OnClickData, tab: chrome.tabs.Tab) {
  const srcUrl = info.srcUrl;
  if (!srcUrl || !tab.id) return;
  
  // Step 1: 通知 Content Script 显示加载状态
  chrome.tabs.sendMessage(tab.id, {
    action: 'showOCRLoading',
    imageUrl: srcUrl
  });
  
  try {
    // Step 2: 获取图片数据
    let imageBase64: string;
    let mimeType: string;
    
    if (srcUrl.startsWith('blob:')) {
      // Blob URL 需要 Content Script 协助
      const response = await chrome.tabs.sendMessage(tab.id, {
        action: 'fetchBlobImage',
        url: srcUrl
      });
      imageBase64 = response.base64;
      mimeType = response.mimeType;
    } else {
      imageBase64 = await fetchImageAsBase64(srcUrl);
      mimeType = detectMimeType(srcUrl, imageBase64);
    }
    
    // Step 3: 图片大小验证
    const sizeKB = (imageBase64.length * 3) / 4 / 1024;
    if (sizeKB > 10240) {
      throw new Error(`Image too large: ${Math.round(sizeKB)}KB (max 10MB)`);
    }
    
    // Step 4: 获取用户 OCR 设置
    const settings = await getOCRSettings();
    
    // Step 5: 发送 OCR 请求
    const result = await handleMessage({
      action: 'agent:ocr',
      params: {
        imageBase64,
        mimeType,
        engine: settings.engine,
        languages: settings.defaultLanguages
      },
      requestId: generateRequestId()
    });
    
    // Step 6: 发送结果到 Content Script
    chrome.tabs.sendMessage(tab.id, {
      action: 'showOCRResult',
      text: result.data.text,
      imageUrl: srcUrl,
      confidence: result.data.confidence,
      detectedLanguage: result.data.detectedLanguage
    });
    
  } catch (error) {
    chrome.tabs.sendMessage(tab.id, {
      action: 'showOCRError',
      error: error instanceof Error ? error.message : 'OCR failed'
    });
  }
}
```

### 6.4 性能考虑

#### 6.4.1 图片大小与 API 成本

| 图片尺寸 | Base64 大小 | Vision API Token 消耗 | 预估成本 (GPT-4o) |
|---------|------------|---------------------|-------------------|
| 640×480 | ~200KB | ~85 tokens (low detail) | ~$0.001 |
| 1280×720 | ~500KB | ~170 tokens | ~$0.002 |
| 1920×1080 | ~1.2MB | ~765 tokens (high detail) | ~$0.008 |
| 3840×2160 | ~4MB | ~1105 tokens | ~$0.012 |

**优化策略**：
- 默认将图片压缩到 2048px 最大边
- 纯文本场景使用 `detail: 'low'` 模式
- 用户可手动选择 `detail: 'high'` 提升精度

#### 6.4.2 延迟分析

```
LLM Vision OCR 延迟分解：
├── 图片 fetch:          50-200ms  (取决于图片大小和网络)
├── Base64 编码:         10-50ms   (本地计算)
├── API 请求建立:        100-200ms (网络延迟)
├── Vision 模型推理:     500-2000ms (取决于图片复杂度)
└── 结果解析:            <10ms
    Total:               660-2460ms

Tesseract.js OCR 延迟分解：
├── 图片 fetch:          50-200ms
├── Worker 初始化:       200-500ms (首次，后续复用)
├── 语言包加载:          500-2000ms (首次，后续缓存)
├── OCR 识别:            1000-5000ms (取决于图片复杂度)
└── 结果解析:            <10ms
    Total (首次):        1760-7710ms
    Total (后续):        1060-5210ms
```

#### 6.4.3 内存管理

- Tesseract Worker 在空闲 5 分钟后自动释放
- 图片 Base64 数据处理完成后立即释放引用
- OCR 缓存使用 LRU 策略，最多保留 50 条结果

---

## 7. 测试策略

### 7.1 单元测试

- OCR 引擎接口实现（Mock LLM Client）
- 图片获取与 Base64 编码
- MIME 类型检测
- 缓存机制
- 错误处理与降级逻辑

### 7.2 集成测试

- 完整流程：右键菜单 → 图片获取 → OCR → 弹窗显示
- 不同图片来源（同源、跨域、Blob URL、Data URL）
- 不同图片格式（PNG、JPEG、WebP、GIF）
- 不同文本类型（印刷体、手写、代码截图、表格）

### 7.3 用户体验测试

- OCR 识别准确性（不同语言、不同排版）
- 端到端延迟感知
- 弹窗显示位置和交互
- 低置信度结果的提示体验
- 大图片处理的响应性

### 7.4 兼容性测试

- 不同网站（GitHub、Twitter、Medium、新闻网站等）
- 不同图片加载方式（img 标签、CSS 背景、Canvas、SVG）
- 不同浏览器（Chrome、Edge）

---

## 8. 已知问题和限制

### 8.1 技术限制

1. **Blob URL 跨上下文限制**：Blob URL 仅在创建它的上下文中有效，Service Worker 无法直接 fetch，需要 Content Script 协助
2. **SVG 图片**：SVG 中的文本是 DOM 元素而非像素，传统 OCR 不适用，需要直接解析 SVG DOM
3. **Canvas 渲染的图片**：如果图片是通过 Canvas 动态渲染的，`info.srcUrl` 可能为空
4. **CSP 限制**：某些网站的 Content Security Policy 可能阻止 Content Script 创建弹窗
5. **Tesseract.js 内存**：多语言模型同时加载会占用大量内存

### 8.2 用户体验限制

1. **首次延迟**：Tesseract 首次使用需要下载语言包，可能需要数秒
2. **LLM Vision 成本**：频繁使用会产生 API 调用成本
3. **LLM 输出不稳定**：同一图片可能产生略微不同的 OCR 结果
4. **复杂排版**：多列文本、旋转文字、弯曲文字识别率可能不理想

### 8.3 安全与隐私

1. **Vision API 数据传输**：图片数据会发送到 LLM 提供商服务器
2. **敏感内容**：用户可能无意中对含敏感信息的图片执行 OCR
3. **API Key 安全**：需要确保 API Key 不会通过消息传递泄露

---

## 9. 未来扩展方向

### 9.1 功能扩展

- **截图 OCR**：集成截图工具，用户可截取屏幕区域进行 OCR
- **拖拽图片 OCR**：支持从桌面拖拽图片到侧边栏进行 OCR
- **批量图片 OCR**：页面内多张图片批量提取和翻译
- **OCR 历史记录**：保存 OCR 识别历史，方便回顾
- **术语表集成**：OCR 结果与用户自定义术语表联动翻译

### 9.2 技术优化

- **WebGPU 加速**：利用 WebGPU 加速 Tesseract WASM 推理
- **增量 OCR**：对大图片分区域并行 OCR
- **智能预处理**：根据图片特征自动选择最优预处理参数
- **Chrome Built-in AI**：待 Chrome OCR API 稳定后集成
- **本地 VLM**：通过 Ollama 运行本地 Vision 模型，兼顾精度和隐私

### 9.3 产品扩展

- **PDF 图片翻译**：PDF 阅读器中对扫描件页面自动 OCR
- **全页图片翻译**：自动检测页面中的文字图片并翻译
- **OCR 笔记模式**：将多张图片的 OCR 结果整合为结构化笔记

---

## 10. 参考资料

### 10.1 OCR 技术

- [Tesseract.js v5](https://github.com/naptha/tesseract.js/) - 纯 JavaScript OCR 引擎
- [Tesseract.js Chrome Extension 示例](https://github.com/jeromewu/tesseract.js-chrome-extension) - Chrome 扩展集成参考
- [Tesseract.js v5 Changes](https://github.com/naptha/tesseract.js/issues/820) - v5 变更说明
- [WebAssembly Relaxed SIMD OCR 加速](https://github.com/naptha/tesseract.js-core/issues/46)

### 10.2 LLM Vision

- [GPT-4o Vision 文档](https://platform.openai.com/docs/guides/vision) - OpenAI Vision API
- [Gemini Multimodal](https://ai.google.dev/gemini-api/docs/vision) - Google Gemini 视觉能力
- [OmniAI OCR Benchmark](https://getomni.ai/blog/ocr-benchmark) - LLM OCR 性能基准测试
- [Multimodal AI 2026 Vision Capabilities](https://www.claude5.com/news/multimodal-ai-2026-vision-capabilities-in-claude-gpt-4v-gemi)

### 10.3 Chrome Extension API

- [Chrome Context Menus](https://developer.chrome.com/docs/extensions/develop/ui/context-menu) - 右键菜单 API
- [Offscreen Documents](https://developer.chrome.com/blog/Offscreen-Documents-in-Manifest-v3/) - 离屏文档
- [Cross-origin Network Requests](https://developer.chrome.com/docs/extensions/develop/concepts/network-requests) - 跨域请求处理
- [Chrome Built-in AI APIs](https://developer.chrome.com/docs/ai/built-in-apis) - 浏览器内置 AI

### 10.4 市场产品

- [OCR Extract Text from Image](https://chromewebstore.google.com/detail/ocr-extract-text-from-ima/lejglegpfbcohncdakomljddbkljhden) - Chrome 扩展
- [ScreenAI](https://github.com/vishwajeetseven/ScreenAI) - Gemini Vision 图片分析扩展
- [scribe.js](https://github.com/scribeocr/scribe.js/) - 浏览器端 OCR 引擎

---

## 11. 总结

本文档提供了图片 OCR 识别与翻译功能的完整技术方案设计，包括：

1. **现状分析**：梳理了现有架构能力和局限性
2. **技术调研**：深入对比了 Tesseract.js v5、LLM Vision API、Chrome Built-in AI 三种技术路线
3. **架构设计**：双引擎架构，通过统一接口支持 LLM Vision 和 Tesseract.js
4. **交互设计**：右键菜单触发 → OCR 提取 → SelectionPopover 复用，最小化 UI 改动
5. **实施路线**：三阶段渐进式实施

**推荐实施顺序**：
1. **Phase 1（MVP）**：LLM Vision OCR，复用现有 VLM 基础设施，3-5 天可交付
2. **Phase 2（离线）**：Tesseract.js 集成，提供隐私优先的离线选项
3. **Phase 3（优化）**：图片预处理、区域选择、一步 OCR+翻译

**关键成功因素**：
- 最大化复用现有架构（SelectionPopover、LLMClient、消息通信）
- 双引擎策略平衡精度、速度、隐私和成本
- 渐进式实施，Phase 1 即可提供完整可用的 OCR 翻译体验

---

**文档版本**：v1.0  
**创建日期**：2026-02-26  
**作者**：Flowers Team
