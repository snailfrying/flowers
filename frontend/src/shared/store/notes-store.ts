/**
 * Notes store (Zustand)
 */

import { create } from 'zustand';
import type { Note } from 'backend/types.js';
import * as notesAPI from '../api/notes.js';

interface NotesStore {
  // State
  notes: Note[];
  selectedNote: Note | null;
  searchQuery: string;
  selectedTags: string[];
  isLoading: boolean;
  allNotes: Note[]; // Store all notes for tag extraction

  // Actions
  loadNotes: () => Promise<void>;
  selectNote: (note: Note | null) => void;
  createNote: (note: Omit<Note, 'id' | 'createdAt' | 'updatedAt'>) => Promise<Note>;
  updateNote: (id: string, updates: Partial<Note>) => Promise<void>;
  deleteNote: (id: string) => Promise<void>;
  deleteNotes: (ids: string[]) => Promise<void>;
  searchNotes: (query: string, tags?: string[]) => Promise<void>;
  setSearchQuery: (query: string) => void;
  setSelectedTags: (tags: string[]) => void;
  toggleTag: (tag: string) => void;
  clearFilters: () => void;
  getAllTags: () => string[];
}

export const useNotesStore = create<NotesStore>((set: (partial: Partial<NotesStore> | ((state: NotesStore) => Partial<NotesStore>)) => void, get: () => NotesStore) => ({
  notes: [],
  selectedNote: null,
  searchQuery: '',
  selectedTags: [],
  isLoading: false,
  allNotes: [],

  loadNotes: async () => {
    set({ isLoading: true });
    try {
      const notes = await notesAPI.readAllNotes();
      set({ notes, allNotes: notes, isLoading: false });
    } catch (error) {
      console.error('Failed to load notes:', error);
      set({ isLoading: false });
    }
  },

  selectNote: (note: Note | null) => {
    set({ selectedNote: note });
  },

  createNote: async (note: Omit<Note, 'id' | 'createdAt' | 'updatedAt'>): Promise<Note> => {
    try {
      const created = await notesAPI.createNote(note) as Note;
      set((state: NotesStore) => ({ 
        notes: [created, ...state.notes],
        allNotes: [created, ...state.allNotes]
      }));
      return created;
    } catch (error) {
      console.error('Failed to create note:', error);
      set({ isLoading: false });
      throw error;
    }
  },

  updateNote: async (id: string, updates: Partial<Note>) => {
    try {
      const updated = await notesAPI.updateNote(id, updates);
      set((state: NotesStore) => ({
        notes: state.notes.map((n) => (n.id === id ? updated : n)),
        allNotes: state.allNotes.map((n) => (n.id === id ? updated : n)),
        selectedNote: state.selectedNote?.id === id ? updated : state.selectedNote
      }));
    } catch (error) {
      console.error('Failed to update note:', error);
      throw error;
    }
  },

  deleteNote: async (id: string) => {
    try {
      await notesAPI.deleteNote(id);
      set((state: NotesStore) => ({
        notes: state.notes.filter((n) => n.id !== id),
        allNotes: state.allNotes.filter((n) => n.id !== id),
        selectedNote: state.selectedNote?.id === id ? null : state.selectedNote
      }));
    } catch (error) {
      console.error('Failed to delete note:', error);
      throw error;
    }
  },

  deleteNotes: async (ids: string[]) => {
    try {
      await notesAPI.deleteNotes(ids);
      set((state: NotesStore) => {
        const filteredNotes = state.notes.filter((n) => !ids.includes(n.id));
        const filteredAllNotes = state.allNotes.filter((n) => !ids.includes(n.id));
        return {
          notes: filteredNotes,
          allNotes: filteredAllNotes,
          selectedNote: state.selectedNote && ids.includes(state.selectedNote.id) ? null : state.selectedNote
        };
      });
    } catch (error) {
      console.error('Failed to delete notes:', error);
      throw error;
    }
  },

  searchNotes: async (query: string, tags?: string[]) => {
    set({ isLoading: true, searchQuery: query, selectedTags: tags || [] });
    try {
      const notes = await notesAPI.searchNotes(query, tags);
      set({ notes, isLoading: false });
    } catch (error) {
      console.error('Failed to search notes:', error);
      set({ isLoading: false });
    }
  },

  setSearchQuery: (query: string) => {
    set({ searchQuery: query });
  },

  setSelectedTags: (tags: string[]) => {
    set({ selectedTags: tags });
  },

  toggleTag: (tag: string) => {
    const { selectedTags, searchQuery } = get();
    const newTags = selectedTags.includes(tag)
      ? selectedTags.filter((t) => t !== tag)
      : [...selectedTags, tag];
    set({ selectedTags: newTags });
    // Trigger search with new tags
    if (searchQuery.trim() || newTags.length > 0) {
      get().searchNotes(searchQuery, newTags.length > 0 ? newTags : undefined);
    } else {
      get().clearFilters();
    }
  },

  clearFilters: () => {
    set({ searchQuery: '', selectedTags: [] });
    get().loadNotes();
  },

  getAllTags: (): string[] => {
    const { allNotes } = get();
    const tagSet = new Set<string>();
    allNotes.forEach((note) => {
      if (Array.isArray(note.tags)) {
        note.tags.forEach((tag) => tagSet.add(tag));
      }
    });
    return Array.from(tagSet).sort();
  }
}));

