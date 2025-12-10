import { useEffect, useState } from 'react';
import { useNotesStore } from '@/shared/store/notes-store';
import { NotesList } from './NotesList';
import { NoteEditor } from './NoteEditor.js';
import { NoteViewer } from './NoteViewer';
import { Loading } from '@/components/common/Loading';
import { useTranslation } from 'react-i18next';
import { Calendar } from '@/components/common/Calendar';
import { Button } from '@/components/ui/button';
import { ChevronLeft, Calendar as CalendarIcon } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { format, isSameDay } from 'date-fns';
import { zhCN, enUS } from 'date-fns/locale';
import { useSettingsStore } from '@/shared/store/settings-store';
import { cn } from '@/lib/utils';
import type { Note } from 'backend/types';

// Minimal Chrome typings for TS build in sidepanel context
// @ts-ignore
declare const chrome: { storage?: { local: { get: (keys: any) => Promise<any>; set: (items: Record<string, any>) => Promise<void> } } };

export default function NotesPage() {
  const { notes, isLoading, loadNotes, selectedNote, selectNote } = useNotesStore();
  const { t } = useTranslation();
  const { language } = useSettingsStore();
  const [editing, setEditing] = useState(false);
  const [viewMode, setViewMode] = useState<'list' | 'detail'>('list');
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);
  const [calendarMarkers, setCalendarMarkers] = useState<Map<string, number>>(new Map());

  useEffect(() => {
    let mounted = true;
    (async () => {
      await loadNotes();
      try {
        // Read last created note id and focus it once after load
        if (typeof chrome !== 'undefined' && chrome.storage?.local) {
          // @ts-ignore - allow array of keys
          const { lastCreatedNoteId } = await chrome.storage.local.get(['lastCreatedNoteId']);
          if (mounted && lastCreatedNoteId) {
            const target = (notes || []).find(n => n.id === lastCreatedNoteId);
            if (target) {
              selectNote(target);
              setViewMode('detail');
            }
            // one-time consume
            await chrome.storage.local.set({ lastCreatedNoteId: null });
          }
        }
      } catch { }
    })();
    return () => { mounted = false; };
  }, [loadNotes, selectNote]);

  // Auto-switch to detail view when a note is selected
  useEffect(() => {
    if (selectedNote) {
      setViewMode('detail');
      setEditing(false); // Default to view mode
    }
  }, [selectedNote]);

  useEffect(() => {
    setCalendarMarkers(buildCalendarMarkers(notes));
  }, [notes]);

  const handleBack = () => {
    selectNote(null);
    setViewMode('list');
    setEditing(false);
  };

  const filteredNotes = selectedDate
    ? notes.filter(n => isSameDay(new Date(n.createdAt), selectedDate))
    : notes;

  if (isLoading && notes.length === 0) {
    return <Loading className="h-full" text={t('loading.loading')} />;
  }

  return (
    <div className="h-full flex flex-col bg-background">
      {viewMode === 'list' ? (
        <div className="flex flex-col h-full">
          {/* List Header with Calendar Toggle */}
          <div className="px-4 py-3 border-b border-border flex items-center justify-between bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 z-10 sticky top-0">
            <h2 className="font-semibold text-lg">{t('notes.title')}</h2>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant={selectedDate ? 'default' : 'ghost'} size="sm" className="h-8 gap-2">
                  <CalendarIcon className="h-4 w-4" />
                  {selectedDate ? format(selectedDate, 'MMM d', { locale: language === 'zh' ? zhCN : enUS }) : ''}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="end">
                <Calendar
                  selectedDate={selectedDate}
                  onSelectDate={setSelectedDate}
                  dayRenderer={(day) => {
                    const key = format(day, 'yyyy-MM-dd');
                    const hasNotes = calendarMarkers.get(key);
                    return (
                      <div className="relative flex items-center justify-center">
                        {hasNotes ? (
                          <span className="absolute inset-0 rounded-full bg-primary/10" />
                        ) : null}
                        <span
                          className={cn(
                            'relative z-10 transition-colors',
                            hasNotes && 'text-primary font-semibold'
                          )}
                        >
                          {day.getDate()}
                        </span>
                      </div>
                    );
                  }}
                />
              </PopoverContent>
            </Popover>
          </div>

          {/* Notes List */}
          <div className="flex-1 overflow-hidden">
            <NotesList
              customNotes={filteredNotes}
              isFiltered={!!selectedDate}
              onClearFilter={() => setSelectedDate(undefined)}
            />
          </div>
        </div>
      ) : (
        <div className="flex flex-col h-full">
          {/* Detail Header */}
          <div className="px-2 py-2 border-b border-border flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={handleBack} className="gap-1 pl-1 pr-3 text-muted-foreground hover:text-foreground">
              <ChevronLeft className="h-5 w-5" />
              {t('common.back')}
            </Button>
            <div className="flex-1" />
          </div>

          {/* Editor/Viewer */}
          <div className="flex-1 overflow-auto">
            {selectedNote ? (
              editing ? (
                <NoteEditor onCancel={() => setEditing(false)} />
              ) : (
                <NoteViewer note={selectedNote as any} onEdit={() => setEditing(true)} />
              )
            ) : (
              <div className="p-8 text-center text-muted-foreground">Note not found</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function buildCalendarMarkers(notes: Note[]): Map<string, number> {
  const markers = new Map<string, number>();
  for (const note of notes) {
    const key = format(new Date(note.createdAt), 'yyyy-MM-dd');
    markers.set(key, (markers.get(key) || 0) + 1);
  }
  return markers;
}

