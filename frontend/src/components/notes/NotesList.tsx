import { useNotesStore } from '@/shared/store/notes-store';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { NoteCard } from './NoteCard';
import { Loading } from '@/components/common/Loading';
import { EmptyState } from '@/components/common/EmptyState';
import { useTranslation } from 'react-i18next';
import { Search, Plus, X } from 'lucide-react';
import { useState, useCallback } from 'react';
import { useDebounce } from '@/shared/hooks/useDebounce';
import { cn } from '@/lib/utils';

import { Note } from 'backend/types.js';

interface NotesListProps {
  customNotes?: Note[];
  isFiltered?: boolean;
  onClearFilter?: () => void;
}

export function NotesList({ customNotes, isFiltered, onClearFilter }: NotesListProps) {
  const {
    notes: storeNotes,
    isLoading,
    searchQuery,
    selectedTags,
    setSearchQuery,
    searchNotes,
    clearFilters,
    createNote,
    selectNote,
    toggleTag,
    getAllTags
  } = useNotesStore();
  const { t } = useTranslation();
  const [localQuery, setLocalQuery] = useState(searchQuery);

  // Use custom notes if provided (e.g. filtered by date), otherwise use store notes
  // If searching, storeNotes are already filtered by search/tags in the store
  const displayNotes = customNotes || storeNotes;

  // Get all unique tags from all notes
  const allTags = getAllTags();

  const debouncedSearch = useDebounce((query: string) => {
    setSearchQuery(query);
    if (query.trim() || selectedTags.length > 0) {
      searchNotes(query, selectedTags.length > 0 ? selectedTags : undefined);
    } else {
      clearFilters();
    }
  }, 300);

  const handleSearchChange = useCallback((value: string) => {
    setLocalQuery(value);
    debouncedSearch(value);
  }, [debouncedSearch]);

  const handleCreateNote = useCallback(async () => {
    const newNote = {
      title: '',
      content: '',
      tags: [],
      role: 'note' as const,
      sourceUrl: ''
    };
    try {
      const created = await createNote(newNote);
      selectNote(created);
    } catch {
      // Error handled in store
    }
  }, [createNote, selectNote]);

  return (
    <div className="flex flex-col h-full">
      <div className="p-4 border-b border-border space-y-2">
        <div className="relative">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder={t('notes.search')}
            value={localQuery}
            onChange={(e) => handleSearchChange(e.target.value)}
            className="pl-8"
          />
        </div>

        {/* Tag Filter */}
        {allTags.length > 0 && (
          <div className="space-y-2">
            <div className="text-xs text-muted-foreground font-medium">
              {t('notes.filterByTags')}:
            </div>
            <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto">
              {allTags.map((tag) => {
                const isSelected = selectedTags.includes(tag);
                return (
                  <Button
                    key={tag}
                    variant={isSelected ? 'default' : 'outline'}
                    size="sm"
                    className={cn(
                      'h-7 px-2 text-xs',
                      isSelected && 'bg-primary text-primary-foreground'
                    )}
                    onClick={() => toggleTag(tag)}
                  >
                    {tag}
                  </Button>
                );
              })}
            </div>
            {selectedTags.length > 0 && (
              <Button
                variant="ghost"
                size="sm"
                className="h-7 px-2 text-xs w-full"
                onClick={clearFilters}
              >
                <X className="h-3 w-3 mr-1" />
                {t('notes.clearFilters')}
              </Button>
            )}
          </div>
        )}

        <Button onClick={handleCreateNote} className="w-full" size="sm">
          <Plus className="mr-2 h-4 w-4" />
          {t('notes.create')}
        </Button>
      </div>

      <div className="flex-1 overflow-auto">
        {isFiltered && (
          <div className="px-4 py-2 bg-secondary/30 border-b border-border flex items-center justify-between">
            <span className="text-xs text-muted-foreground">Filtered by date</span>
            <Button variant="ghost" size="sm" className="h-6 text-xs" onClick={onClearFilter}>
              <X className="h-3 w-3 mr-1" />
              Clear
            </Button>
          </div>
        )}

        {isLoading ? (
          <Loading className="mt-8" />
        ) : displayNotes.length === 0 ? (
          <EmptyState
            title={t('notes.noNotes')}
            description={searchQuery ? t('notes.search') : ''}
          />
        ) : (
          <div className="p-2 space-y-2">
            {displayNotes.map((note) => (
              <NoteCard key={note.id} note={note} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

