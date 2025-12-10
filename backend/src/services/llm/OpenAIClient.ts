import type {
  ChatRequest,
  EmbeddingRequest,
  EmbeddingResponse,
  LLMClient,
  StreamChunk
} from '../../types.js';

export interface OpenAICompatibleOptions {
  baseUrl: string; 
  apiKey?: string; 
}

export class OpenAICompatibleClient implements LLMClient {
  private readonly baseUrl: string;
  private readonly apiKey?: string;

  constructor(options: OpenAICompatibleOptions) {
    this.baseUrl = options.baseUrl.replace(/\/$/, '');
    this.apiKey = options.apiKey;
  }

  async chat(request: ChatRequest): Promise<string> {
    const model = (request.model || '').trim();
    const { messages } = request;
    console.info('[LLMClient] chat called:', { 
      baseUrl: this.baseUrl, 
      model: model || 'default',
      messageCount: messages.length,
      firstMessageRole: messages[0]?.role 
    });
    
    if (!this.baseUrl || this.baseUrl.trim() === '') {
      const errorMsg = 'LLM baseUrl is not configured. Please configure it in the extension settings.';
      console.error('[LLMClient]', errorMsg);
      throw new Error(errorMsg);
    }
    
    // Convert messages to OpenAI-compatible format
    const openaiMessages: any[] = messages.map(m => {
      if (m.images && m.images.length > 0) {
        // OpenAI multimodal content array format
        const content: any[] = [{ type: 'text', text: m.content }];
        for (const img of m.images) {
          content.push({ type: 'image_url', image_url: { url: `data:${img.mimeType};base64,${img.data}` } });
        }
        return { role: m.role, content };
      }
      return { role: m.role, content: m.content };
    });
    
    // OpenAI-compatible API format
    const body: any = {
      model,
      messages: openaiMessages,
      stream: false
    };

    // Use OpenAI-compatible API endpoint
    const url = `${this.baseUrl}/chat/completions`;
    console.info('[LLMClient] Sending request to:', url);
    console.info('[LLMClient] Request body:', { 
      model: model || '(empty - may cause error if model not specified)', 
      messageCount: body.messages.length,
      hasImages: body.messages.some((m: any) => Array.isArray(m.content) && m.content.some((c: any) => c.type === 'image')),
      firstMessageRole: body.messages[0]?.role,
      firstMessageLength: body.messages[0]?.content?.length || 0
    });
    
    // Validate model
    if (!model) {
      throw new Error('Chat model is not configured.');
    }
    
    try {
      const headers = this.headers();
      const bodyStr = JSON.stringify(body);
      
      console.info('[LLMClient] Making request:', {
        url,
        method: 'POST',
        bodyLength: bodyStr.length,
        model,
        hasApiKey: !!this.apiKey
      });
      
      const res = await fetch(url, {
        method: 'POST',
        headers: headers,
        body: bodyStr,
        cache: 'no-store'
      });
      
      console.info('[LLMClient] Response status:', res.status, res.statusText);
      
      if (!res.ok) {
        // Try to get error details from response
        let errorText = '';
        let errorJson: any = null;
        
        try {
          const contentType = res.headers.get('content-type') || '';
          if (contentType.includes('application/json')) {
            errorJson = await res.json();
            errorText = JSON.stringify(errorJson, null, 2);
          } else {
            errorText = await res.text();
          }
        } catch (e) {
          errorText = `Failed to read error response: ${e}`;
        }
        
        console.error('[LLMClient] Request failed:', { 
          status: res.status, 
          statusText: res.statusText, 
          errorText,
          errorJson,
          url,
          model,
          hasApiKey: !!this.apiKey,
          requestHeaders: Object.keys(headers),
          requestBody: JSON.stringify(body, null, 2) // Full body for debugging
        });
        
        // Provide more helpful error messages based on status code
        let errorMsg = `Chat failed: ${res.status} ${res.statusText}`;
        if (res.status === 401) {
          errorMsg = `401 Unauthorized. API key may be required or incorrect.`;
        } else if (res.status === 403) {
          errorMsg = `403 Forbidden. Possible causes:\n1. Invalid API key\n2. Model "${model}" may not exist or is not available\n3. Insufficient permissions\n\nServer response: ${errorText || 'No error details'}`;
        } else if (res.status === 404) {
          errorMsg = `404 Not Found. The endpoint "${url}" may not exist.\n\nVerify baseUrl is correct: ${this.baseUrl}`;
        } else if (errorText) {
          errorMsg += `\n\nServer response:\n${errorText}`;
        }
        
        throw new Error(errorMsg);
      }
      
      const json = await res.json();
      // OpenAI-compatible returns: {choices: [{message: {content: '...'}}]}
      const text = json?.choices?.[0]?.message?.content ?? '';
      console.info('[LLMClient] Response received:', { 
        resultLength: text?.length || 0
      });
      return text;
    } catch (error: any) {
      // Handle network errors
      if (error.name === 'TypeError' && error.message.includes('fetch')) {
        const errorMsg = `Failed to fetch from ${url}. Please check:\n1. Is the LLM service accessible?\n2. Is the baseUrl correct?\n3. Is the network accessible?`;
        console.error('[LLMClient] Fetch error:', errorMsg, error);
        throw new Error(errorMsg);
      }
      throw error;
    }
  }

  async *chatStream(request: ChatRequest): AsyncIterable<StreamChunk> {
    const { model, messages } = request;
    // Convert to OpenAI-compatible format
    const openaiMessages: any[] = messages.map(m => {
      if (m.images && m.images.length > 0) {
        const content: any[] = [{ type: 'text', text: m.content }];
        for (const img of m.images) {
          content.push({ type: 'image_url', image_url: { url: `data:${img.mimeType};base64,${img.data}` } });
        }
        return { role: m.role, content };
      }
      return { role: m.role, content: m.content };
    });
    
    const body: any = {
      model,
      messages: openaiMessages,
      stream: true
    };

    // Use OpenAI-compatible API endpoint
    const url = `${this.baseUrl}/chat/completions`;
    const res = await fetch(url, {
      method: 'POST',
      headers: this.headers(),
      body: JSON.stringify(body)
    });
    if (!res.ok || !res.body) throw new Error(`Chat stream failed: ${res.status} ${res.statusText}`);

    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split(/\n/);
      buffer = lines.pop() || '';
      for (const line of lines) {
        if (!line.startsWith('data:')) continue;
        const data = line.slice(5).trim();
        if (data === '[DONE]') {
          yield { content: '', done: true };
          return;
        }
        try {
          const json = JSON.parse(data);
          // OpenAI-compatible stream format: {choices: [{delta: {content: '...'}}]}
          const delta = json?.choices?.[0]?.delta?.content ?? '';
          if (delta) yield { content: delta };
          // Check if done
          if (json?.choices?.[0]?.finish_reason) {
            yield { content: '', done: true };
            return;
          }
        } catch {
          // ignore malformed lines
        }
      }
    }
    yield { content: '', done: true };
  }

  async embed(request: EmbeddingRequest): Promise<EmbeddingResponse> {
    const inputs = Array.isArray(request.input) ? request.input : [request.input];
    const model = (request.model || '').trim();
    if (!model) {
      throw new Error('Embedding model is not configured.');
    }
    // Use OpenAI-compatible API endpoint
    const url = `${this.baseUrl}/embeddings`;
    const res = await fetch(url, {
      method: 'POST',
      headers: this.headers(),
      body: JSON.stringify({ model, input: inputs })
    });
    if (!res.ok) {
      const errorText = await res.text().catch(() => '');
      throw new Error(`Embedding failed: ${res.status} ${res.statusText} - ${errorText}`);
    }
    const json = await res.json();
    // OpenAI-compatible format: {data: [{embedding: [...]}]}
    const vectors = (json?.data || []).map((d: any) => d.embedding as number[]);
    return { vectors };
  }

  private headers(): Record<string, string> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json'
    };
    
    // Add Authorization header if API key is provided
    if (this.apiKey && this.apiKey.trim() !== '') {
      headers['Authorization'] = `Bearer ${this.apiKey}`;
    }
    
    return headers;
  }
}

