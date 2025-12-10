import type { Note, FAQItem } from '../types.js';
import { NotesStore, ChromeStorageNotesStore } from './notesStore.js';
import { RAGService } from '../services/rag/index.js';

/**
 * Synchronization service that keeps NotesStore and VectorStore in sync.
 * Ensures all CRUD operations on notes/FAQs are reflected in both storage systems.
 */
export class SyncService {
  private notesStore: NotesStore;
  private ragService: RAGService;

  constructor(notesStore: NotesStore, ragService: RAGService) {
    this.notesStore = notesStore;
    this.ragService = ragService;
  }

  // Notes CRUD with vector sync
  async createNote(note: Omit<Note, 'id' | 'createdAt' | 'updatedAt'>): Promise<Note> {
    // 1. Create in NotesStore
    const created = await this.notesStore.create(note);
    console.info('[SyncService] Note created in store:', { id: created.id, title: created.title?.substring(0, 50) });
    
    // 2. Index in VectorStore (must succeed for RAG to work)
    try {
      await this.ragService.indexNote(created);
      console.info('[SyncService] Note created and indexed successfully:', { id: created.id });
    } catch (error) {
      // Log error but don't fail note creation (note exists even if indexing fails)
      const errorMsg = error instanceof Error ? error.message : String(error);
      console.error('[SyncService] Failed to index note in vector store:', { 
        id: created.id, 
        error: errorMsg,
        note: { title: created.title?.substring(0, 50), contentLength: created.content?.length || 0 }
      });
      // Don't throw - allow note creation to succeed even if indexing fails
      // This allows users to use notes even if embedding model is not configured
      // The error is logged so users can see it in console
    }
    
    return created;
  }

  async readNote(id: string): Promise<Note | null> {
    return this.notesStore.read(id);
  }

  async readAllNotes(): Promise<Note[]> {
    return this.notesStore.readAll();
  }

  async updateNote(id: string, updates: Partial<Omit<Note, 'id' | 'createdAt'>>): Promise<Note> {
    // 1. Update in NotesStore
    const updated = await this.notesStore.update(id, updates);
    console.info('[SyncService] Note updated in store:', { id, hasTitle: !!updates.title, hasContent: !!updates.content });
    
    // 2. Update in VectorStore (re-embed if content changed)
    if (updates.title || updates.content || updates.tags || updates.sourceUrl) {
      try {
        await this.ragService.updateNote(updated);
        console.info('[SyncService] Note updated and re-indexed successfully:', { id });
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : String(error);
        console.error('[SyncService] Failed to update note in vector store:', { 
          id, 
          error: errorMsg,
          updates: { hasTitle: !!updates.title, hasContent: !!updates.content }
        });
        // Don't throw - allow note update to succeed even if indexing fails
        // This allows users to use notes even if embedding model is not configured
      }
    }
    
    return updated;
  }

  async deleteNote(id: string): Promise<void> {
    // 1. Delete from VectorStore first (cleaner failure mode)
    try {
      await this.ragService.deleteNote(id);
    } catch (error) {
      console.error('Failed to delete note from vector store:', error);
    }
    
    // 2. Delete from NotesStore
    await this.notesStore.delete(id);
  }

  async deleteNotes(ids: string[]): Promise<void> {
    // Batch delete notes
    await Promise.all(ids.map(id => this.deleteNote(id)));
  }

  async searchNotes(query: string, tags?: string[]): Promise<Note[]> {
    return this.notesStore.search(query, tags);
  }

  async exportNotes(format: 'json' | 'markdown'): Promise<string> {
    const notes = await this.notesStore.readAll();
    
    if (format === 'json') {
      return JSON.stringify(notes, null, 2);
    }
    
    // Markdown format
    const md = notes.map((note: Note) => {
      const date = new Date(note.createdAt).toLocaleDateString();
      return `# ${note.title}\n\n${note.content}\n\n- Tags: ${note.tags.join(', ')}\n- Source: ${note.sourceUrl || 'N/A'}\n- Created: ${date}\n`;
    }).join('\n---\n\n');
    
    return md;
  }

  // FAQs CRUD with vector sync
  async createFAQ(faq: Omit<FAQItem, 'id' | 'createdAt' | 'updatedAt'>): Promise<FAQItem> {
    const id = `faq_${Date.now()}_${Math.random().toString(36).slice(2)}`;
    const now = Date.now();
    const fullFAQ: FAQItem = {
      ...faq,
      id,
      createdAt: now,
      updatedAt: now
    };
    
    // TODO: Store FAQ in a separate store (FAQStore) if needed
    // For now, we can store FAQs in a different key in chrome.storage
    
    // Index in VectorStore
    try {
      await this.ragService.indexFAQ(fullFAQ);
    } catch (error) {
      console.error('Failed to index FAQ in vector store:', error);
      throw error;
    }
    
    return fullFAQ;
  }

  async updateFAQ(faq: FAQItem): Promise<FAQItem> {
    const updated: FAQItem = {
      ...faq,
      updatedAt: Date.now()
    };
    
    // Update in VectorStore
    try {
      await this.ragService.updateFAQ(updated);
    } catch (error) {
      console.error('Failed to update FAQ in vector store:', error);
      throw error;
    }
    
    return updated;
  }

  async deleteFAQ(faqId: string): Promise<void> {
    try {
      await this.ragService.deleteFAQ(faqId);
    } catch (error) {
      console.error('Failed to delete FAQ from vector store:', error);
      throw error;
    }
  }

  async importFAQs(faqs: Array<{ question: string; answer: string; tags?: string[] }>): Promise<{ success: number; failed: number; errors: string[] }> {
    let success = 0;
    let failed = 0;
    const errors: string[] = [];
    
    for (const faq of faqs) {
      try {
        await this.createFAQ({ question: faq.question, answer: faq.answer, tags: faq.tags });
        success++;
      } catch (error) {
        failed++;
        errors.push(`Failed to import FAQ: ${faq.question.substring(0, 50)}...`);
      }
    }
    
    return { success, failed, errors };
  }
}

