import type { Note, NoteRole } from '../types.js';

export interface NotesStore {
  create(note: Omit<Note, 'id' | 'createdAt' | 'updatedAt'>): Promise<Note>;
  read(id: string): Promise<Note | null>;
  readAll(): Promise<Note[]>;
  update(id: string, updates: Partial<Omit<Note, 'id' | 'createdAt'>>): Promise<Note>;
  delete(id: string): Promise<void>;
  search(query: string, tags?: string[]): Promise<Note[]>;
}

// Chrome Storage implementation
export class ChromeStorageNotesStore implements NotesStore {
  private readonly key = 'chroma_notes';

  private async getAllNotes(): Promise<Record<string, Note>> {
    const g: any = (typeof globalThis !== 'undefined') ? (globalThis as any) : undefined;
    if (g?.chrome?.storage?.local) {
      const result = await g.chrome.storage.local.get(this.key);
      return result[this.key] || {};
    }
    // Fallback: in-memory for non-Chrome environments
    if (!this.memoryStore) this.memoryStore = {};
    return this.memoryStore;
  }

  private memoryStore: Record<string, Note> | null = null;

  async create(note: Omit<Note, 'id' | 'createdAt' | 'updatedAt'>): Promise<Note> {
    const id = `note_${Date.now()}_${Math.random().toString(36).slice(2)}`;
    const now = Date.now();
    const fullNote: Note = {
      ...note,
      id,
      createdAt: now,
      updatedAt: now
    };
    const notes = await this.getAllNotes();
    notes[id] = fullNote;
    await this.saveNotes(notes);
    return fullNote;
  }

  async read(id: string): Promise<Note | null> {
    const notes = await this.getAllNotes();
    return notes[id] || null;
  }

  async readAll(): Promise<Note[]> {
    const notes = await this.getAllNotes();
    return Object.values(notes);
  }

  async update(id: string, updates: Partial<Omit<Note, 'id' | 'createdAt'>>): Promise<Note> {
    const notes = await this.getAllNotes();
    const note = notes[id];
    if (!note) throw new Error(`Note ${id} not found`);
    const updated: Note = { ...note, ...updates, updatedAt: Date.now() };
    notes[id] = updated;
    await this.saveNotes(notes);
    return updated;
  }

  async delete(id: string): Promise<void> {
    const notes = await this.getAllNotes();
    delete notes[id];
    await this.saveNotes(notes);
  }

  async search(query: string, tags?: string[]): Promise<Note[]> {
    const notes = await this.getAllNotes();
    const all = Object.values(notes);
    let filtered = all;

    if (query) {
      const q = query.toLowerCase();
      filtered = filtered.filter(n => 
        n.title.toLowerCase().includes(q) || 
        n.content.toLowerCase().includes(q)
      );
    }

    if (tags && tags.length > 0) {
      filtered = filtered.filter(n => 
        tags.some(t => n.tags.includes(t))
      );
    }

    return filtered;
  }

  private async saveNotes(notes: Record<string, Note>): Promise<void> {
    const g: any = (typeof globalThis !== 'undefined') ? (globalThis as any) : undefined;
    if (g?.chrome?.storage?.local) {
      await g.chrome.storage.local.set({ [this.key]: notes });
    } else {
      this.memoryStore = notes;
    }
  }
}

