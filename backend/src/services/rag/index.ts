import type { LLMClient, Note, FAQItem, RAGRetrieveParams, RAGRetrieveResult, CollectionType } from '../../types.js';
import { getSettingsSync } from '../../storage/settings.js';
import { ChromaVectorStore } from '../../storage/vectorStore.js';

export class RAGService {
  private notesVectorStore: ChromaVectorStore;
  private faqsVectorStore: ChromaVectorStore;
  private embeddingClient: LLMClient;

  constructor(embeddingClient: LLMClient) {
    this.notesVectorStore = new ChromaVectorStore('notes');
    this.faqsVectorStore = new ChromaVectorStore('faqs');
    this.embeddingClient = embeddingClient;
  }

  /**
   * Get embedding model with priority: provider embeddingModel > legacy settings
   * Centralizes model resolution to avoid code duplication
   */
  private getEmbeddingModel(): string {
    const settings = getSettingsSync();
    const embeddingProvider = settings.providers.find(p => p.id === settings.activeEmbeddingProviderId);
    return embeddingProvider?.embeddingModel || settings.embedding.model;
  }

  // Notes collection operations
  async indexNote(note: Note): Promise<void> {
    const embeddingModel = this.getEmbeddingModel();
    if (!embeddingModel || embeddingModel.trim() === '') {
      const msg = `Embedding model not configured. Please set it in settings to enable RAG search. Note saved but not indexed: ${note.id}`;
      console.warn('[RAGService]', msg);
      throw new Error(msg);
    }
    try {
      const inputText = `${note.title || ''}\n${note.content || ''}`.trim();
      if (!inputText) {
        console.warn('[RAGService] Note has no content to index:', note.id);
        return;
      }
      console.info('[RAGService] Indexing note:', {
        id: note.id,
        title: note.title?.substring(0, 50),
        contentLength: note.content?.length || 0,
        embeddingModel
      });
      const embedding = await this.embeddingClient.embed({
        model: embeddingModel,
        input: inputText
      });
      if (embedding.vectors.length > 0) {
        await this.notesVectorStore.upsertNote(note, embedding.vectors[0]);
        console.info('[RAGService] Note indexed successfully:', {
          id: note.id,
          vectorLength: embedding.vectors[0].length
        });
      } else {
        const msg = `No embedding vectors generated for note: ${note.id}`;
        console.error('[RAGService]', msg);
        throw new Error(msg);
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      console.error('[RAGService] Failed to index note:', {
        id: note.id,
        error: errorMsg,
        embeddingModel
      });
      throw error; // Re-throw to ensure caller knows indexing failed
    }
  }

  async updateNote(note: Note): Promise<void> {
    const embeddingModel = this.getEmbeddingModel();
    if (!embeddingModel || embeddingModel.trim() === '') {
      console.warn('[RAGService] Embedding model not configured, skipping note update:', note.id);
      return;
    }
    try {
      console.info('[RAGService] Updating note index:', { id: note.id, title: note.title?.substring(0, 50) });
      const embedding = await this.embeddingClient.embed({
        model: embeddingModel,
        input: `${note.title}\n${note.content}`
      });
      if (embedding.vectors.length > 0) {
        await this.notesVectorStore.update(
          note.id,
          `${note.title}\n${note.content}`,
          embedding.vectors[0],
          { noteId: note.id, tags: note.tags, sourceUrl: note.sourceUrl, role: note.role }
        );
        console.info('[RAGService] Note index updated successfully:', note.id);
      } else {
        console.warn('[RAGService] No embedding vectors generated for note update:', note.id);
      }
    } catch (error) {
      console.error('[RAGService] Failed to update note index:', note.id, error);
      throw error;
    }
  }

  async deleteNote(noteId: string): Promise<void> {
    await this.notesVectorStore.delete(noteId);
  }

  // FAQs collection operations
  async indexFAQ(faq: FAQItem): Promise<void> {
    const embeddingModel = this.getEmbeddingModel();
    if (!embeddingModel || embeddingModel.trim() === '') {
      return;
    }
    const embedding = await this.embeddingClient.embed({
      model: embeddingModel,
      input: `${faq.question}\n${faq.answer}`
    });
    if (embedding.vectors.length > 0) {
      await this.faqsVectorStore.upsertFAQ(faq, embedding.vectors[0]);
    }
  }

  async updateFAQ(faq: FAQItem): Promise<void> {
    const embeddingModel = this.getEmbeddingModel();
    if (!embeddingModel || embeddingModel.trim() === '') {
      return;
    }
    const embedding = await this.embeddingClient.embed({
      model: embeddingModel,
      input: `${faq.question}\n${faq.answer}`
    });
    if (embedding.vectors.length > 0) {
      await this.faqsVectorStore.update(
        faq.id,
        `${faq.question}\n${faq.answer}`,
        embedding.vectors[0],
        { faqId: faq.id, tags: faq.tags || [] }
      );
    }
  }

  async deleteFAQ(faqId: string): Promise<void> {
    await this.faqsVectorStore.delete(faqId);
  }

  // Retrieve from specific collection or both
  async retrieve(params: RAGRetrieveParams & { collections?: CollectionType[] }): Promise<RAGRetrieveResult> {
    const embeddingModel = this.getEmbeddingModel();
    console.info('[RAGService] Starting retrieval:', {
      query: params.query?.substring(0, 100),
      topK: params.topK || 5,
      collections: params.collections || ['notes', 'faqs'],
      tags: params.tags,
      embeddingModel
    });

    if (!embeddingModel || embeddingModel.trim() === '') {
      console.warn('[RAGService] Embedding model not configured, cannot retrieve');
      return { chunks: [] };
    }

    try {
      console.info('[RAGService] Creating query embedding with model:', embeddingModel);
      const queryEmbedding = await this.embeddingClient.embed({
        model: embeddingModel,
        input: params.query
      });

      if (queryEmbedding.vectors.length === 0) {
        console.warn('[RAGService] No query embedding vectors generated');
        return { chunks: [] };
      }
      console.info('[RAGService] Query embedding created:', { vectorLength: queryEmbedding.vectors[0].length });

      const collections = params.collections || ['notes', 'faqs'];
      const allResults: Array<{
        id: string;
        text: string;
        metadata: Record<string, any>;
        score: number;
      }> = [];

      // Query each collection
      if (collections.includes('notes')) {
        console.info('[RAGService] Querying notes collection...');
        const notesResults = await this.notesVectorStore.query(
          queryEmbedding.vectors[0],
          params.topK || 5,
          params.tags
        );
        console.info('[RAGService] Notes collection results:', {
          count: notesResults.length,
          results: notesResults.map(r => ({
            id: r.id,
            score: r.score,
            textPreview: r.text?.substring(0, 50),
            tags: r.metadata.tags
          }))
        });
        allResults.push(...notesResults);
      }

      if (collections.includes('faqs')) {
        console.info('[RAGService] Querying FAQs collection...');
        const faqsResults = await this.faqsVectorStore.query(
          queryEmbedding.vectors[0],
          params.topK || 5,
          params.tags
        );
        console.info('[RAGService] FAQs collection results:', {
          count: faqsResults.length,
          results: faqsResults.map(r => ({
            id: r.id,
            score: r.score,
            textPreview: r.text?.substring(0, 50)
          }))
        });
        allResults.push(...faqsResults);
      }

      // Sort by score and take topK
      const topResults = allResults.sort((a, b) => b.score - a.score).slice(0, params.topK || 5);
      console.info('[RAGService] Final retrieval results:', {
        totalFound: allResults.length,
        topK: topResults.length,
        topScores: topResults.map(r => ({ id: r.id, score: r.score.toFixed(4) }))
      });

      // Format chunks: parse title and content from stored text format
      const chunks = topResults.map(r => {
        // Stored format: "title\ncontent"
        // Parse and format for better context
        const textParts = r.text.split('\n');
        let title = '';
        let content = '';

        if (textParts.length > 0) {
          title = textParts[0].trim();
          content = textParts.slice(1).join('\n').trim();
        } else {
          content = r.text.trim();
        }

        // Format as a structured chunk for LLM
        let formattedText = '';
        if (title && content) {
          formattedText = `主题：${title}\n内容：${content}`;
        } else if (title) {
          formattedText = `主题：${title}`;
        } else if (content) {
          formattedText = content;
        } else {
          formattedText = r.text;
        }

        // Add metadata if available
        if (r.metadata.sourceUrl) {
          formattedText += `\n来源：${r.metadata.sourceUrl}`;
        }

        return {
          text: formattedText,
          metadata: {
            noteId: r.metadata.noteId || r.metadata.faqId,
            tags: r.metadata.tags,
            sourceUrl: r.metadata.sourceUrl,
            type: r.metadata.noteId ? 'note' : 'faq',
            originalTitle: title,
            originalContent: content
          },
          score: r.score
        };
      });

      console.info('[RAGService] Retrieval completed:', {
        chunksCount: chunks.length,
        chunksPreview: chunks.map(c => ({
          type: c.metadata.type,
          noteId: c.metadata.noteId,
          score: c.score.toFixed(4),
          textLength: c.text.length
        }))
      });

      return { chunks };
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      console.error('[RAGService] Retrieval failed:', {
        query: params.query?.substring(0, 100),
        error: errorMsg
      });
      throw error;
    }
  }
}
