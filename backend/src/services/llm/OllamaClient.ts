import type { LLMClient, ChatRequest, EmbeddingRequest, EmbeddingResponse, StreamChunk } from '../../types.js';

export class OllamaClient implements LLMClient {
    private baseUrl: string;
    private model: string;

    constructor(config: { baseUrl: string; model?: string }) {
        // Remove /v1 suffix if present, as we use native API
        this.baseUrl = config.baseUrl.replace(/\/v1\/?$/, '');
        this.model = config.model || 'llama3';
    }

    async chat(request: ChatRequest): Promise<string> {
        const url = `${this.baseUrl}/api/chat`;
        const model = request.model || this.model;

        console.info('[OllamaClient] Sending chat request:', { url, model });

        try {
            const response = await fetch(url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    model,
                    messages: request.messages.map(m => ({
                        role: m.role,
                        content: m.content,
                        images: m.images?.map(img => img.data) // Ollama expects base64 strings in 'images' array
                    })),
                    stream: false
                })
            });

            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`Ollama chat failed: ${response.status} ${response.statusText} - ${errorText}`);
            }

            const data = await response.json();
            return data.message?.content || '';
        } catch (error) {
            console.error('[OllamaClient] Chat error:', error);
            throw error;
        }
    }

    async *chatStream(request: ChatRequest): AsyncIterable<StreamChunk> {
        const url = `${this.baseUrl}/api/chat`;
        const model = request.model || this.model;

        console.info('[OllamaClient] Starting chat stream:', { url, model });

        try {
            const response = await fetch(url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    model,
                    messages: request.messages.map(m => ({
                        role: m.role,
                        content: m.content,
                        images: m.images?.map(img => img.data)
                    })),
                    stream: true
                })
            });

            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`Ollama stream failed: ${response.status} ${response.statusText} - ${errorText}`);
            }

            if (!response.body) {
                throw new Error('Response body is null');
            }

            const reader = response.body.getReader();
            const decoder = new TextDecoder();
            let buffer = '';

            while (true) {
                const { done, value } = await reader.read();
                if (done) break;

                buffer += decoder.decode(value, { stream: true });
                const lines = buffer.split('\n');
                buffer = lines.pop() || '';

                for (const line of lines) {
                    if (!line.trim()) continue;
                    try {
                        const chunk = JSON.parse(line);
                        if (chunk.done) {
                            yield { content: '', done: true };
                        } else if (chunk.message?.content) {
                            yield { content: chunk.message.content, done: false };
                        }
                    } catch (e) {
                        console.warn('[OllamaClient] Failed to parse chunk:', line);
                    }
                }
            }
        } catch (error) {
            console.error('[OllamaClient] Stream error:', error);
            throw error;
        }
    }

    async embed(request: EmbeddingRequest): Promise<EmbeddingResponse> {
        const url = `${this.baseUrl}/api/embeddings`;
        const model = request.model || this.model;

        console.info('[OllamaClient] Sending embedding request:', { url, model });

        // Ollama /api/embeddings takes a single prompt
        // If input is array, we need to make multiple requests
        const inputs = Array.isArray(request.input) ? request.input : [request.input];
        const vectors: number[][] = [];

        for (const input of inputs) {
            try {
                const response = await fetch(url, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        model,
                        prompt: input
                    })
                });

                if (!response.ok) {
                    const errorText = await response.text();
                    throw new Error(`Ollama embedding failed: ${response.status} ${response.statusText} - ${errorText}`);
                }

                const data = await response.json();
                if (data.embedding) {
                    vectors.push(data.embedding);
                }
            } catch (error) {
                console.error('[OllamaClient] Embedding error:', error);
                throw error;
            }
        }

        return { vectors };
    }
}
