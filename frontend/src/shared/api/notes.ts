/**
 * Notes API client (frontend wrapper)
 */

// @ts-ignore - Runtime import, types from backend/types.js
import { notesAPI } from 'backend/index.js';
import type { Note } from 'backend/types.js';

export const createNote = (note: Omit<Note, 'id' | 'createdAt' | 'updatedAt'>) => notesAPI.create(note);
export const readNote = (id: string) => notesAPI.read(id);
export const readAllNotes = () => notesAPI.readAll();
export const updateNote = (id: string, updates: Partial<Note>) => notesAPI.update(id, updates);
export const deleteNote = (id: string) => notesAPI.delete(id);
export const deleteNotes = (ids: string[]) => notesAPI.deleteBatch(ids);
export const searchNotes = (query: string, tags?: string[]) => notesAPI.search(query, tags);
export const exportNotes = (format: 'json' | 'markdown') => notesAPI.export(format);

