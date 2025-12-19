# 视频字幕翻译技术方案设计文档

## 1. 概述

本文档旨在调研和设计视频字幕实时翻译功能的技术方案，作为 Flowers Chrome 扩展的新特性。当前扩展已具备文本翻译能力，本文档将分析如何将其扩展到视频字幕翻译场景。

### 1.1 目标

- **核心目标**：在 Chrome 扩展中实现视频字幕的实时翻译
- **使用场景**：用户观看带字幕的视频时，可以选择将字幕翻译为目标语言并实时显示
- **技术特点**：利用现有的 LLM 翻译能力，提供无缝的用户体验

### 1.2 当前实现情况

#### 1.2.1 现有翻译能力

当前代码库已具备以下能力：

**Backend（后端）**
- `CoreAgent.translate()`: 核心翻译接口，支持 LLM 驱动的翻译
- `translateNode()`: 翻译节点实现，包含缓存机制（LRU Cache，100 条目，30 分钟 TTL）
- 支持字典式翻译（短文本）和普通翻译两种模式
- 使用用户配置的 LLM 模型进行翻译
- 位置：`backend/src/agent/index.ts`, `backend/src/agent/nodes/translate.ts`

**Frontend（前端）**
- `SelectionPopover`: 文本选择后的弹窗组件，支持翻译、润色等功能
- `content-script.ts`: 内容脚本，处理页面文本选择
- Shadow DOM 隔离样式，避免与页面样式冲突
- 位置：`frontend/src/components/popover/SelectionPopover.tsx`, `frontend/src/content/content-script.ts`

#### 1.2.2 技术栈

- **Backend**: TypeScript, Node.js
- **Frontend**: React, TypeScript, Shadow DOM
- **LLM 集成**: 支持多 Provider（OpenAI 兼容接口）
- **消息通信**: Chrome Extension Message API

### 1.3 当前方案的局限性

- **仅支持文本选择翻译**：当前实现基于用户手动选择文本，无法自动获取视频字幕
- **无视频检测机制**：没有识别页面中视频元素的逻辑
- **无字幕提取能力**：缺少从视频中提取字幕文本的机制
- **无实时更新机制**：翻译是静态的，不支持字幕的动态更新和实时翻译

---

## 2. 市场技术调研

本章节深入调研市场上现有的视频字幕翻译技术方案，为我们的实现提供参考。

### 2.1 主流扩展技术分析

#### 2.1.1 Immersive Translate（沉浸式翻译）

**技术实现方式**：
- **DOM 观察机制**：通过 MutationObserver 监控视频播放器中的字幕 DOM 元素变化
- **双语字幕显示**：在原字幕下方或上方叠加翻译后的字幕
- **多平台适配**：针对 YouTube、Netflix、Bilibili 等平台做了特定的 DOM 选择器适配

**核心技术点**：
```javascript
// Immersive Translate 的核心思路
1. 检测平台类型（YouTube/Netflix/通用）
2. 查找字幕容器元素（平台特定选择器）
3. 监听字幕 DOM 变化
4. 提取文本 → 翻译 → 注入翻译结果
5. 实时同步显示双语字幕
```

**优势**：
- 无需拦截网络请求，纯 DOM 操作
- 兼容性好，不易被平台封锁
- 支持多种翻译服务（Google、DeepL、自定义 API）

**问题与挑战**：
- GitHub Issues 显示偶尔出现双语字幕显示不正确的问题
- 需要持续维护适配不同平台的 DOM 结构变化

#### 2.1.2 Auto Translate for YouTube™ Captions

**技术实现方式**：
- **网络请求拦截**：通过修改 YouTube 的 timedtext API 请求参数
- **修改 `tlang` 参数**：在请求中添加目标语言参数，直接获取 YouTube 翻译后的字幕
- **利用 YouTube 原生能力**：激活 YouTube 的自动翻译功能

**核心技术点**：
```javascript
// 拦截 timedtext 请求，修改语言参数
// 原始请求: /api/timedtext?v=VIDEO_ID&lang=en
// 修改后:   /api/timedtext?v=VIDEO_ID&lang=en&tlang=zh
```

**优势**：
- 利用 YouTube 原生翻译，质量有保障
- 无需额外翻译 API 调用
- 延迟低，与原生字幕同步

**限制**：
- 仅支持 YouTube 平台
- 依赖 YouTube 的翻译能力，语言支持有限
- 对于 YouTube 未提供翻译的语言无法使用

#### 2.1.3 Video CC Translator

**技术实现方式**：
- **实时翻译服务集成**：集成 Google Translate、DeepL 等翻译 API
- **通用视频支持**：支持 90+ 种语言
- **覆盖层显示**：在视频上方覆盖翻译字幕

#### 2.1.4 Trancy

**技术实现方式**：
- **双语字幕**：同时显示原文和译文
- **交互增强**：可调节播放速度、自定义字幕样式
- **学习功能**：针对语言学习场景优化

### 2.2 YouTube 字幕系统深度调研

#### 2.2.1 YouTube 字幕 API

**官方 YouTube Data API**：

```http
# 1. 获取字幕轨道列表
GET https://www.googleapis.com/youtube/v3/captions
    ?part=snippet
    &videoId=VIDEO_ID
    &key=API_KEY

# 2. 下载字幕内容
GET https://www.googleapis.com/youtube/v3/captions/CAPTION_ID
    ?tfmt=srt|vtt|ttml
    &key=API_KEY
```

**YouTube 内部 timedtext API**（非官方，但广泛使用）：

```http
# 获取字幕（XML/JSON 格式）
GET https://www.youtube.com/api/timedtext
    ?v=VIDEO_ID
    &lang=en           # 原语言
    &tlang=zh          # 翻译目标语言（可选）
    &fmt=json3         # 格式：json3, srv3, vtt

# 字幕列表
GET https://www.youtube.com/api/timedtext
    ?v=VIDEO_ID
    &type=list
```

**字幕数据格式 - SRV3 (YouTube Timed Text)**：

YouTube 使用基于 TTML 扩展的 SRV3 格式，支持：
- 文本格式（粗体、斜体、下划线）
- 自定义字体和颜色
- 文本对齐和旋转
- 卡拉OK时间戳
- 多语言轨道

#### 2.2.2 YouTube DOM 结构（2024 最新）

**字幕容器层级**：

```html
<!-- YouTube 播放器结构 -->
<div id="movie_player" class="html5-video-player">
  <div class="html5-video-container">
    <video class="html5-main-video"></video>
  </div>
  
  <!-- 字幕容器 -->
  <div class="ytp-caption-window-container">
    <div class="caption-window ytp-caption-window-bottom">
      <span class="captions-text">
        <span class="caption-visual-line">
          <span class="ytp-caption-segment">字幕文本内容</span>
          <span class="ytp-caption-segment">更多文本</span>
        </span>
      </span>
    </div>
  </div>
</div>
```

**关键 CSS 类名**：
- `ytp-caption-window-container`: 字幕窗口容器
- `caption-window`: 字幕窗口
- `ytp-caption-window-bottom`: 底部字幕（最常见）
- `ytp-caption-segment`: 字幕文本段落（**核心提取目标**）
- `caption-visual-line`: 视觉行

**DOM 监听策略**：

```typescript
// 推荐的 YouTube 字幕提取选择器
const YOUTUBE_CAPTION_SELECTORS = {
  container: '.ytp-caption-window-container',
  window: '.caption-window',
  segment: '.ytp-caption-segment',
  visualLine: '.caption-visual-line'
};

// 监听策略
const observer = new MutationObserver((mutations) => {
  for (const mutation of mutations) {
    // 检查子节点变化（新字幕出现）
    if (mutation.type === 'childList') {
      const segments = document.querySelectorAll('.ytp-caption-segment');
      const text = Array.from(segments)
        .map(s => s.textContent?.trim())
        .filter(Boolean)
        .join(' ');
      
      if (text) {
        handleNewSubtitle(text);
      }
    }
    
    // 检查文本内容变化
    if (mutation.type === 'characterData') {
      const text = mutation.target.textContent?.trim();
      if (text) {
        handleSubtitleUpdate(text);
      }
    }
  }
});

// 观察配置
observer.observe(captionContainer, {
  childList: true,
  subtree: true,
  characterData: true,
  characterDataOldValue: true
});
```

#### 2.2.3 请求拦截方案（备选）

**通过 Chrome Extension webRequest API 拦截**：

```typescript
// manifest.json 权限
{
  "permissions": ["webRequest", "webRequestBlocking"],
  "host_permissions": ["*://*.youtube.com/*"]
}

// background.js
chrome.webRequest.onBeforeRequest.addListener(
  (details) => {
    if (details.url.includes('/api/timedtext')) {
      // 解析 URL 参数
      const url = new URL(details.url);
      const lang = url.searchParams.get('lang');
      
      // 可以在这里修改请求或记录字幕信息
      console.log('Intercepted timedtext request:', {
        videoId: url.searchParams.get('v'),
        lang: lang
      });
    }
    return { cancel: false };
  },
  { urls: ["*://*.youtube.com/api/timedtext*"] },
  ["blocking"]
);
```

**直接获取字幕数据**（推荐用于预加载）：

```typescript
async function fetchYouTubeSubtitles(videoId: string, lang = 'en'): Promise<SubtitleCue[]> {
  const url = `https://www.youtube.com/api/timedtext?v=${videoId}&lang=${lang}&fmt=json3`;
  
  try {
    const response = await fetch(url);
    const data = await response.json();
    
    // 解析 json3 格式
    return data.events
      ?.filter((e: any) => e.segs)
      .map((e: any) => ({
        text: e.segs.map((s: any) => s.utf8).join(''),
        startTime: e.tStartMs / 1000,
        endTime: (e.tStartMs + (e.dDurationMs || 3000)) / 1000
      })) || [];
  } catch (error) {
    console.error('Failed to fetch subtitles:', error);
    return [];
  }
}
```

### 2.3 技术方案对比

| 方案 | 优势 | 劣势 | 适用场景 |
|------|------|------|----------|
| **DOM 观察** | 简单、兼容性好、不易被封 | 无法获取完整时间戳、依赖 DOM 结构 | YouTube、通用视频 |
| **API 拦截** | 获取完整字幕数据、精确时间戳 | 可能被平台更新破坏 | YouTube 高级功能 |
| **TextTrack API** | 标准化、精确时间戳 | 仅支持 HTML5 原生字幕 | 通用 HTML5 视频 |
| **预加载字幕** | 可预翻译、延迟低 | 需要额外请求、可能有版权问题 | 批量翻译场景 |

### 2.4 推荐实施策略

**Phase 1（MVP）**：优先实现 DOM 观察方案
- 覆盖 YouTube 核心场景
- 实现简单，风险低
- 可快速验证产品价值

**Phase 2（优化）**：结合 API 预加载
- 用户点击翻译按钮时，预加载完整字幕
- 批量翻译，提升性能
- 更好的时间同步

---

## 3. LLM 翻译架构设计

本章节重点设计通过 LLM 进行字幕翻译的技术架构，确保实时性和翻译质量。

### 3.1 实时性分析

#### 3.1.1 字幕特性分析

**典型视频字幕参数**：
- 单条字幕长度：10-50 个字符（英文）/ 5-25 个字符（中文）
- 字幕显示时长：2-5 秒
- 字幕切换频率：每 2-4 秒一条
- 用户可接受延迟：< 500ms（优秀）、< 1s（可接受）、> 2s（较差）

#### 3.1.2 LLM 翻译性能基准

**小模型翻译速度（2024 数据）**：

| 模型 | 参数量 | 速度 (tokens/s) | 设备 | 适用性 |
|------|--------|-----------------|------|--------|
| **Qwen1.5-1.8B** | 1.8B | 156 | 手机 GPU | ⭐⭐⭐ 极佳 |
| **Gemma 3 (1B)** | 1B | 52 | 手机 GPU | ⭐⭐⭐ 极佳 |
| **Gemma-2B** | 2B | 102 | 手机 NPU | ⭐⭐⭐ 优秀 |
| **Phi-2** | 2.7B | 58 | 手机 NPU | ⭐⭐ 良好 |
| **GPT-4o-mini** | - | 100+ | API | ⭐⭐⭐ 优秀 |
| **Claude Haiku** | - | 80+ | API | ⭐⭐⭐ 优秀 |

**翻译延迟估算**：

```
字幕长度: 30 英文字符 ≈ 8-10 tokens
翻译输出: 15 中文字符 ≈ 15-20 tokens
总 tokens: ~30

小模型 (100 tokens/s):
  - 翻译时间 = 30 / 100 = 300ms ✓ 可接受

云端 API (GPT-4o-mini):
  - 网络延迟 = 100-200ms
  - 翻译时间 = 30 / 100 = 300ms
  - 总延迟 = 400-500ms ✓ 可接受
```

**结论**：小模型的速度完全可以支持实时字幕翻译！

### 3.2 批量翻译架构

#### 3.2.1 核心设计理念

**为什么需要批量翻译**：
1. **减少 API 调用次数**：降低成本，减少网络开销
2. **利用上下文**：多条字幕一起翻译，上下文更完整，翻译更准确
3. **提高吞吐量**：批量处理比单条处理效率更高
4. **平滑延迟**：避免每条字幕都有独立延迟

#### 3.2.2 双队列批量翻译架构

```
┌──────────────────────────────────────────────────────────────────┐
│                     字幕翻译流水线架构                            │
├──────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────┐          │
│  │ 字幕输入     │    │  预处理队列  │    │  翻译引擎   │          │
│  │ (DOM/Track) │───▶│  (缓存检查)  │───▶│  (LLM调用)  │          │
│  └─────────────┘    └─────────────┘    └─────────────┘          │
│                           │                   │                  │
│                           │ 缓存命中          │ 翻译完成         │
│                           ▼                   ▼                  │
│                     ┌─────────────┐    ┌─────────────┐          │
│                     │  结果缓存   │◀───│  后处理     │          │
│                     │  (LRU)      │    │  (分句对齐)  │          │
│                     └─────────────┘    └─────────────┘          │
│                           │                                      │
│                           ▼                                      │
│                     ┌─────────────┐                              │
│                     │  字幕渲染   │                              │
│                     │  (时间同步)  │                              │
│                     └─────────────┘                              │
│                                                                  │
└──────────────────────────────────────────────────────────────────┘
```

#### 3.2.3 详细实现设计

```typescript
/**
 * 高性能字幕翻译器
 * 支持批量翻译、上下文窗口、流式输出
 */
class HighPerformanceSubtitleTranslator {
  // ===== 配置参数 =====
  private readonly config = {
    // 批量处理
    batchSize: 5,                    // 最大批量大小
    batchDelayMs: 150,               // 批量收集延迟
    maxWaitMs: 300,                  // 最大等待时间
    
    // 上下文窗口
    contextWindowSize: 3,            // 上下文字幕数量
    
    // 缓存
    cacheSize: 500,                  // 缓存条目数
    cacheTTL: 30 * 60 * 1000,       // 缓存过期时间 30 分钟
    
    // 超时
    translationTimeout: 5000,        // 单次翻译超时
    
    // 重试
    maxRetries: 2,
    retryDelayMs: 500
  };

  // ===== 状态 =====
  private pendingQueue: SubtitleCue[] = [];
  private batchTimer: number | null = null;
  private translationCache: LRUCache<string, string>;
  private contextWindow: string[] = [];
  private isProcessing = false;

  // ===== 回调 =====
  private onTranslationReady: (cue: SubtitleCue, translated: string) => void;

  constructor(
    private llmClient: LLMClient,
    private targetLang: string,
    onReady: (cue: SubtitleCue, translated: string) => void
  ) {
    this.translationCache = new LRUCache({
      maxSize: this.config.cacheSize,
      ttl: this.config.cacheTTL
    });
    this.onTranslationReady = onReady;
  }

  /**
   * 添加字幕到翻译队列
   */
  async addSubtitle(cue: SubtitleCue): Promise<void> {
    // 1. 检查缓存
    const cached = this.translationCache.get(cue.text);
    if (cached) {
      console.log('[Translator] Cache hit:', cue.text.substring(0, 20));
      this.onTranslationReady(cue, cached);
      return;
    }

    // 2. 加入队列
    this.pendingQueue.push(cue);

    // 3. 启动批量处理定时器
    this.scheduleBatchProcessing();
  }

  /**
   * 调度批量处理
   */
  private scheduleBatchProcessing(): void {
    // 如果队列已满，立即处理
    if (this.pendingQueue.length >= this.config.batchSize) {
      this.processBatch();
      return;
    }

    // 否则，延迟处理
    if (this.batchTimer) {
      clearTimeout(this.batchTimer);
    }

    this.batchTimer = window.setTimeout(() => {
      this.processBatch();
    }, this.config.batchDelayMs);
  }

  /**
   * 批量处理翻译
   */
  private async processBatch(): Promise<void> {
    if (this.isProcessing || this.pendingQueue.length === 0) {
      return;
    }

    this.isProcessing = true;
    this.batchTimer = null;

    // 取出待处理的字幕
    const batch = this.pendingQueue.splice(0, this.config.batchSize);
    
    try {
      // 构建翻译请求
      const translations = await this.translateBatch(batch);

      // 更新缓存和上下文
      batch.forEach((cue, index) => {
        const translated = translations[index];
        if (translated) {
          this.translationCache.set(cue.text, translated);
          this.updateContextWindow(cue.text);
          this.onTranslationReady(cue, translated);
        }
      });

    } catch (error) {
      console.error('[Translator] Batch translation failed:', error);
      // 重试逻辑或降级处理
      this.handleTranslationError(batch, error);
    } finally {
      this.isProcessing = false;
      
      // 如果队列中还有待处理的，继续处理
      if (this.pendingQueue.length > 0) {
        this.scheduleBatchProcessing();
      }
    }
  }

  /**
   * 批量翻译核心逻辑
   */
  private async translateBatch(batch: SubtitleCue[]): Promise<string[]> {
    // 构建带上下文的翻译请求
    const context = this.contextWindow.slice(-this.config.contextWindowSize);
    const textsToTranslate = batch.map(cue => cue.text);
    
    // 使用特殊分隔符标记每条字幕
    const SEPARATOR = '\n---SUBTITLE---\n';
    const combinedText = textsToTranslate.join(SEPARATOR);
    
    // 构建 prompt
    const systemPrompt = this.buildSystemPrompt(context);
    const userPrompt = this.buildUserPrompt(combinedText);

    // 调用 LLM
    const result = await this.llmClient.chat({
      model: this.getOptimalModel(),
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      temperature: 0.3,  // 低温度，翻译更稳定
      max_tokens: textsToTranslate.length * 100  // 根据字幕数量估算
    });

    // 解析结果
    return this.parseTranslationResult(result, batch.length);
  }

  /**
   * 构建系统提示词
   */
  private buildSystemPrompt(context: string[]): string {
    const contextText = context.length > 0
      ? `\n\n前文参考（保持术语一致性）：\n${context.join('\n')}`
      : '';

    return `你是一个专业的视频字幕翻译专家。请将以下字幕翻译成${this.targetLang}。

翻译要求：
1. 保持原意，语言自然流畅
2. 适合视频字幕阅读（简洁有力）
3. 每条字幕单独翻译，用"---SUBTITLE---"分隔
4. 不要添加额外解释或注释
5. 保持专业术语的一致性${contextText}`;
  }

  /**
   * 构建用户提示词
   */
  private buildUserPrompt(text: string): string {
    return `请翻译以下字幕：\n\n${text}`;
  }

  /**
   * 解析翻译结果
   */
  private parseTranslationResult(result: string, expectedCount: number): string[] {
    const SEPARATOR = '---SUBTITLE---';
    const translations = result
      .split(SEPARATOR)
      .map(t => t.trim())
      .filter(Boolean);

    // 确保数量匹配
    while (translations.length < expectedCount) {
      translations.push('[翻译失败]');
    }

    return translations.slice(0, expectedCount);
  }

  /**
   * 更新上下文窗口
   */
  private updateContextWindow(text: string): void {
    this.contextWindow.push(text);
    if (this.contextWindow.length > this.config.contextWindowSize * 2) {
      this.contextWindow = this.contextWindow.slice(-this.config.contextWindowSize);
    }
  }

  /**
   * 获取最优模型（根据设置）
   */
  private getOptimalModel(): string {
    // 可以根据设置选择不同的模型
    // 对于字幕翻译，推荐使用快速的小模型
    return 'gpt-4o-mini'; // 或 'qwen-turbo', 'claude-haiku' 等
  }

  /**
   * 错误处理
   */
  private handleTranslationError(batch: SubtitleCue[], error: any): void {
    // 降级处理：逐条翻译或显示原文
    batch.forEach(cue => {
      this.onTranslationReady(cue, `[${cue.text}]`); // 显示原文
    });
  }
}
```

### 3.3 预加载翻译策略

对于 YouTube 等支持预获取完整字幕的平台，可以采用预加载策略：

```typescript
/**
 * YouTube 字幕预加载翻译器
 * 在视频开始播放时预加载所有字幕并批量翻译
 */
class YouTubePreloadTranslator {
  private subtitleMap = new Map<number, { original: string; translated: string }>();
  private isPreloading = false;

  /**
   * 预加载视频字幕
   */
  async preloadSubtitles(videoId: string, lang: string, targetLang: string): Promise<void> {
    if (this.isPreloading) return;
    this.isPreloading = true;

    try {
      // 1. 获取完整字幕
      const subtitles = await this.fetchYouTubeSubtitles(videoId, lang);
      console.log(`[Preload] Fetched ${subtitles.length} subtitles`);

      // 2. 分批翻译（每批 10-20 条）
      const batchSize = 15;
      for (let i = 0; i < subtitles.length; i += batchSize) {
        const batch = subtitles.slice(i, i + batchSize);
        const translated = await this.translateBatch(batch, targetLang);
        
        // 3. 存储到 Map
        batch.forEach((sub, idx) => {
          this.subtitleMap.set(sub.startTime, {
            original: sub.text,
            translated: translated[idx]
          });
        });

        console.log(`[Preload] Translated ${i + batch.length}/${subtitles.length}`);
      }

      console.log('[Preload] All subtitles translated!');

    } catch (error) {
      console.error('[Preload] Failed:', error);
    } finally {
      this.isPreloading = false;
    }
  }

  /**
   * 根据时间获取翻译
   */
  getTranslation(currentTime: number): { original: string; translated: string } | null {
    // 查找最近的字幕（允许 0.5s 误差）
    for (const [startTime, subtitle] of this.subtitleMap.entries()) {
      if (Math.abs(currentTime - startTime) < 0.5) {
        return subtitle;
      }
    }
    return null;
  }

  /**
   * 获取 YouTube 字幕
   */
  private async fetchYouTubeSubtitles(videoId: string, lang: string): Promise<SubtitleCue[]> {
    const url = `https://www.youtube.com/api/timedtext?v=${videoId}&lang=${lang}&fmt=json3`;
    const response = await fetch(url);
    const data = await response.json();

    return data.events
      ?.filter((e: any) => e.segs)
      .map((e: any) => ({
        text: e.segs.map((s: any) => s.utf8).join(''),
        startTime: e.tStartMs / 1000,
        endTime: (e.tStartMs + (e.dDurationMs || 3000)) / 1000
      })) || [];
  }

  private async translateBatch(batch: SubtitleCue[], targetLang: string): Promise<string[]> {
    // 复用 HighPerformanceSubtitleTranslator 的批量翻译逻辑
    // ...
    return [];
  }
}
```

### 3.4 流式翻译（进阶优化）

对于支持流式输出的 LLM，可以进一步降低首字延迟：

```typescript
/**
 * 流式翻译处理
 * 实现边翻译边显示，降低用户感知延迟
 */
async function* streamTranslate(
  client: LLMClient,
  text: string,
  targetLang: string
): AsyncGenerator<string> {
  const stream = await client.chatStream({
    model: 'gpt-4o-mini',
    messages: [
      { role: 'system', content: `翻译成${targetLang}，直接输出翻译结果` },
      { role: 'user', content: text }
    ],
    stream: true
  });

  let buffer = '';
  for await (const chunk of stream) {
    buffer += chunk.content;
    
    // 每收到一定量字符就输出
    if (buffer.length >= 5 || chunk.done) {
      yield buffer;
      buffer = '';
    }
  }
}
```

### 3.5 性能优化总结

| 优化策略 | 效果 | 实现复杂度 | 优先级 |
|----------|------|------------|--------|
| **批量翻译** | 减少 API 调用 70%+ | 中 | ⭐⭐⭐ 必须 |
| **LRU 缓存** | 重复字幕秒出 | 低 | ⭐⭐⭐ 必须 |
| **上下文窗口** | 提升翻译质量 | 低 | ⭐⭐⭐ 必须 |
| **预加载** | 零延迟显示 | 中 | ⭐⭐ 推荐 |
| **小模型** | 降低成本和延迟 | 低 | ⭐⭐ 推荐 |
| **流式输出** | 降低首字延迟 | 高 | ⭐ 可选 |

### 3.6 推荐模型配置

```yaml
# 字幕翻译推荐配置
subtitle_translation:
  # 首选：快速小模型
  primary_model: "gpt-4o-mini"  # 或 "claude-3-haiku", "qwen-turbo"
  
  # 备选：更强大但较慢
  fallback_model: "gpt-4o"
  
  # 参数
  temperature: 0.3          # 低温度，翻译更稳定
  max_tokens: 500           # 足够翻译 5-10 条字幕
  
  # 批量配置
  batch_size: 5             # 每批 5 条字幕
  batch_delay_ms: 150       # 150ms 收集窗口
  
  # 缓存配置
  cache_size: 500           # 缓存 500 条
  cache_ttl_minutes: 30     # 30 分钟过期
```

---

## 4. 技术挑战分析（详细）

### 4.1 字幕数据来源

视频字幕可能来自多个来源，需要处理不同情况：

#### 4.1.1 已有字幕轨道（Subtitle Tracks）

**HTML5 Video API - `<track>` 元素**
- `<video>` 元素可以包含 `<track>` 子元素，用于字幕轨道
- 可以通过 `video.textTracks` API 访问字幕数据
- 支持多种字幕格式：WebVTT、SRT、TTML 等
- 需要监听 `cuechange` 事件获取当前显示的字幕

**优势**：
- 标准 API，兼容性好
- 已有时间戳信息，易于同步
- 不需要额外处理

**挑战**：
- 不是所有视频都有字幕轨道
- 某些视频平台可能使用自定义字幕系统（如 YouTube）

#### 4.1.2 平台特定字幕系统

**YouTube**
- 使用自定义字幕渲染系统（`ytp-caption-window-container`）
- 字幕通过 DOM 元素实时渲染，可监听 DOM 变化获取
- 提供 API 访问字幕数据（需要处理跨域问题）

**Netflix、Bilibili 等**
- 每个平台有自己的字幕实现方式
- 可能需要针对不同平台做特定适配

#### 4.1.3 无字幕视频（需要 ASR）

**音频捕获 + 自动语音识别（ASR）**
- 使用 `video.captureStream()` 获取视频音频流
- 使用 Web Audio API 处理音频数据
- 调用 ASR 服务（如 Whisper API）进行转录
- 生成时间戳化的字幕数据

**挑战**：
- 需要额外的 ASR 服务（成本、延迟）
- 音频捕获可能遇到 CORS 问题
- 实时处理对性能要求高

**`chrome.tabCapture` API**
- 可以捕获整个标签页的音频
- 但会导致音频回声（因为捕获的音频会再次播放）
- 不推荐作为主要方案

### 4.2 字幕提取策略

#### 策略 1: 基于已有字幕轨道（优先）

```typescript
// 伪代码示例
function extractSubtitlesFromTracks(video: HTMLVideoElement) {
  const tracks = video.textTracks;
  for (let i = 0; i < tracks.length; i++) {
    const track = tracks[i];
    if (track.kind === 'subtitles' || track.kind === 'captions') {
      track.mode = 'showing'; // 启用轨道
      track.addEventListener('cuechange', (e) => {
        const activeCues = track.activeCues;
        if (activeCues && activeCues.length > 0) {
          const text = Array.from(activeCues).map(cue => cue.text).join(' ');
          const startTime = activeCues[0].startTime;
          const endTime = activeCues[0].endTime;
          // 处理字幕文本
          handleSubtitle(text, startTime, endTime);
        }
      });
    }
  }
}
```

#### 策略 2: DOM 观察（适用于 YouTube 等）

```typescript
// 使用 MutationObserver 监听字幕 DOM 变化
function observeSubtitleDOM(container: HTMLElement) {
  const observer = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
      mutation.addedNodes.forEach((node) => {
        if (node.nodeType === Node.ELEMENT_NODE) {
          const element = node as HTMLElement;
          if (element.classList.contains('caption-text')) {
            const text = element.textContent;
            // 提取字幕文本
            handleSubtitle(text);
          }
        }
      });
    });
  });
  
  observer.observe(container, {
    childList: true,
    subtree: true,
    characterData: true
  });
}
```

#### 策略 3: 音频捕获 + ASR（备用方案）

```typescript
// 使用 video.captureStream() 获取音频
async function captureAudioAndTranscribe(video: HTMLVideoElement) {
  try {
    const stream = video.captureStream();
    const audioContext = new AudioContext();
    const source = audioContext.createMediaStreamSource(stream);
    
    // 处理音频数据并发送到 ASR 服务
    // 注意：需要处理 CORS 和性能问题
    // 这是一个复杂的方案，建议作为高级功能或备用方案
  } catch (error) {
    console.error('Audio capture failed:', error);
  }
}
```

### 4.3 翻译处理

#### 4.3.1 批量翻译优化

**当前实现**：单次翻译调用
- 每次字幕更新都会触发一次 LLM 翻译调用
- 成本高，延迟大

**优化方案**：
1. **批量翻译**：收集一段时间内的字幕，批量翻译
2. **缓存机制**：利用现有 LRU Cache，缓存常见字幕翻译
3. **滑动窗口上下文**：保留前几条字幕作为上下文，提高翻译质量

```typescript
// 伪代码：批量翻译优化
class SubtitleTranslator {
  private subtitleQueue: Array<{ text: string; timestamp: number }> = [];
  private translationCache = new LRUCache();
  private batchTimer: number | null = null;
  
  async addSubtitle(text: string, timestamp: number) {
    // 检查缓存
    const cached = this.translationCache.get(text);
    if (cached) {
      return cached;
    }
    
    // 加入队列
    this.subtitleQueue.push({ text, timestamp });
    
    // 批量处理（延迟 200ms，收集多条字幕）
    if (this.batchTimer) clearTimeout(this.batchTimer);
    this.batchTimer = window.setTimeout(() => {
      this.processBatch();
    }, 200);
  }
  
  private async processBatch() {
    const batch = this.subtitleQueue.splice(0);
    if (batch.length === 0) return;
    
    // 合并文本，保留上下文
    const context = this.getPreviousSubtitles(3); // 前 3 条作为上下文
    const texts = batch.map(s => s.text);
    const combinedText = [...context, ...texts].join('\n');
    
    // 调用翻译 API
    const translated = await agent.translate({
      text: combinedText,
      targetLang: this.targetLang
    });
    
    // 处理结果并显示
    // ...
  }
}
```

#### 4.3.2 上下文处理

字幕翻译需要考虑上下文，特别是：
- **对话连续性**：多行字幕可能是一句话的拆分
- **专业术语一致性**：同一视频中的术语应该保持一致
- **语气和风格**：保持原字幕的语气（正式/非正式）

### 4.4 显示层设计

#### 4.4.1 覆盖层（Overlay）方案

**技术实现**：
- 使用 `position: absolute` 或 `position: fixed` 的 `div` 元素
- 定位在视频元素上方
- 使用 Shadow DOM 隔离样式，避免与页面样式冲突
- 支持自定义样式（字体、颜色、位置、背景等）

```typescript
// 伪代码：创建字幕覆盖层
function createSubtitleOverlay(video: HTMLVideoElement) {
  const overlay = document.createElement('div');
  overlay.id = 'flowers-subtitle-overlay';
  overlay.style.cssText = `
    position: absolute;
    bottom: 60px;
    left: 50%;
    transform: translateX(-50%);
    background: rgba(0, 0, 0, 0.8);
    color: white;
    padding: 8px 16px;
    border-radius: 4px;
    font-size: 16px;
    max-width: 80%;
    text-align: center;
    z-index: 10000;
    pointer-events: none;
  `;
  
  // 定位到视频容器
  const container = video.parentElement;
  if (container && getComputedStyle(container).position === 'static') {
    container.style.position = 'relative';
  }
  container?.appendChild(overlay);
  
  return overlay;
}
```

#### 4.4.2 时间同步

**同步机制**：
1. **基于原字幕时间戳**：如果有原字幕轨道，使用其时间戳
2. **基于视频播放时间**：监听 `timeupdate` 事件，根据视频当前时间显示对应翻译
3. **动态更新**：字幕更新时，平滑过渡显示新内容

```typescript
// 伪代码：时间同步
class SubtitleSync {
  private translations: Map<number, string> = new Map(); // timestamp -> translated text
  
  syncWithVideo(video: HTMLVideoElement, overlay: HTMLElement) {
    video.addEventListener('timeupdate', () => {
      const currentTime = video.currentTime;
      const translation = this.findTranslationForTime(currentTime);
      if (translation) {
        overlay.textContent = translation;
      }
    });
  }
  
  private findTranslationForTime(time: number): string | null {
    // 查找当前时间对应的翻译
    // 需要考虑字幕的开始和结束时间
    // ...
  }
}
```

#### 4.4.3 用户体验优化

- **可配置位置**：用户可选择字幕显示位置（顶部/底部/自定义）
- **样式自定义**：字体大小、颜色、背景透明度
- **双语显示**：可选显示原文+译文
- **开关控制**：一键启用/禁用翻译字幕
- **性能优化**：使用 `requestAnimationFrame` 优化渲染

---

## 5. 技术方案设计

### 5.1 架构设计

```
┌─────────────────────────────────────────────────────────┐
│                   Content Script                        │
│  ┌──────────────────────────────────────────────────┐  │
│  │         Video Subtitle Detector                  │  │
│  │  - 检测页面中的视频元素                           │  │
│  │  - 识别字幕来源（track/DOM/ASR）                 │  │
│  └──────────────────────────────────────────────────┘  │
│                         │                                │
│                         ▼                                │
│  ┌──────────────────────────────────────────────────┐  │
│  │       Subtitle Extractor                         │  │
│  │  - 从 track 提取字幕                              │  │
│  │  - 从 DOM 观察字幕变化                            │  │
│  │  - (可选) 音频捕获和 ASR                          │  │
│  └──────────────────────────────────────────────────┘  │
│                         │                                │
│                         ▼                                │
│  ┌──────────────────────────────────────────────────┐  │
│  │    Subtitle Translator (批量优化)                │  │
│  │  - 字幕队列管理                                   │  │
│  │  - 批量翻译                                       │  │
│  │  - 缓存管理                                       │  │
│  └──────────────────────────────────────────────────┘  │
│                         │                                │
│                         ▼                                │
│  ┌──────────────────────────────────────────────────┐  │
│  │    Subtitle Overlay Renderer                     │  │
│  │  - 创建覆盖层                                     │  │
│  │  - 时间同步                                       │  │
│  │  - 样式管理                                       │  │
│  └──────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────┘
                         │
                         │ Chrome Message API
                         ▼
┌─────────────────────────────────────────────────────────┐
│              Service Worker (Backend)                   │
│  ┌──────────────────────────────────────────────────┐  │
│  │          CoreAgent.translate()                   │  │
│  │  - 使用现有翻译能力                               │  │
│  │  - LLM 调用                                       │  │
│  │  - 缓存处理                                       │  │
│  └──────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────┘
```

### 5.2 核心模块设计

#### 5.2.1 Video Subtitle Detector

**职责**：检测页面中的视频元素和字幕来源

**实现要点**：
- 扫描页面中的 `<video>` 元素
- 检查是否有 `<track>` 字幕轨道
- 检测特定平台的字幕 DOM（如 YouTube）
- 返回检测结果和推荐的字幕提取策略

```typescript
interface VideoSubtitleInfo {
  video: HTMLVideoElement;
  subtitleSource: 'track' | 'dom' | 'none';
  track?: TextTrack;
  domContainer?: HTMLElement;
  platform?: 'youtube' | 'netflix' | 'generic';
}

class VideoSubtitleDetector {
  detect(): VideoSubtitleInfo[] {
    const videos = document.querySelectorAll('video');
    const results: VideoSubtitleInfo[] = [];
    
    videos.forEach(video => {
      const info: VideoSubtitleInfo = {
        video,
        subtitleSource: 'none',
        platform: this.detectPlatform(video)
      };
      
      // 检查 track
      if (video.textTracks.length > 0) {
        info.subtitleSource = 'track';
        info.track = this.findActiveTrack(video);
      } else if (info.platform === 'youtube') {
        // YouTube DOM 检测
        info.subtitleSource = 'dom';
        info.domContainer = this.findYouTubeSubtitleContainer();
      }
      
      results.push(info);
    });
    
    return results;
  }
}
```

#### 5.2.2 Subtitle Extractor

**职责**：从不同来源提取字幕文本和时间戳

**实现要点**：
- 支持从 TextTrack 提取
- 支持 DOM 观察（MutationObserver）
- 统一输出格式（文本 + 时间戳）

```typescript
interface SubtitleCue {
  text: string;
  startTime: number;
  endTime: number;
  id?: string;
}

class SubtitleExtractor {
  extractFromTrack(track: TextTrack, callback: (cue: SubtitleCue) => void) {
    track.mode = 'showing';
    track.addEventListener('cuechange', () => {
      const activeCues = track.activeCues;
      if (activeCues && activeCues.length > 0) {
        Array.from(activeCues).forEach(cue => {
          callback({
            text: cue.text,
            startTime: cue.startTime,
            endTime: cue.endTime,
            id: cue.id
          });
        });
      }
    });
  }
  
  extractFromDOM(container: HTMLElement, callback: (cue: SubtitleCue) => void) {
    const observer = new MutationObserver(() => {
      const text = this.extractTextFromContainer(container);
      if (text) {
        // DOM 字幕通常没有精确时间戳，使用视频当前时间
        const video = document.querySelector('video');
        callback({
          text,
          startTime: video?.currentTime || 0,
          endTime: (video?.currentTime || 0) + 3 // 假设显示 3 秒
        });
      }
    });
    
    observer.observe(container, {
      childList: true,
      subtree: true,
      characterData: true
    });
  }
}
```

#### 5.2.3 Subtitle Translator

**职责**：管理字幕翻译队列，批量调用翻译 API

**实现要点**：
- 队列管理（收集一段时间内的字幕）
- 批量翻译优化
- 缓存利用（复用现有 translateNode 的缓存）
- 上下文处理（保留前几条字幕）

```typescript
class SubtitleTranslator {
  private queue: SubtitleCue[] = [];
  private batchTimer: number | null = null;
  private translatedCache = new Map<string, string>();
  private previousSubtitles: string[] = []; // 上下文窗口
  
  constructor(
    private agent: CoreAgent,
    private targetLang: string,
    private batchDelay = 200
  ) {}
  
  async addSubtitle(cue: SubtitleCue): Promise<string> {
    // 检查缓存
    const cached = this.translatedCache.get(cue.text);
    if (cached) {
      return cached;
    }
    
    // 加入队列
    this.queue.push(cue);
    
    // 延迟批量处理
    if (this.batchTimer) clearTimeout(this.batchTimer);
    this.batchTimer = window.setTimeout(() => {
      this.processBatch();
    }, this.batchDelay);
    
    // 返回占位符或立即翻译（根据策略）
    return '[翻译中...]';
  }
  
  private async processBatch() {
    if (this.queue.length === 0) return;
    
    const batch = this.queue.splice(0);
    const texts = batch.map(cue => cue.text);
    
    // 合并上下文
    const contextWindow = this.previousSubtitles.slice(-3); // 前 3 条
    const fullText = [...contextWindow, ...texts].join('\n');
    
    try {
      // 调用现有翻译接口
      const translated = await this.agent.translate({
        text: fullText,
        targetLang: this.targetLang
      });
      
      // 处理翻译结果（可能需要分割回单条字幕）
      const translations = this.splitTranslation(translated, texts.length);
      
      // 更新缓存和上下文
      batch.forEach((cue, index) => {
        const translation = translations[index] || translated;
        this.translatedCache.set(cue.text, translation);
        this.previousSubtitles.push(cue.text);
        if (this.previousSubtitles.length > 10) {
          this.previousSubtitles.shift();
        }
      });
      
      // 触发翻译完成事件
      this.onTranslationComplete(batch, translations);
    } catch (error) {
      console.error('Subtitle translation failed:', error);
    }
  }
}
```

#### 5.2.4 Subtitle Overlay Renderer

**职责**：渲染翻译后的字幕到视频上

**实现要点**：
- 创建覆盖层 DOM
- 时间同步（监听视频播放）
- 样式管理（用户自定义）
- 位置计算（响应式布局）

```typescript
interface SubtitleOverlayConfig {
  position: 'top' | 'bottom' | 'center';
  fontSize: number;
  fontColor: string;
  backgroundColor: string;
  backgroundOpacity: number;
  showOriginal: boolean; // 是否显示原文
}

class SubtitleOverlayRenderer {
  private overlay: HTMLElement | null = null;
  private translations = new Map<number, { original: string; translated: string }>();
  
  constructor(
    private video: HTMLVideoElement,
    private config: SubtitleOverlayConfig
  ) {}
  
  init() {
    this.createOverlay();
    this.syncWithVideo();
  }
  
  private createOverlay() {
    const container = this.video.parentElement || document.body;
    const overlay = document.createElement('div');
    overlay.id = 'flowers-subtitle-overlay';
    overlay.className = 'flowers-subtitle-overlay';
    
    // 应用样式
    this.applyStyles(overlay);
    
    // 定位
    if (getComputedStyle(container).position === 'static') {
      container.style.position = 'relative';
    }
    container.appendChild(overlay);
    
    this.overlay = overlay;
  }
  
  private syncWithVideo() {
    this.video.addEventListener('timeupdate', () => {
      if (!this.overlay) return;
      
      const currentTime = this.video.currentTime;
      const subtitle = this.findSubtitleForTime(currentTime);
      
      if (subtitle) {
        this.updateOverlay(subtitle);
      } else {
        this.overlay.textContent = '';
      }
    });
  }
  
  private findSubtitleForTime(time: number) {
    // 查找当前时间对应的字幕
    // 需要匹配时间范围
    for (const [startTime, subtitle] of this.translations.entries()) {
      // 简化：假设每条字幕显示 3 秒
      if (time >= startTime && time < startTime + 3) {
        return subtitle;
      }
    }
    return null;
  }
  
  updateTranslation(cue: SubtitleCue, translated: string) {
    this.translations.set(cue.startTime, {
      original: cue.text,
      translated
    });
  }
}
```

### 5.3 集成方案

#### 5.3.1 Content Script 集成

在 `content-script.ts` 中添加视频检测和字幕翻译功能：

```typescript
// content-script.ts 中添加

import { VideoSubtitleDetector } from './video/VideoSubtitleDetector';
import { SubtitleExtractor } from './video/SubtitleExtractor';
import { SubtitleTranslator } from './video/SubtitleTranslator';
import { SubtitleOverlayRenderer } from './video/SubtitleOverlayRenderer';

class VideoSubtitleTranslationManager {
  private detector = new VideoSubtitleDetector();
  private extractor = new SubtitleExtractor();
  private translator: SubtitleTranslator | null = null;
  private renderer: SubtitleOverlayRenderer | null = null;
  
  async init() {
    // 检测视频
    const videos = this.detector.detect();
    
    for (const videoInfo of videos) {
      if (videoInfo.subtitleSource === 'none') {
        continue; // 跳过无字幕视频（或后续实现 ASR）
      }
      
      // 初始化翻译器
      const agent = await this.getAgent(); // 从 backend 获取 agent
      this.translator = new SubtitleTranslator(agent, 'zh'); // 目标语言从设置获取
      
      // 初始化渲染器
      this.renderer = new SubtitleOverlayRenderer(videoInfo.video, {
        position: 'bottom',
        fontSize: 16,
        fontColor: '#ffffff',
        backgroundColor: '#000000',
        backgroundOpacity: 0.8,
        showOriginal: false
      });
      this.renderer.init();
      
      // 开始提取和翻译
      if (videoInfo.subtitleSource === 'track' && videoInfo.track) {
        this.extractor.extractFromTrack(videoInfo.track, async (cue) => {
          const translated = await this.translator!.addSubtitle(cue);
          this.renderer!.updateTranslation(cue, translated);
        });
      } else if (videoInfo.subtitleSource === 'dom' && videoInfo.domContainer) {
        this.extractor.extractFromDOM(videoInfo.domContainer, async (cue) => {
          const translated = await this.translator!.addSubtitle(cue);
          this.renderer!.updateTranslation(cue, translated);
        });
      }
    }
  }
  
  private async getAgent() {
    // 通过 message API 获取 backend agent
    // 或者直接调用 translate API
    return {
      translate: async (params: TranslateParams) => {
        return new Promise((resolve) => {
          chrome.runtime.sendMessage({
            action: 'agent:translate',
            params
          }, (response) => {
            resolve(response.data);
          });
        });
      }
    };
  }
}

// 在 content script 初始化时启动
const videoSubtitleManager = new VideoSubtitleTranslationManager();
videoSubtitleManager.init();
```

#### 5.3.2 用户界面集成

**选项 1：视频控制栏按钮**
- 在视频播放时，在视频上方添加一个翻译按钮
- 点击后启用/禁用字幕翻译

**选项 2：扩展图标菜单**
- 在扩展 popup 中添加"视频字幕翻译"选项
- 显示当前页面检测到的视频列表
- 用户选择要翻译的视频

**选项 3：设置页面**
- 在设置中添加"自动翻译视频字幕"开关
- 配置目标语言和显示样式

### 5.4 实施路线图

#### Phase 1: 基础功能（MVP）
1. ✅ 视频检测（`<video>` 元素）
2. ✅ 字幕轨道提取（`TextTrack` API）
3. ✅ 基础翻译集成（复用现有 `translate` API）
4. ✅ 简单覆盖层显示

#### Phase 2: 优化和完善
1. ⬜ DOM 观察（YouTube 等平台支持）
2. ⬜ 批量翻译优化
3. ⬜ 缓存机制改进
4. ⬜ 时间同步优化
5. ⬜ 样式自定义

#### Phase 3: 高级功能
1. ⬜ ASR 集成（无字幕视频）
2. ⬜ 双语显示
3. ⬜ 上下文优化（术语一致性）
4. ⬜ 性能优化（Web Worker）

---

## 6. 实现细节

### 6.1 文件结构

建议的新文件结构：

```
frontend/src/
├── content/
│   ├── content-script.ts (已有，需要扩展)
│   └── video/ (新建)
│       ├── VideoSubtitleDetector.ts
│       ├── SubtitleExtractor.ts
│       ├── SubtitleTranslator.ts
│       ├── SubtitleOverlayRenderer.ts
│       └── VideoSubtitleTranslationManager.ts
└── components/
    └── video/ (可选，UI 组件)
        ├── SubtitleToggle.tsx
        └── SubtitleSettings.tsx
```

### 6.2 关键代码片段

#### 6.2.1 字幕轨道提取示例

```typescript
// SubtitleExtractor.ts
export class SubtitleExtractor {
  extractFromTrack(
    track: TextTrack,
    onCueChange: (cue: SubtitleCue) => void
  ): () => void {
    // 启用轨道
    track.mode = 'showing';
    
    const handleCueChange = () => {
      const activeCues = track.activeCues;
      if (!activeCues || activeCues.length === 0) {
        return;
      }
      
      Array.from(activeCues).forEach((vtcCue) => {
        const cue: SubtitleCue = {
          text: this.cleanSubtitleText(vtcCue.text),
          startTime: vtcCue.startTime,
          endTime: vtcCue.endTime,
          id: vtcCue.id
        };
        
        onCueChange(cue);
      });
    };
    
    track.addEventListener('cuechange', handleCueChange);
    
    // 返回清理函数
    return () => {
      track.removeEventListener('cuechange', handleCueChange);
      track.mode = 'hidden';
    };
  }
  
  private cleanSubtitleText(text: string): string {
    // 移除 HTML 标签（WebVTT 可能包含 HTML）
    return text
      .replace(/<[^>]+>/g, '')
      .replace(/\n+/g, ' ')
      .trim();
  }
}
```

#### 6.2.2 YouTube DOM 字幕提取示例

```typescript
// SubtitleExtractor.ts (扩展)
extractFromYouTube(video: HTMLVideoElement, onCueChange: (cue: SubtitleCue) => void): () => void {
  // YouTube 字幕容器选择器（可能需要根据实际情况调整）
  const selectors = [
    '.ytp-caption-window-container',
    '.caption-window',
    '[class*="caption"]'
  ];
  
  let container: HTMLElement | null = null;
  let lastText = '';
  
  const findContainer = () => {
    for (const selector of selectors) {
      container = document.querySelector(selector) as HTMLElement;
      if (container) break;
    }
    return container;
  };
  
  const extractText = (): string => {
    if (!container) return '';
    
    const textNodes = container.querySelectorAll('.caption-text, .ytp-caption-segment');
    const texts = Array.from(textNodes).map(node => node.textContent?.trim() || '');
    return texts.filter(Boolean).join(' ');
  };
  
  const observer = new MutationObserver(() => {
    const text = extractText();
    if (text && text !== lastText) {
      lastText = text;
      onCueChange({
        text,
        startTime: video.currentTime,
        endTime: video.currentTime + 3 // 假设 3 秒
      });
    }
  });
  
  // 定期检查容器是否存在（YouTube 可能动态加载）
  const checkInterval = setInterval(() => {
    if (!container || !container.isConnected) {
      container = findContainer();
      if (container) {
        observer.observe(container, {
          childList: true,
          subtree: true,
          characterData: true
        });
      }
    }
  }, 1000);
  
  // 初始查找
  container = findContainer();
  if (container) {
    observer.observe(container, {
      childList: true,
      subtree: true,
      characterData: true
    });
  }
  
  return () => {
    clearInterval(checkInterval);
    observer.disconnect();
  };
}
```

### 6.3 性能考虑

#### 6.3.1 批量翻译优化

- **队列延迟**：200-500ms，平衡延迟和批量效果
- **批量大小**：最多 5-10 条字幕一批
- **超时处理**：如果队列中字幕太少，也需要及时处理

#### 6.3.2 缓存策略

- **复用现有缓存**：`translateNode` 已有 LRU Cache
- **字幕缓存**：相同字幕文本直接使用缓存
- **上下文缓存**：考虑上下文窗口的缓存键

#### 6.3.3 渲染优化

- **使用 `requestAnimationFrame`**：同步到浏览器渲染周期
- **防抖处理**：避免频繁 DOM 更新
- **CSS 硬件加速**：使用 `transform` 和 `will-change`

---

## 7. 测试策略

### 7.1 单元测试

- 字幕提取器（不同格式）
- 翻译队列管理
- 时间同步逻辑
- 缓存机制

### 7.2 集成测试

- 完整流程：检测 → 提取 → 翻译 → 显示
- 不同视频平台（YouTube、Netflix、通用 HTML5）
- 不同字幕格式（WebVTT、SRT）

### 7.3 用户体验测试

- 翻译准确性
- 延迟感知
- 样式和可读性
- 性能影响（视频播放是否流畅）

---

## 8. 已知问题和限制

### 8.1 技术限制

1. **CORS 问题**：某些视频的字幕文件可能跨域，需要处理
2. **动态加载**：平台可能动态加载字幕，需要持续监听
3. **格式差异**：不同平台字幕格式不同，需要适配
4. **性能影响**：实时翻译可能影响页面性能，需要优化

### 8.2 用户体验限制

1. **翻译延迟**：首次翻译需要等待 LLM 响应
2. **翻译质量**：依赖 LLM 质量，可能存在不准确情况
3. **成本考虑**：频繁调用 LLM API 可能产生成本

### 8.3 平台特定问题

1. **YouTube**：可能需要处理反爬虫机制
2. **Netflix**：可能需要 DRM 相关处理
3. **Bilibili**：中文字幕平台，可能需要特殊处理

---

## 9. 未来扩展方向

### 9.1 功能扩展

- **多语言支持**：同时显示多种语言翻译
- **术语表**：用户自定义术语翻译
- **字幕导出**：导出翻译后的字幕文件
- **离线模式**：使用本地模型进行翻译

### 9.2 技术优化

- **Web Worker**：将翻译处理移到后台线程
- **流式翻译**：支持流式 LLM 响应，降低延迟
- **预翻译**：视频加载时预翻译所有字幕
- **ASR 集成**：支持无字幕视频的自动转录和翻译

---

## 10. 参考资料

### 10.1 Web API

- [HTML5 Video API](https://developer.mozilla.org/en-US/docs/Web/API/HTMLVideoElement)
- [TextTrack API](https://developer.mozilla.org/en-US/docs/Web/API/TextTrack)
- [WebVTT](https://developer.mozilla.org/en-US/docs/Web/API/WebVTT_API)
- [MutationObserver](https://developer.mozilla.org/en-US/docs/Web/API/MutationObserver)
- [Shadow DOM](https://developer.mozilla.org/en-US/docs/Web/API/Web_components/Using_shadow_DOM)

### 10.2 相关项目

- **Immersive Translate**：网页翻译扩展，支持视频字幕
- **Language Learning with Netflix**：Netflix 字幕学习扩展
- **YouTube 双字幕扩展**：各种 YouTube 字幕相关扩展

### 10.3 技术文章

- Chrome Extension Content Scripts 最佳实践
- 视频字幕提取技术调研
- Web Audio API 音频处理

---

## 11. 总结

本文档提供了视频字幕翻译功能的完整技术方案设计，包括：

1. **当前实现分析**：梳理了现有翻译能力和技术栈
2. **技术挑战**：分析了字幕来源、提取、翻译、显示的各个环节
3. **方案设计**：提供了详细的架构设计和核心模块设计
4. **实施路线**：分阶段的实施计划
5. **实现细节**：关键代码示例和文件结构

**推荐实施顺序**：
1. 先实现基础功能（Phase 1）：支持标准 HTML5 视频字幕轨道
2. 再优化性能（Phase 2）：批量翻译、缓存优化
3. 最后扩展平台支持（Phase 3）：YouTube、ASR 等

**关键成功因素**：
- 充分利用现有翻译能力，减少重复开发
- 注重性能和用户体验，避免影响视频播放
- 渐进式实施，先实现核心功能再扩展

---

**文档版本**：v1.1  
**创建日期**：2024  
**最后更新**：2024  
**作者**：Flowers Team

---

## 附录：技术调研来源

### A.1 市场产品调研
- [Immersive Translate](https://immersivetranslate.com/) - 沉浸式翻译扩展
- [Auto Translate for YouTube™ captions](https://chromewebstore.google.com/detail/auto-translate-for-youtub/jepinfkmoilcaghlokkicakjkhfbpepc) - YouTube 自动翻译
- [Video CC Translator](https://chromewebstore.google.com/detail/video-cc-translator/fhbpmacbgklobobcieiaoibpjhdnmcfn) - 视频字幕翻译
- [Trancy](https://www.trancy.org/) - 语言学习扩展

### A.2 技术参考
- [YouTube Data API - Captions](https://developers.google.com/youtube/v3/docs/captions)
- [yttml - YouTube TTML Subtitle Converter](https://github.com/FyraLabs/yttml)
- [YouTube Transcript API](https://github.com/Thoroldvix/youtube-transcript-api)
- [OpenAI Latency Optimization Guide](https://platform.openai.com/docs/guides/latency-optimization)

### A.3 模型性能数据
- 小模型翻译速度基准测试（2024）
- 移动端 LLM 推理性能报告