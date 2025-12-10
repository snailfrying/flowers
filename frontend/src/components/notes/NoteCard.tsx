import type { Note } from 'backend/types.js';
import { useSettingsStore } from '@/shared/store/settings-store';
import { useNotesStore } from '@/shared/store/notes-store';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { zhCN, enUS } from 'date-fns/locale';
import { Trash2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface NoteCardProps {
  note: Note;
}

export function NoteCard({ note }: NoteCardProps) {
  const { selectedNote, selectNote } = useNotesStore();
  const { language } = useSettingsStore();
  const { t } = useTranslation();
  const isSelected = selectedNote?.id === note.id;

  const locale = language === 'zh' ? zhCN : enUS;

  const cleanTitle = (raw: string): string => {
    if (!raw) return t('notes.untitled');
    // Remove leading "**主题**:" or variants
    return raw
      .replace(/^\s*\*\*\s*主题\s*\*\*\s*[:：]\s*/i, '')
      .trim() || t('notes.untitled');
  };

  const extractPreview = (raw: string): string => {
    if (!raw) return '';
    // Remove label lines like **内容**: or **标签**:
    const noLabel = raw
      .replace(/^\s*\*\*\s*内容\s*\*\*\s*[:：]\s*/im, '')
      .replace(/^\s*\*\*\s*标签\s*\*\*\s*[:：][\s\S]*/im, '')
      .trim();
    // Collapse markdown for preview
    return noLabel
      .replace(/\*\*([^*]+)\*\*/g, '$1')
      .replace(/`([^`]+)`/g, '$1')
      .replace(/^[#>-]\s*/gm, '')
      .replace(/\n+/g, ' ')
      .slice(0, 160);
  };

  const extractTags = (): string[] => {
    if (Array.isArray(note.tags) && note.tags.length > 0) return note.tags;
    const fromContent: string[] = [];
    const m = note.content?.match(/#([^#\s，,]+)/g) || [];
    for (const t of m) {
      const tag = t.replace(/^#/, '').trim();
      if (tag && !fromContent.includes(tag)) fromContent.push(tag);
    }
    return fromContent.slice(0, 5);
  };

  const tags = extractTags();

  return (
    <div
      className={cn(
        'p-3 rounded-lg cursor-pointer transition-all duration-200 group relative',
        'hover:bg-secondary/50',
        isSelected
          ? 'bg-secondary shadow-sm ring-1 ring-border'
          : 'bg-card border border-transparent hover:border-border/50'
      )}
      onClick={() => selectNote(note)}
    >
      <h3 className="font-semibold text-sm mb-1 truncate">{cleanTitle(note.title)}</h3>
      <p className="text-xs text-muted-foreground line-clamp-2 mb-2">{extractPreview(note.content)}</p>
      <div className="flex items-center justify-start text-xs text-muted-foreground mb-1">
        <div className="flex gap-2 overflow-hidden">
          {tags.slice(0, 3).map((tag) => (
            <span key={tag} className="px-1.5 py-0.5 bg-secondary rounded whitespace-nowrap">
              {tag}
            </span>
          ))}
        </div>
      </div>
      <div className="flex items-center justify-between text-[11px] text-muted-foreground">
        <span className="whitespace-nowrap">{format(new Date(note.createdAt), 'yyyy/MM/dd', { locale })}</span>
        <div className="flex items-center gap-3">
          {note.sourceUrl && (
            <a
              href={note.sourceUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary hover:underline max-w-[120px] truncate"
              onClick={(e) => e.stopPropagation()}
            >
              {t('notes.sourceLink')}
            </a>
          )}
          <button
            className="opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:bg-destructive/10 hover:text-destructive rounded"
            onClick={(e) => {
              e.stopPropagation();
              if (confirm(t('notes.deleteConfirm'))) {
                useNotesStore.getState().deleteNote(note.id);
              }
            }}
            title={t('notes.deleteTooltip')}
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}

