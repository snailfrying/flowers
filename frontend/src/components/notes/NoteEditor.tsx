import { useState, useEffect } from 'react';
import { useNotesStore } from '@/shared/store/notes-store';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/common/Toaster';
import { useErrorHandler } from '@/shared/hooks/useErrorHandler';
import { useTranslation } from 'react-i18next';
import { Save, X, Trash2 } from 'lucide-react';

interface NoteEditorProps {
  onCancel?: () => void;
}

export function NoteEditor({ onCancel }: NoteEditorProps) {
  const { selectedNote, updateNote, deleteNote, selectNote } = useNotesStore();
  const { success } = useToast();
  const { handleError } = useErrorHandler();
  const { t } = useTranslation();

  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [sourceUrl, setSourceUrl] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    if (selectedNote) {
      setTitle(selectedNote.title);
      setContent(selectedNote.content);
      setTags(selectedNote.tags);
      setSourceUrl(selectedNote.sourceUrl || '');
      setDirty(false);
    }
  }, [selectedNote]);

  if (!selectedNote) return null;

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await updateNote(selectedNote.id, { title, content, tags, sourceUrl });
      success(t('common.success'), t('notes.updateSuccess'));
      setDirty(false);
      onCancel?.(); // Switch back to view mode after save
    } catch (err: unknown) {
      handleError(err, 'error.saveFailed', 'handleSave');
    } finally {
      setIsSaving(false);
    }
  };

  // Auto-save (debounced) when fields change
  useEffect(() => {
    if (!selectedNote) return;
    if (!dirty) return; // only after user edits
    const timer = setTimeout(async () => {
      try {
        await updateNote(selectedNote.id, { title, content, tags, sourceUrl });
      } catch { }
    }, 1000);
    return () => clearTimeout(timer);
  }, [title, content, tags, sourceUrl, dirty, selectedNote, updateNote]);

  const handleDelete = async () => {
    if (confirm(t('notes.delete') + '?')) {
      try {
        await deleteNote(selectedNote.id);
        selectNote(null);
        success(t('common.success'), t('notes.deleteSuccess'));
      } catch (err: unknown) {
        handleError(err, 'error.deleteFailed', 'handleDelete');
      }
    }
  };

  const handleTagInput = (value: string) => {
    setTags(value.split(',').map((t) => t.trim()).filter(Boolean));
  };

  return (
    <div className="flex flex-col h-full">
      <div className="p-4 border-b border-border flex items-center justify-between">
        <h2 className="text-lg font-semibold">{t('notes.edit')}</h2>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={onCancel}>
            <X className="h-4 w-4 mr-1" />
            {t('common.cancel')}
          </Button>
          <Button size="sm" onClick={handleSave} disabled={isSaving}>
            <Save className="h-4 w-4 mr-1" />
            {isSaving ? t('loading.saving') : t('common.save')}
          </Button>
        </div>
      </div>

      <div className="flex-1 overflow-auto p-4 space-y-4">
        <div>
          <label className="text-sm font-medium mb-1 block">{t('notes.title')}</label>
          <Input autoFocus value={title} onChange={(e) => { setTitle(e.target.value); setDirty(true); }} placeholder={t('notes.title')} />
        </div>

        <div>
          <label className="text-sm font-medium mb-1 block">{t('notes.content')}</label>
          <Textarea
            value={content}
            onChange={(e) => { setContent(e.target.value); setDirty(true); }}
            placeholder={t('notes.content')}
            className="min-h-[300px] font-mono"
          />
        </div>

        <div>
          <label className="text-sm font-medium mb-1 block">{t('notes.tags')}</label>
          <Input
            value={tags.join(', ')}
            onChange={(e) => { handleTagInput(e.target.value); setDirty(true); }}
            placeholder="标签，用逗号分隔"
          />
        </div>

        <div>
          <label className="text-sm font-medium mb-1 block">{t('notes.source')}</label>
          <Input value={sourceUrl} onChange={(e) => { setSourceUrl(e.target.value); setDirty(true); }} placeholder="来源链接" />
        </div>

        <div className="pt-4 border-t border-border">
          <Button variant="destructive" size="sm" onClick={handleDelete}>
            <Trash2 className="h-4 w-4 mr-1" />
            {t('notes.delete')}
          </Button>
        </div>
      </div>
    </div>
  );
}

