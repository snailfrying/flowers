# Flowers 全文翻译（双语对照）技术方案

> **文档版本**: v1.0  
> **创建日期**: 2025-12-23  
> **作者**: Flowers 技术团队  
> **状态**: 设计阶段

---

## 📋 目录

- [一、背景与目标](#一背景与目标)
- [二、技术调研](#二技术调研)
- [三、当前架构分析](#三当前架构分析)
- [四、技术方案设计](#四技术方案设计)
- [五、技术内容保护策略（程序员视角）](#五技术内容保护策略程序员视角)
- [六、提示词与多语言集成](#六提示词与多语言集成)
- [七、实现细节](#七实现细节)
- [八、开发计划](#八开发计划)
- [九、风险评估与注意事项](#九风险评估与注意事项)
- [十、后续优化方向](#十后续优化方向)

---

## 一、背景与目标

### 1.1 业务背景

实现"全文翻译（双语对照）"是翻译类插件从"工具"向"平台"跃迁的关键功能。目前市面上最成功的标杆是 **沉浸式翻译 (Immersive Translate)**。

### 1.2 核心目标

- **非侵入式翻译**：不破坏原网页结构，双语对照显示
- **智能段落识别**：过滤导航栏、侧边栏、代码块等，只翻译正文内容
- **高性能批处理**：将多个段落合并为一次 API 请求，提升速度并节省 Token
- **动态内容支持**：监听单页应用（SPA）的动态加载，自动翻译新内容
- **用户体验优先**：流式回填、上下文感知翻译、加载动画等

### 1.3 产品定位

- **差异化优势**：基于 React + TypeScript + 无后端架构，注重隐私和用户自定义 API
- **核心竞争力**：智能批处理、上下文感知翻译、流式回填、PDF/Epub 支持

---

## 二、技术调研

### 2.1 业界方案对比

#### 2.1.1 沉浸式翻译 (Immersive Translate) - 业界天花板

**核心逻辑**：

- **DOM 注入**：在原文节点后面插入自定义 HTML 标签（如 `<span>` 或 `<div>`），而不是替换原文
- **技术栈**：传统 JavaScript 直接操作 DOM

**关键算法**：

1. **智能段落识别**：使用权重算法（类似 Readability）判断哪些是"正文"
   - 过滤导航栏、侧边栏、代码块
   - 评估文本节点的父元素特征（标签类型、类名、长度等）

2. **频率限制与分批（Batching）**：
   - 合并多个小段落为一个 API 请求
   - 防止 API 调用过快和节省 Token

3. **MutationObserver**：
   - 监听网页动态加载（如下拉刷新）
   - 实现自动翻译新出现的内容

**优势**：

- 双语对照体验极佳
- 兼容性强，支持各种复杂网页

**劣势**：

- 可能误翻译功能性文本
- 对极度动态的网站（如 React 重渲染）可能失效

#### 2.1.2 Google Translate / Edge 内置翻译

**核心逻辑**：

- **全页面替换**：递归遍历 DOM 树，直接修改 `textContent`

**缺点**：

- 破坏原文，无法双语对照
- 对动态网页（React/Vue）极不友好
- 经常导致页面崩溃或功能失效

### 2.2 技术选型总结

| 方案 | 优势 | 劣势 | 适用场景 |
|------|------|------|----------|
| **DOM 注入（沉浸式）** | 不破坏原文、双语对照、用户体验好 | 实现复杂、可能误翻 | **Flowers 推荐** |
| **全页面替换（Google）** | 实现简单 | 破坏原文、破坏功能 | 不推荐 |
| **Shadow DOM 隔离** | 样式隔离 | 复杂度高、兼容性差 | 特殊场景 |

#### 2.3 选型结论

采用 **"非侵入式 DOM 注入 + 智能批处理"** 方案。

---

## 三、当前架构分析

### 3.1 现有技术架构

```mermaid
Flowers 架构
├── Frontend (Chrome Extension)
│   ├── Content Script (content-script.ts)
│   │   ├── SelectionPopover (选文翻译)
│   │   ├── Video Subtitle Translation (字幕翻译)
│   │   └── Full Page Translation (全文翻译) [NEW]
│   ├── Background Service Worker
│   └── Side Panel (侧边栏)
│
└── Backend (无后端，Service Worker 调度)
    ├── Agent Layer
    │   └── nodes/translate.ts (翻译节点)
    ├── Services
    │   ├── LLM Client (clientFactory.ts)
    │   └── Prompt Management
    └── Storage (Chrome Storage API)
```

### 3.2 现有翻译功能分析

#### 3.2.1 选文翻译 (SelectionPopover)

**位置**：`frontend/src/components/popover/SelectionPopover.tsx`

**核心逻辑**：

1. 用户选中文本触发 `selectionchange` 事件
2. Content Script 显示 Popover，调用 `handleTranslate()`
3. 通过 `chrome.runtime.sendMessage` 发送到 Background
4. Background 调用 `translateNode()` → LLM API
5. 返回翻译结果显示在 Popover 中

**特点**：

- ✅ 用户主动触发
- ✅ 小段文本翻译
- ❌ 不支持全页面翻译
- ❌ 每次只翻译一个片段

#### 3.2.2 字幕翻译 (Video Subtitle Translation)

**位置**：`frontend/src/content/video/SubtitleTranslator.ts`

**核心逻辑**：

```typescript
// 智能批处理
private queue: SubtitleCue[] = [];
private batchDelay = 400; // 等待字幕完整

async addSubtitle(cue: SubtitleCue) {
    // 检测是否是同一句话的延续
    const isExtension = newText.startsWith(this.streamBuffer);
    if (isExtension) {
        this.streamBuffer = newText; // 更新缓冲区
        this.resetTimer(); // 重置计时器
    } else {
        this.triggerTranslation(this.streamBuffer); // 翻译上一句
        this.streamBuffer = newText; // 开始新句
    }
}

private async processBatch() {
    // 合并多个字幕文本
    const textToTranslate = texts.join('\n');
    const translatedBlock = await this.callTranslateApi(textToTranslate);
    // 分割结果并缓存
    const translations = translatedBlock.split('\n');
}
```

**特点**：

- ✅ **智能批处理**：合并连续字幕
- ✅ **缓存机制**：避免重复翻译
- ✅ **流式处理**：逐句翻译，不等待整段
- ✅ **错误恢复**：Extension context invalidated 检测

**可复用性**：

- ✅ 批处理逻辑可移植到全文翻译
- ✅ 缓存机制可直接复用
- ✅ 错误处理机制成熟

#### 3.2.3 翻译节点 (translateNode)

**位置**：`backend/src/agent/nodes/translate.ts`

**核心功能**：

1. **模式检测**：
   - `mode: 'subtitle'` → 字幕翻译模式（简洁）
   - 默认模式 → 普通翻译
   - 词典模式 → 短语翻译（≤3词）

2. **缓存机制**：

   ```typescript
   const translateCache = new LRUCache<string, string>({
       maxSize: 100,
       ttl: 30 * 60 * 1000 // 30 分钟
   });
   ```

3. **Prompt 策略**：
   - `translate_subtitle_system` / `translate_subtitle_user`
   - `translate_dict_system` / `translate_dict_user`
   - `translate_system` / `translate_user`

**可扩展性**：

- ✅ 支持添加新模式：`mode: 'full-page'`
- ✅ 缓存机制可处理全文翻译
- ✅ Prompt 体系易扩展

### 3.3 架构优势

| 优势 | 说明 |
|------|------|
| **模块化设计** | Translate Node 独立，易扩展 |
| **缓存机制** | LRU Cache 成熟，可直接复用 |
| **智能批处理** | 字幕翻译已验证，可移植 |
| **错误处理** | Extension context 检测完善 |
| **i18n 支持** | 多语言 Prompt 自动切换 |

### 3.4 架构限制

| 限制 | 影响 | 解决方案 |
|------|------|----------|
| **Service Worker 生命周期短** | 长时间翻译可能中断 | 分批处理 + 队列管理 |
| **Content Script 无法持久化** | 页面刷新后丢失状态 | 使用 Chrome Storage 保存进度 |
| **DOM 操作复杂度** | React 页面可能重新渲染 | MutationObserver 监听 + 标记机制 |
| **API 调用频率限制** | 过多请求可能被封 | 批处理 + 节流 + 队列 |

---

## 四、技术方案设计

### 4.1 整体架构

```mermaid
全文翻译架构
┌─────────────────────────────────────────────────────────┐
│                     Content Script                       │
├─────────────────────────────────────────────────────────┤
│  ┌─────────────────────────────────────────────────┐    │
│  │  FullPageTranslationManager                     │    │
│  │  - 控制翻译流程                                  │    │
│  │  - 管理翻译状态                                  │    │
│  └──────────────┬──────────────────────────────────┘    │
│                 │                                        │
│  ┌──────────────▼──────────────┬─────────────────┐      │
│  │  NodeSelector               │  DOMInjector    │      │
│  │  - 识别可翻译节点           │  - 注入翻译结果 │      │
│  │  - 过滤导航/代码块          │  - 样式管理     │      │
│  └──────────────┬──────────────┴─────────────────┘      │
│                 │                                        │
│  ┌──────────────▼────────────────────────────────┐      │
│  │  BatchProcessor                               │      │
│  │  - 合并段落请求                               │      │
│  │  - 队列管理                                   │      │
│  │  - 节流控制                                   │      │
│  └──────────────┬────────────────────────────────┘      │
└─────────────────┼────────────────────────────────────────┘
                  │
    chrome.runtime.sendMessage
                  │
┌─────────────────▼────────────────────────────────────────┐
│                 Service Worker                           │
├──────────────────────────────────────────────────────────┤
│  message-handler.ts                                      │
│  - 接收 'translateFullPage' 消息                         │
│  - 调用 CoreAgent.translate()                            │
└──────────────────┬───────────────────────────────────────┘
                   │
┌──────────────────▼───────────────────────────────────────┐
│                 Backend Layer                            │
├──────────────────────────────────────────────────────────┤
│  CoreAgent                                               │
│  └── translateNode (mode: 'full-page')                   │
│      - Prompt: translate_fullpage_system/user            │
│      - LRU Cache                                         │
│      - Batch handling                                    │
└──────────────────────────────────────────────────────────┘
```

### 4.2 核心模块设计

#### 4.2.1 FullPageTranslationManager

**职责**：

- 管理整个全文翻译流程
- 控制开关状态
- 协调各子模块

**接口**：

```typescript
class FullPageTranslationManager {
    private enabled: boolean = false;
    private observer: MutationObserver | null = null;
    
    constructor(private targetLang: string) {}
    
    // 启动全文翻译
    async start(): Promise<void>;
    
    // 停止全文翻译
    stop(): void;
    
    // 切换翻译状态
    toggle(): void;
    
    // 更新目标语言
    setTargetLang(lang: string): void;
}
```

#### 4.2.2 NodeSelector

**职责**：

- 识别页面中的可翻译节点
- 过滤不需要翻译的元素
- 返回待翻译文本节点列表

**算法**：

```typescript
interface TranslatableNode {
    element: HTMLElement;
    textNode: Text;
    text: string;
    id: string; // 唯一标识
    priority: number; // 权重
}

class NodeSelector {
    // 选择可翻译节点
    selectNodes(): TranslatableNode[] {
        const nodes: TranslatableNode[] = [];
        
        // 1. 使用 Readability 或自定义算法找到主内容区
        const mainContent = this.findMainContent();
        
        // 2. 遍历文本节点
        const walker = document.createTreeWalker(
            mainContent,
            NodeFilter.SHOW_TEXT,
            {
                acceptNode: (node) => {
                    return this.shouldTranslate(node) 
                        ? NodeFilter.FILTER_ACCEPT 
                        : NodeFilter.FILTER_REJECT;
                }
            }
        );
        
        let currentNode: Text | null;
        while (currentNode = walker.nextNode() as Text) {
            const text = currentNode.textContent?.trim();
            if (text && text.length >= 10) { // 最小长度过滤
                nodes.push({
                    element: currentNode.parentElement!,
                    textNode: currentNode,
                    text: text,
                    id: this.generateNodeId(currentNode),
                    priority: this.calculatePriority(currentNode)
                });
            }
        }
        
        return nodes.sort((a, b) => b.priority - a.priority);
    }
    
    // 判断是否应该翻译
    private shouldTranslate(node: Node): boolean {
        const parent = node.parentElement;
        if (!parent) return false;
        
        const tag = parent.tagName.toLowerCase();
        
        // 1. 基础黑名单标签 (功能性/不可见)
        const blacklist = [
            'script', 'style', 'svg', 'canvas', 'video', 'audio',
            'nav', 'header', 'footer', 'aside', 'noscript'
        ];
        if (blacklist.includes(tag)) return false;

        // 2. 技术内容保护 (代码/公式/图表)
        // 这些内容通常由专门的渲染引擎处理，翻译会破坏其结构
        const techBlacklist = [
            'code', 'pre', 'kbd', 'samp', 'var', 'math'
        ];
        if (techBlacklist.includes(tag)) return false;

        // 3. 特定类名过滤 (如 Mermaid, KaTeX, Highlight.js)
        const techClasses = [
            'mermaid', 'katex', 'highlight', 'hljs', 'syntax-highlight'
        ];
        
        // 检查自身及祖先元素
        let ancestor: HTMLElement | null = parent;
        for (let i = 0; i < 5 && ancestor; i++) {
            const className = ancestor.className || '';
            const id = ancestor.id || '';
            
            // 检查黑名单标签
            if (blacklist.includes(ancestor.tagName.toLowerCase())) return false;
            if (techBlacklist.includes(ancestor.tagName.toLowerCase())) return false;

            // 检查技术类名
            if (techClasses.some(cls => className.includes(cls))) return false;

            // 检查导航/侧边栏特征
            if (className.match(/nav|menu|sidebar|footer|header/) ||
                id.match(/nav|menu|sidebar|footer|header/)) {
                return false;
            }
            
            // 检查是否已被翻译标记
            if (ancestor.hasAttribute('data-flowers-ignore')) return false;

            ancestor = ancestor.parentElement;
        }
        
        return true;
    }
    
    // 计算节点权重（类似 Readability）
    private calculatePriority(node: Text): number {
        let score = 0;
        const parent = node.parentElement!;
        const tag = parent.tagName.toLowerCase();
        
        // 标签权重
        const tagScores: Record<string, number> = {
            'p': 10,
            'div': 5,
            'article': 15,
            'main': 15,
            'h1': 8, 'h2': 7, 'h3': 6,
            'li': 4,
            'td': 3
        };
        
        score += tagScores[tag] || 0;
        
        // 文本长度权重
        const text = node.textContent?.trim() || '';
        if (text.length > 100) score += 5;
        if (text.length > 300) score += 10;
        
        // 祖先节点权重
        let ancestor = parent;
        for (let i = 0; i < 3 && ancestor; i++) {
            const aTag = ancestor.tagName.toLowerCase();
            if (aTag === 'article' || aTag === 'main') score += 10;
            ancestor = ancestor.parentElement!;
        }
        
        return score;
    }
    
    // 生成唯一 ID
    private generateNodeId(node: Text): string {
        const path = this.getNodePath(node);
        return `flowers-trans-${btoa(path).slice(0, 16)}`;
    }
    
    // 获取节点路径
    private getNodePath(node: Node): string {
        const path: string[] = [];
        let current: Node | null = node;
        while (current && current !== document.body) {
            if (current.parentNode) {
                const siblings = Array.from(current.parentNode.childNodes);
                const index = siblings.indexOf(current);
                path.unshift(`${current.nodeName}[${index}]`);
            }
            current = current.parentNode;
        }
        return path.join('/');
    }
}
```

#### 4.2.3 BatchProcessor

**职责**：

- 合并多个段落为一次 API 请求
- 管理翻译队列
- 节流控制

**实现**（复用字幕翻译逻辑）：

```typescript
interface TranslationTask {
    node: TranslatableNode;
    resolve: (translation: string) => void;
    reject: (error: Error) => void;
}

class BatchProcessor {
    private queue: TranslationTask[] = [];
    private batchTimer: number | null = null;
    private cache = new Map<string, string>();
    
    constructor(
        private targetLang: string,
        private batchDelay = 500, // 等待时长
        private maxBatchSize = 10 // 每批最多段落数
    ) {}
    
    // 添加翻译任务
    async addTask(node: TranslatableNode): Promise<string> {
        // 检查缓存
        const cached = this.cache.get(node.text);
        if (cached) return cached;
        
        return new Promise<string>((resolve, reject) => {
            this.queue.push({ node, resolve, reject });
            
            // 重置批处理计时器
            if (this.batchTimer) clearTimeout(this.batchTimer);
            
            // 如果队列太长，立即处理
            if (this.queue.length >= this.maxBatchSize) {
                this.processBatch();
            } else {
                this.batchTimer = window.setTimeout(() => {
                    this.processBatch();
                }, this.batchDelay);
            }
        });
    }
    
    // 处理批次
    private async processBatch() {
        if (this.queue.length === 0) return;
        
        const batch = this.queue.splice(0, this.maxBatchSize);
        const texts = batch.map(task => task.node.text);
        
        try {
            // 调用 API（复用字幕翻译逻辑）
            const translatedBlock = await this.callTranslateApi(texts);
            
            // 分割结果
            const translations = translatedBlock.split('\n').map(t => t.trim());
            
            batch.forEach((task, index) => {
                const translation = translations[index] || translatedBlock;
                this.cache.set(task.node.text, translation);
                task.resolve(translation);
            });
        } catch (error) {
            console.error('[BatchProcessor] Translation failed:', error);
            batch.forEach(task => task.reject(error as Error));
        }
    }
    
    // 调用翻译 API
    private callTranslateApi(texts: string[]): Promise<string> {
        return new Promise((resolve, reject) => {
            chrome.runtime.sendMessage({
                action: 'translateFullPage',
                texts: texts, // 发送数组
                targetLang: this.targetLang
            }, (response) => {
                if (chrome.runtime.lastError) {
                    reject(chrome.runtime.lastError);
                } else if (response?.ok) {
                    resolve(response.result);
                } else {
                    reject(new Error(response?.error || 'Unknown error'));
                }
            });
        });
    }
}
```

#### 4.2.4 DOMInjector

**职责**：

- 在原文后注入翻译结果
- 管理翻译样式
- 支持显示/隐藏切换

**实现**：

```typescript
class DOMInjector {
    private injectedNodes = new Map<string, HTMLElement>();
    
    // 注入翻译
    inject(node: TranslatableNode, translation: string) {
        // 检查是否已注入
        if (this.injectedNodes.has(node.id)) {
            this.updateTranslation(node.id, translation);
            return;
        }
        
        // 创建翻译容器
        const translationSpan = document.createElement('span');
        translationSpan.className = 'flowers-translation';
        translationSpan.setAttribute('data-flowers-id', node.id);
        translationSpan.textContent = translation;
        
        // 插入到原文后
        if (node.textNode.nextSibling) {
            node.element.insertBefore(
                translationSpan, 
                node.textNode.nextSibling
            );
        } else {
            node.element.appendChild(translationSpan);
        }
        
        this.injectedNodes.set(node.id, translationSpan);
    }
    
    // 更新翻译
    private updateTranslation(nodeId: string, translation: string) {
        const element = this.injectedNodes.get(nodeId);
        if (element) {
            element.textContent = translation;
        }
    }
    
    // 移除所有翻译
    removeAll() {
        this.injectedNodes.forEach(element => element.remove());
        this.injectedNodes.clear();
    }
    
    // 切换显示/隐藏
    toggle(visible: boolean) {
        this.injectedNodes.forEach(element => {
            element.style.display = visible ? 'block' : 'none';
        });
    }
    
    // 注入样式
    static injectStyles() {
        if (document.getElementById('flowers-translation-styles')) return;
        
        const style = document.createElement('style');
        style.id = 'flowers-translation-styles';
        style.textContent = `
            .flowers-translation {
                display: block;
                color: #666;
                font-size: 0.9em;
                margin-top: 4px;
                line-height: 1.5;
                padding: 4px 0;
                border-left: 3px solid #e0e0e0;
                padding-left: 8px;
                font-style: italic;
            }
            
            @media (prefers-color-scheme: dark) {
                .flowers-translation {
                    color: #aaa;
                    border-left-color: #444;
                }
            }
            
            .flowers-translation-loading {
                opacity: 0.5;
                filter: blur(2px);
            }
        `;
        document.head.appendChild(style);
    }
}
```

### 4.3 MutationObserver 监听

**职责**：监听动态内容加载（SPA）

```typescript
class DynamicContentObserver {
    private observer: MutationObserver | null = null;
    
    constructor(
        private onNewContent: (nodes: TranslatableNode[]) => void
    ) {}
    
    start() {
        this.observer = new MutationObserver((mutations) => {
            const newNodes: Node[] = [];
            
            mutations.forEach(mutation => {
                mutation.addedNodes.forEach(node => {
                    if (node.nodeType === Node.ELEMENT_NODE) {
                        newNodes.push(node);
                    }
                });
            });
            
            if (newNodes.length > 0) {
                // 使用 throttle 避免频繁触发
                this.handleNewNodes(newNodes);
            }
        });
        
        this.observer.observe(document.body, {
            childList: true,
            subtree: true
        });
    }
    
    stop() {
        this.observer?.disconnect();
        this.observer = null;
    }
    
    private handleNewNodes = this.throttle((nodes: Node[]) => {
        const selector = new NodeSelector();
        const translatable = nodes.flatMap(node => {
            const container = node as HTMLElement;
            return selector.selectNodesInContainer(container);
        });
        
        if (translatable.length > 0) {
            this.onNewContent(translatable);
        }
    }, 1000);
    
    private throttle<T extends (...args: any[]) => void>(
        func: T, 
        wait: number
    ): T {
        let timeout: number | null = null;
        return ((...args: any[]) => {
            if (timeout) clearTimeout(timeout);
            timeout = window.setTimeout(() => func(...args), wait);
        }) as T;
    }
}
```

### 4.4 Backend 扩展

#### 4.4.1 新增 Message Handler

**位置**：`backend/src/services/message-handler.ts`

```typescript
// 添加新消息类型
case 'translateFullPage': {
    const { texts, targetLang } = message;
    
    // 合并多段文本
    const combinedText = texts.join('\n---\n');
    
    const result = await coreAgent.translate({
        text: combinedText,
        targetLang: targetLang,
        mode: 'full-page', // 新模式
        llmConfig: llmConfig
    });
    
    sendResponse({ ok: true, result });
    break;
}
```

#### 4.4.2 新增 Prompt

**位置**：`backend/src/services/prompts/`

```typescript
// translate_fullpage_system.ts
export const translate_fullpage_system = {
    en: `You are a professional translator. Translate the following text segments to {{targetLang}}.

Requirements:
1. Each segment is separated by "---"
2. Preserve the order and structure
3. Return translations separated by "---"
4. Keep the same number of segments as input
5. Maintain context across segments for consistency`,
    
    zh: `你是一位专业的翻译官。请将以下文本片段翻译为{{targetLang}}。

要求：
1. 每个片段之间用"---"分隔
2. 保持顺序和结构
3. 返回的翻译用"---"分隔
4. 保持与输入相同的片段数量
5. 跨片段保持上下文一致性`,
};

// translate_fullpage_user.ts
export const translate_fullpage_user = {
    en: `Translate to {{targetLang}}:\n\n{{text}}`,
    zh: `翻译为{{targetLang}}：\n\n{{text}}`
};
```

---

## 五、技术内容保护策略（程序员视角）

作为程序员，我们深知代码块、公式和架构图的精确性至关重要。翻译这些内容不仅没有意义，还会导致语法错误或渲染失败。

### 5.1 核心原则：不翻译即是最好的翻译

1. **DOM 级隔离**：在 `NodeSelector` 阶段直接跳过 `<code>`、`<pre>`、`.mermaid` 等节点。这是最稳健的方法，因为 LLM 永远不会看到这些内容。
2. **占位符保护**：对于混合在文本中的技术术语（如 `inline code`），如果 LLM 翻译了它们，可能会导致含义模糊。
3. **Markdown 敏感性**：如果页面内容本身是 Markdown 渲染的，我们需要保护 Markdown 语法符号（如 `[link](url)`、`**bold**`）。

### 5.2 复杂块的处理：占位符机制

对于某些必须保持结构完整的块，我们采用“提取-占位-回填”策略：

```typescript
class TechContentProtector {
    private placeholders = new Map<string, string>();
    private counter = 0;

    // 保护技术内容
    protect(text: string): string {
        // 保护行内代码 `code`
        return text.replace(/`([^`]+)`/g, (match) => {
            const id = `__FLOWERS_TECH_${this.counter++}__`;
            this.placeholders.set(id, match);
            return id;
        });
    }

    // 恢复技术内容
    restore(translatedText: string): string {
        let result = translatedText;
        this.placeholders.forEach((original, id) => {
            result = result.replace(id, original);
        });
        return result;
    }
}
```

### 5.3 架构图与流程图 (Mermaid/SVG)

- **Mermaid**: 识别 `.mermaid` 类名，直接跳过。
- **SVG**: 识别 `<svg>` 标签，直接跳过。
- **Canvas**: 识别 `<canvas>` 标签，直接跳过。

---

## 六、提示词与多语言集成

Flowers 已经拥有一套完善的提示词管理和中英管理系统，全文翻译必须深度集成。

### 6.1 提示词动态渲染

利用现有的 `getPrompt` 和 `render` 引擎，支持用户自定义全文翻译的 Prompt。

```typescript
// backend/src/agent/nodes/translate.ts

const systemPrompt = getPrompt('translate_fullpage_system', lang, {
    targetLang: params.targetLang,
    context: pageContext,
    style: 'technical' // 默认为技术风格
});
```

### 6.2 术语表集成 (Glossary)

如果用户在设置中定义了术语表（Terminology），我们需要在翻译每一批次时将其注入。

```typescript
// 构造 Prompt 时注入术语
const userPrompt = getPrompt('translate_fullpage_user', lang, {
    text: combinedText,
    glossary: userGlossary.map(g => `${g.src} -> ${g.dst}`).join('\n')
});
```

### 6.3 语言感知 (Language Awareness)

- **自动检测源语言**：如果用户未指定，利用 LLM 的自动检测能力。
- **目标语言同步**：从 `i18n.language` 或用户设置中实时同步。

---

## 七、实现细节

### 5.1 文件结构

```text
frontend/src/content/
├── fullpage/                          # 新增目录
│   ├── FullPageTranslationManager.ts  # 主管理器：负责生命周期、设置同步
│   ├── NodeSelector.ts                # 节点选择器：负责识别、过滤、权重计算
│   ├── BatchProcessor.ts              # 批处理器：负责队列、重试、消息通信
│   ├── DOMInjector.ts                 # DOM 注入器：负责样式注入、双语对照渲染
│   ├── DynamicContentObserver.ts      # 动态内容监听：负责 MutationObserver 节流处理
│   └── types.ts                       # 类型定义：前端内部类型
│
├── content-script.ts                  # 修改：集成 FullPageTranslationManager
└── content-script.css                 # 修改：添加 .flowers-translated 等样式

backend/src/
├── types.ts                           # 修改：添加 mode: 'full-page' 和相关 Params
├── services/
│   ├── message-handler.ts             # 修改：添加 translateFullPage action
│   └── prompts/
│       ├── translate_fullpage_system.ts  # 新增：系统提示词
│       └── translate_fullpage_user.ts    # 新增：用户提示词（支持上下文和术语）
│
└── agent/nodes/
    └── translate.ts                   # 修改：支持 mode: 'full-page'
```

#### 7.2.1 UI 入口

```typescript
// frontend/src/components/settings/GeneralSettings.tsx
<div className="flex items-center justify-between">
    <Label>全文翻译（双语对照）</Label>
    <Switch 
        checked={fullPageTranslationEnabled}
        onCheckedChange={handleToggleFullPageTranslation}
    />
</div>
```

#### 7.2.2 页面内浮动按钮

```typescript
// 类似字幕翻译的 Toggle Button
class FullPageToggleButton {
    private button: HTMLButtonElement | null = null;
    
    show() {
        this.button = document.createElement('button');
        this.button.className = 'flowers-fullpage-toggle';
        this.button.innerHTML = '🌐 翻译';
        this.button.onclick = this.handleToggle;
        
        // 固定在右下角
        this.button.style.cssText = `
            position: fixed;
            bottom: 20px;
            right: 20px;
            z-index: 2147483646;
            padding: 12px 20px;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            border: none;
            border-radius: 24px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.15);
            cursor: pointer;
            font-size: 14px;
            font-weight: 500;
        `;
        
        document.body.appendChild(this.button);
    }
}
```

**推荐**：同时支持两种方式，设置中可选择默认行为。

#### 7.2.3 消息通信规范

遵循项目现有的 `MessageRequest` 和 `Result` 规范：

```typescript
// backend/src/types.ts 修改建议
export interface TranslateParams {
  text: string;
  targetLang: string;
  sourceLang?: string;
  llmConfig?: LLMConfig;
  mode?: 'default' | 'subtitle' | 'full-page'; // 新增 full-page
  context?: string; // 全文翻译上下文（如页面标题、描述）
  glossary?: string; // 术语表字符串（由前端根据页面内容筛选后传入）
}

// 前端发送翻译请求 (BatchProcessor.ts)
chrome.runtime.sendMessage({
  action: 'translateFullPage',
  params: {
    text: texts.join('\n---\n'), // 使用明确的分隔符
    targetLang: 'zh',
    context: extractPageContext(),
    mode: 'full-page'
  }
}, (response: Result<string>) => {
  if (response.success && response.data) {
    const translations = response.data.split('\n---\n');
    // 确保返回数量一致
    if (translations.length === texts.length) {
      // 正常回填
    }
  }
});
```

#### 7.2.4 设置同步与生命周期

复用 `content-script.ts` 的 `syncSettings` 逻辑，确保全文翻译开关实时生效：

```typescript
class FullPageTranslationManager {
    private isEnabled = false;

    constructor() {
        this.initSettingsListener();
    }

    private async initSettingsListener() {
        // 初始加载
        const data = await chrome.storage.local.get('chroma-notes-settings');
        this.updateState(data['chroma-notes-settings']);

        // 监听变化
        chrome.storage.onChanged.addListener((changes, area) => {
            if (area === 'local' && changes['chroma-notes-settings']) {
                this.updateState(changes['chroma-notes-settings'].newValue);
            }
        });
    }

    private updateState(rawSettings: any) {
        const settings = normalizeSettingsPayload(rawSettings);
        const shouldEnable = settings?.fullPageEnabled ?? false;
        
        if (shouldEnable && !this.isEnabled) {
            this.start();
        } else if (!shouldEnable && this.isEnabled) {
            this.stop();
        }
        this.isEnabled = shouldEnable;
    }
}
```

#### 5.2.2 翻译流程

```
用户点击"翻译" 
    → 显示加载提示 
    → NodeSelector 识别可翻译节点 
    → 在原文旁显示"翻译中..."占位符 
    → BatchProcessor 分批翻译 
    → DOMInjector 流式注入结果 
    → 完成提示
```

### 5.3 性能优化

#### 5.3.1 流式回填

**目标**：第一个段落翻译完立即显示，而不是等所有段落

```typescript
class BatchProcessor {
    private async processBatch() {
        const batch = this.queue.splice(0, this.maxBatchSize);
        
        // 流式处理
        for (let i = 0; i < batch.length; i += 5) { // 每 5 个一组
            const subBatch = batch.slice(i, i + 5);
            const texts = subBatch.map(task => task.node.text);
            
            const translatedBlock = await this.callTranslateApi(texts);
            const translations = translatedBlock.split('\n');
            
            // 立即回填这一组
            subBatch.forEach((task, index) => {
                const translation = translations[index] || translatedBlock;
                this.cache.set(task.node.text, translation);
                task.resolve(translation);
            });
        }
    }
}
```

#### 5.3.2 上下文敏感翻译

**痛点**：逐句翻译容易丢失上下文

**解决方案**：在 Prompt 中携带页面标题和关键词

```typescript
// 提取页面上下文
function extractPageContext(): string {
    const title = document.title || '';
    const h1 = document.querySelector('h1')?.textContent || '';
    const meta = document.querySelector('meta[name="description"]')
        ?.getAttribute('content') || '';
    
    return `标题: ${title}
主题: ${h1}
简介: ${meta}`.trim();
}

// 在翻译时附加上下文
const prompt = `
网页上下文：
${extractPageContext()}

请翻译以下内容，保持术语一致性：
${texts.join('\n---\n')}
`;
```

#### 5.3.3 智能队列管理

**目标**：优先翻译用户可见区域

```typescript
class BatchProcessor {
    private queue: TranslationTask[] = [];
    
    addTask(node: TranslatableNode): Promise<string> {
        // 检查节点是否在视口内
        const rect = node.element.getBoundingClientRect();
        const isVisible = rect.top < window.innerHeight && rect.bottom > 0;
        
        const task = { node, resolve, reject, priority: isVisible ? 10 : 1 };
        
        // 按优先级插入队列
        const insertIndex = this.queue.findIndex(t => t.priority < task.priority);
        if (insertIndex === -1) {
            this.queue.push(task);
        } else {
            this.queue.splice(insertIndex, 0, task);
        }
        
        this.processBatch();
    }
}
```

### 5.4 错误处理

#### 5.4.1 网络错误

```typescript
class BatchProcessor {
    private retryCount = new Map<string, number>();
    private maxRetries = 3;
    
    private async processBatch() {
        try {
            // ... 翻译逻辑
        } catch (error) {
            console.error('[BatchProcessor] Translation failed:', error);
            
            // 重试机制
            batch.forEach(task => {
                const count = this.retryCount.get(task.node.id) || 0;
                if (count < this.maxRetries) {
                    this.retryCount.set(task.node.id, count + 1);
                    this.queue.push(task); // 重新入队
                } else {
                    task.reject(new Error('翻译失败，请稍后重试'));
                }
            });
        }
    }
}
```

#### 5.4.2 Extension Context Invalidated

**复用字幕翻译的检测机制**：

```typescript
private isContextInvalidated = false;

private callTranslateApi(texts: string[]): Promise<string> {
    if (this.isContextInvalidated) {
        return Promise.reject(new Error('Extension context invalidated'));
    }
    
    return new Promise((resolve, reject) => {
        try {
            chrome.runtime.sendMessage({ /* ... */ }, (response) => {
                if (chrome.runtime.lastError) {
                    const msg = chrome.runtime.lastError.message || '';
                    if (msg.includes('Extension context invalidated')) {
                        this.isContextInvalidated = true;
                        // 提示用户刷新页面
                        this.showRefreshPrompt();
                    }
                    reject(chrome.runtime.lastError);
                }
                // ...
            });
        } catch (e: any) {
            if (e.message?.includes('Extension context invalidated')) {
                this.isContextInvalidated = true;
            }
            reject(e);
        }
    });
}

private showRefreshPrompt() {
    const toast = document.createElement('div');
    toast.textContent = '插件已更新，请刷新页面以继续使用翻译功能';
    toast.style.cssText = `
        position: fixed; top: 20px; right: 20px; z-index: 9999;
        padding: 16px; background: #ff6b6b; color: white;
        border-radius: 8px; box-shadow: 0 4px 12px rgba(0,0,0,0.2);
    `;
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 5000);
}
```

---

## 八、开发计划

### 6.1 分阶段实现

#### 阶段 1：核心功能 MVP（预计 3-4 天）

**目标**：实现基础的全文翻译功能

**任务清单**：

| 任务 | 负责人 | 预计工时 | 优先级 |
|------|--------|----------|--------|
| 创建 `fullpage/` 目录结构 | 开发 | 0.5h | P0 |
| 实现 `NodeSelector` 基础版 | 开发 | 4h | P0 |
| 实现 `BatchProcessor`（复用字幕逻辑） | 开发 | 3h | P0 |
| 实现 `DOMInjector` 基础版 | 开发 | 3h | P0 |
| 实现 `FullPageTranslationManager` | 开发 | 4h | P0 |
| Backend: 添加 `translateFullPage` handler | 开发 | 2h | P0 |
| Backend: 新增 `full-page` mode 和 Prompt | 开发 | 2h | P0 |
| UI: 侧边栏添加全文翻译开关 | 开发 | 2h | P0 |
| 测试：简单网页（如 Wikipedia） | 测试 | 2h | P0 |

**验收标准**：

- ✅ 能够翻译简单静态网页（如 Wikipedia 文章）
- ✅ 双语对照显示正常
- ✅ 开关功能正常
- ✅ 无明显性能问题

#### 阶段 2：优化与增强（预计 2-3 天）

**目标**：提升翻译质量和用户体验

**任务清单**：

| 任务 | 负责人 | 预计工时 | 优先级 |
|------|--------|----------|--------|
| 优化 `NodeSelector` 权重算法 | 开发 | 4h | P1 |
| 实现流式回填 | 开发 | 3h | P1 |
| 实现上下文敏感翻译 | 开发 | 4h | P1 |
| 添加加载动画和进度提示 | 开发 | 2h | P1 |
| 实现错误重试机制 | 开发 | 2h | P1 |
| 优化样式（响应式、暗色模式） | 开发 | 2h | P1 |
| 测试：复杂网页（如技术博客、新闻网站） | 测试 | 4h | P1 |

**验收标准**：

- ✅ 翻译准确率高，无误翻导航/代码块
- ✅ 翻译速度快，用户体验流畅
- ✅ 样式美观，适配暗色模式
- ✅ 错误处理完善

#### 阶段 3：动态网页支持（预计 2 天）

**目标**：支持 SPA 和动态加载内容

**任务清单**：

| 任务 | 负责人 | 预计工时 | 优先级 |
|------|--------|----------|--------|
| 实现 `DynamicContentObserver` | 开发 | 4h | P2 |
| 集成到 `FullPageTranslationManager` | 开发 | 2h | P2 |
| 添加节流控制 | 开发 | 2h | P2 |
| 测试：Twitter, Reddit 等 SPA | 测试 | 4h | P2 |

**验收标准**：

- ✅ 自动翻译滚动加载的新内容
- ✅ 不影响页面性能
- ✅ 无重复翻译

#### 阶段 4：高级功能（预计 3-4 天）

**目标**：差异化功能

**任务清单**：

| 任务 | 负责人 | 预计工时 | 优先级 |
|------|--------|----------|--------|
| PDF 翻译支持（基于 pdf.js） | 开发 | 8h | P3 |
| 翻译结果导出（Markdown） | 开发 | 4h | P3 |
| 翻译历史记录 | 开发 | 4h | P3 |
| 自定义黑名单网站 | 开发 | 2h | P3 |

**验收标准**：

- ✅ 可以翻译在线 PDF
- ✅ 导出功能正常
- ✅ 历史记录可查看和管理

### 6.2 总体时间估算

| 阶段 | 预计耗时 | 累计耗时 |
|------|----------|----------|
| 阶段 1: MVP | 3-4 天 | 3-4 天 |
| 阶段 2: 优化 | 2-3 天 | 5-7 天 |
| 阶段 3: 动态网页 | 2 天 | 7-9 天 |
| 阶段 4: 高级功能 | 3-4 天 | 10-13 天 |
| **总计** | **10-13 天** | - |

**说明**：

- 按每天 6-8 小时有效开发时间计算
- 包含开发、测试、调试时间
- 不包含 Code Review 和文档编写时间

---

## 九、风险评估与注意事项

### 7.1 技术风险

| 风险 | 影响 | 概率 | 应对措施 |
|------|------|------|----------|
| **React 页面重渲染导致注入丢失** | 高 | 中 | 使用 MutationObserver 监听；增加节点标记机制 |
| **API 调用频率过高被封** | 高 | 低 | 批处理 + 缓存；限制每分钟请求数 |
| **Service Worker 生命周期中断** | 中 | 中 | 使用 Chrome Storage 保存队列状态；支持断点续传 |
| **复杂网页结构识别失败** | 中 | 高 | 提供手动选择区域功能；持续优化权重算法 |
| **翻译质量不稳定** | 中 | 中 | 优化 Prompt；增加上下文信息；支持重新翻译 |

### 7.2 基于当前架构的注意事项

#### 7.2.1 Chrome Storage 限制

**问题**：Chrome Storage Local 有大小限制（5MB）

**解决方案**：

```typescript
// 只缓存关键数据
class CacheManager {
    async saveCache() {
        const cache = Array.from(this.translationCache.entries())
            .slice(0, 100); // 只保存最近 100 条
        
        await chrome.storage.local.set({
            'flowers_translation_cache': cache
        });
    }
}
```

#### 7.2.2 Content Script 资源消耗

**问题**：大量 DOM 操作可能影响页面性能

**解决方案**：

```typescript
// 使用 requestIdleCallback 进行非关键操作
class FullPageTranslationManager {
    private translateInIdle(nodes: TranslatableNode[]) {
        const processNode = (deadline: IdleDeadline) => {
            while (deadline.timeRemaining() > 0 && nodes.length > 0) {
                const node = nodes.shift()!;
                this.translateNode(node);
            }
            
            if (nodes.length > 0) {
                requestIdleCallback(processNode);
            }
        };
        
        requestIdleCallback(processNode);
    }
}
```

#### 7.2.3 与现有选文翻译的冲突

**问题**：全文翻译开启时，用户选文可能触发重复翻译

**解决方案**：

```typescript
// 在 content-script.ts 中添加冲突检测
let fullPageTranslationActive = false;

document.addEventListener('selectionchange', () => {
    if (fullPageTranslationActive) {
        // 全文翻译激活时，禁用选文弹窗
        return;
    }
    // ... 原有逻辑
});
```

#### 7.2.4 i18n 支持

**问题**：所有 UI 文本和 Prompt 需要支持多语言

**解决方案**：

```typescript
// frontend/src/shared/i18n/en.json
{
    "fullPageTranslation": {
        "title": "Full Page Translation",
        "enable": "Enable bilingual translation",
        "translating": "Translating...",
        "complete": "Translation complete",
        "error": "Translation failed, please try again",
        "refreshPrompt": "Extension updated, please refresh to continue"
    }
}

// frontend/src/shared/i18n/zh.json
{
    "fullPageTranslation": {
        "title": "全文翻译",
        "enable": "开启双语对照",
        "translating": "翻译中...",
        "complete": "翻译完成",
        "error": "翻译失败，请重试",
        "refreshPrompt": "插件已更新，请刷新页面以继续使用"
    }
}
```

### 7.3 用户体验注意事项

#### 7.3.1 首次使用引导

**实现**：

```typescript
class OnboardingGuide {
    async show() {
        const hasShown = await chrome.storage.local.get('fullpage_onboarding_shown');
        if (hasShown) return;
        
        // 显示引导弹窗
        const guide = document.createElement('div');
        guide.innerHTML = `
            <div class="flowers-onboarding">
                <h3>🌸 全文翻译功能已开启</h3>
                <p>点击右下角的翻译按钮即可开始</p>
                <button onclick="this.parentElement.remove()">知道了</button>
            </div>
        `;
        document.body.appendChild(guide);
        
        await chrome.storage.local.set({ 'fullpage_onboarding_shown': true });
    }
}
```

#### 7.3.2 网站兼容性黑名单

**实现**：

```typescript
class SiteBlacklist {
    private blacklist = [
        'mail.google.com',
        'outlook.office.com',
        'web.whatsapp.com'
    ];
    
    isBlacklisted(url: string): boolean {
        return this.blacklist.some(site => url.includes(site));
    }
    
    async addToBlacklist(url: string) {
        const custom = await chrome.storage.local.get('custom_blacklist');
        const list = custom['custom_blacklist'] || [];
        list.push(new URL(url).hostname);
        await chrome.storage.local.set({ 'custom_blacklist': list });
    }
}
```

---

## 十、后续优化方向

### 8.1 生产力功能

#### 8.1.1 PDF 翻译

**技术方案**：

- 使用 `mozilla/pdf.js` 解析 PDF
- 提取文本内容转为 HTML
- 应用全文翻译逻辑
- 导出为双语 PDF

**预期效果**：成为生产力市场的差异化功能

#### 8.1.2 Epub 翻译

**技术方案**：

- 使用 `futurepress/epub.js` 解析 Epub
- 翻译每个章节
- 导出为双语 Epub

### 8.2 AI 增强

#### 8.2.1 专业术语库

**实现**：

```typescript
interface TerminologyEntry {
    source: string;
    target: string;
    category: 'tech' | 'medical' | 'legal' | 'general';
}

class TerminologyManager {
    private terms = new Map<string, TerminologyEntry>();
    
    async loadTerms() {
        // 从 Chrome Storage 加载
        const data = await chrome.storage.local.get('terminology_db');
        this.terms = new Map(data['terminology_db'] || []);
    }
    
    injectIntoPrompt(text: string): string {
        const relevantTerms = this.findRelevantTerms(text);
        if (relevantTerms.length === 0) return text;
        
        const glossary = relevantTerms
            .map(t => `- ${t.source} → ${t.target}`)
            .join('\n');
        
        return `翻译时请参考以下术语表：\n${glossary}\n\n${text}`;
    }
}
```

#### 8.2.2 翻译质量评分

**实现**：

```typescript
class QualityScorer {
    async score(original: string, translation: string): Promise<number> {
        // 使用 LLM 评分
        const prompt = `
            请评估以下翻译质量（0-10分）：
            原文：${original}
            译文：${translation}
            
            评分标准：
            - 准确性（4分）
            - 流畅性（3分）
            - 术语一致性（3分）
        `;
        
        const response = await this.callLLM(prompt);
        return parseFloat(response);
    }
}
```

### 8.3 性能优化

#### 8.3.1 WebAssembly 加速

**场景**：节点选择和文本预处理

**实现**：

```typescript
// 使用 Rust + wasm-pack 编译
import init, { select_nodes_wasm } from './pkg/flowers_wasm';

class NodeSelector {
    async selectNodesOptimized(): Promise<TranslatableNode[]> {
        await init();
        const html = document.body.innerHTML;
        const result = select_nodes_wasm(html);
        return JSON.parse(result);
    }
}
```

#### 8.3.2 本地缓存持久化

**实现**：

```typescript
// 使用 IndexedDB 存储大量翻译缓存
import Dexie from 'dexie';

class TranslationDB extends Dexie {
    translations!: Dexie.Table<{id: string, text: string, result: string}, string>;
    
    constructor() {
        super('FlowersTranslationDB');
        this.version(1).stores({
            translations: 'id, text, result'
        });
    }
}
```

---

## 附录 A：完整示例代码

### A.1 FullPageTranslationManager（完整版）

```typescript
import { NodeSelector } from './NodeSelector';
import { BatchProcessor } from './BatchProcessor';
import { DOMInjector } from './DOMInjector';
import { DynamicContentObserver } from './DynamicContentObserver';

export class FullPageTranslationManager {
    private enabled: boolean = false;
    private selector: NodeSelector;
    private processor: BatchProcessor;
    private injector: DOMInjector;
    private observer: DynamicContentObserver;
    
    constructor(private targetLang: string = 'zh') {
        this.selector = new NodeSelector();
        this.processor = new BatchProcessor(targetLang);
        this.injector = new DOMInjector();
        this.observer = new DynamicContentObserver(
            (nodes) => this.translateNodes(nodes)
        );
        
        // 注入样式
        DOMInjector.injectStyles();
    }
    
    async start() {
        if (this.enabled) return;
        
        console.log('[FullPageTranslation] Starting...');
        this.enabled = true;
        
        // 选择节点
        const nodes = this.selector.selectNodes();
        console.log(`[FullPageTranslation] Found ${nodes.length} nodes`);
        
        // 显示加载提示
        this.showToast('翻译中...', 'info');
        
        // 翻译节点
        await this.translateNodes(nodes);
        
        // 启动动态监听
        this.observer.start();
        
        this.showToast('翻译完成', 'success');
    }
    
    stop() {
        if (!this.enabled) return;
        
        console.log('[FullPageTranslation] Stopping...');
        this.enabled = false;
        
        // 移除所有翻译
        this.injector.removeAll();
        
        // 停止监听
        this.observer.stop();
    }
    
    toggle() {
        if (this.enabled) {
            this.stop();
        } else {
            this.start();
        }
    }
    
    setTargetLang(lang: string) {
        this.targetLang = lang;
        this.processor = new BatchProcessor(lang);
    }
    
    private async translateNodes(nodes: TranslatableNode[]) {
        for (const node of nodes) {
            // 添加占位符
            this.injector.inject(node, '翻译中...');
            
            try {
                // 批量翻译
                const translation = await this.processor.addTask(node);
                
                // 更新翻译
                this.injector.inject(node, translation);
            } catch (error) {
                console.error('[FullPageTranslation] Translation failed:', error);
                this.injector.inject(node, '[翻译失败]');
            }
        }
    }
    
    private showToast(message: string, type: 'info' | 'success' | 'error') {
        const toast = document.createElement('div');
        toast.className = `flowers-toast flowers-toast-${type}`;
        toast.textContent = message;
        toast.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            z-index: 2147483647;
            padding: 12px 20px;
            background: ${type === 'success' ? '#10b981' : type === 'error' ? '#ef4444' : '#3b82f6'};
            color: white;
            border-radius: 8px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.15);
            font-size: 14px;
        `;
        document.body.appendChild(toast);
        setTimeout(() => toast.remove(), 3000);
    }
}
```

---

## 附录 B：参考资料

### B.1 开源项目

- **沉浸式翻译**: [immersive-translate](https://github.com/immersive-translate/immersive-translate)
- **Mozilla Readability**: [mozilla/readability](https://github.com/mozilla/readability)
- **PDF.js**: [mozilla/pdf.js](https://github.com/mozilla/pdf.js)

### B.2 技术文档

- [Chrome Extension API - MutationObserver](https://developer.mozilla.org/en-US/docs/Web/API/MutationObserver)
- [Chrome Extension API - Storage](https://developer.chrome.com/docs/extensions/reference/storage/)
- [Floating UI](https://floating-ui.com/)

### B.3 相关论文

- [Context-Aware Machine Translation](https://arxiv.org/abs/1906.00789)
- [Neural Machine Translation with Extended Context](https://arxiv.org/abs/1810.05580)

---

## 总结

### 核心优势

1. **技术可行性高**：基于现有架构和字幕翻译经验，风险可控
2. **用户体验优先**：流式回填、智能批处理、上下文感知
3. **开发周期短**：核心功能 MVP 仅需 3-4 天
4. **可扩展性强**：支持 PDF、Epub 等高级功能

### 建议第一步

**先做一个简单的"全文翻译"按钮**：

1. 遍历页面所有 `<p>` 标签
2. 合并请求发给 LLM
3. 插回页面（双语对照）

**预期效果**：

- 让项目在 GitHub Trending 上获得更多关注
- 验证技术方案可行性
- 收集用户反馈

---

**文档结束**
