import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useToast } from '@/components/common/Toaster';
import { useErrorHandler } from '@/shared/hooks/useErrorHandler';
import * as agentAPIModule from '@/shared/api/agent';
import { useNotesStore } from '@/shared/store/notes-store';
import { Loading } from '@/components/common/Loading';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import type { Note } from 'backend/types.js';
import type { ChatMessage } from 'backend/types.js';

// Sub-components
import { PopoverHeader } from './PopoverHeader';
import { TextInput } from './TextInput';
import { LanguageSelector } from './LanguageSelector';
import { ActionButtons } from './ActionButtons';
import { ResultDisplay } from './ResultDisplay';
import { usePopoverState } from './usePopoverState';

interface SelectionPopoverProps {
  selectedText: string;
  sourceUrl: string;
  position: { x: number; y: number };
  onClose: () => void;
  onFixed?: (fixed: boolean) => void;
  isFixed?: boolean;
  /** When true, show OCR loading state (extracting text from image) */
  isOCRLoading?: boolean;
  /** When set, show OCR error state with this message */
  ocrError?: string;
}

export function SelectionPopover({
  selectedText,
  sourceUrl,
  onClose,
  onFixed,
  isFixed = false,
  isOCRLoading = false,
  ocrError
}: SelectionPopoverProps) {
  const { t, i18n } = useTranslation();
  const { success } = useToast();
  const { handleError } = useErrorHandler();
  const { createNote, updateNote, selectNote } = useNotesStore();
  const { state, dispatch } = usePopoverState(selectedText, isFixed);
  const popoverRef = useRef<HTMLDivElement>(null);
  const [noteDraft, setNoteDraft] = useState<Omit<Note, 'id' | 'createdAt' | 'updatedAt'> | undefined>(undefined);
  const [lastSavedNoteId, setLastSavedNoteId] = useState<string | null>(null);
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);

  // Setup UI interaction bridge for PDF viewer
  useEffect(() => {
    if (typeof window !== 'undefined') {
      let timeout: any;
      (window as any).__CHROMA_SET_UI_INTERACTING = (value: boolean) => {
        if (value) {
          (window as any).__CHROMA_UI_INTERACTING = true;
          if (timeout) clearTimeout(timeout);
          timeout = setTimeout(() => {
            (window as any).__CHROMA_UI_INTERACTING = false;
          }, 500);
        }
      };
    }
  }, []);

  // Debug log for rendering
  console.log('[SelectionPopover] Rendered. Language:', i18n.language);

  // Language options (could be extracted to a config file in Phase 3)
  const languageOptions: Array<{ value: string; label: string }> = [
    { value: 'zh', label: '中文' },
    { value: 'en', label: 'English' },
    { value: 'es', label: 'Español' },
    { value: 'fr', label: 'Français' },
    { value: 'de', label: 'Deutsch' },
    { value: 'ja', label: '日本語' },
    { value: 'ko', label: '한국어' },
    { value: 'pt', label: 'Português' },
    { value: 'it', label: 'Italiano' },
    { value: 'ru', label: 'Русский' }
  ];

  // Standardized English names used in backend prompts
  const languagePromptNameByCode: Record<string, string> = {
    zh: 'Chinese',
    en: 'English',
    es: 'Spanish',
    fr: 'French',
    de: 'German',
    ja: 'Japanese',
    ko: 'Korean',
    pt: 'Portuguese',
    it: 'Italian',
    ru: 'Russian'
  };

  // If context is invalidated, show a refresh prompt
  if (state.contextInvalid) {
    return (
      <div
        className={cn(
          'flex flex-col items-center justify-center p-4 w-[300px]',
          'bg-white dark:bg-zinc-900 rounded-xl border border-red-200 dark:border-red-900',
          'shadow-xl text-center'
        )}
        style={{ maxWidth: 'calc(100vw - 24px)' }}
      >
        <div className="text-red-500 mb-2">
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" /><line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" /></svg>
        </div>
        <h3 className="font-medium text-zinc-900 dark:text-zinc-100 mb-1">Extension Updated</h3>
        <p className="text-xs text-zinc-500 dark:text-zinc-400 mb-3">
          Please refresh the page to continue using Chroma.
        </p>
        <Button
          size="sm"
          variant="outline"
          onClick={() => window.location.reload()}
          className="w-full"
        >
          Refresh Page
        </Button>
      </div>
    );
  }

  // Helper to set uiInteracting flag
  const setUIInteracting = (value: boolean) => {
    if (typeof window !== 'undefined' && (window as any).__CHROMA_SET_UI_INTERACTING) {
      (window as any).__CHROMA_SET_UI_INTERACTING(value);
      if (value) {
        setTimeout(() => (window as any).__CHROMA_SET_UI_INTERACTING?.(false), 300);
      }
    }
  };

  // Action handlers
  const handlePolish = async () => {
    dispatch({ type: 'SET_PROCESSING', payload: true });
    dispatch({ type: 'SET_ACTION_TYPE', payload: 'polish' });
    try {
      const textToProcess = state.text.editable.trim() || state.text.selected;
      const result = await agentAPIModule.polish({ text: textToProcess });
      dispatch({ type: 'SET_RESULT', payload: result });
    } catch (err: unknown) {
      handleError(err, 'error.polishFailed', 'handlePolish');
    } finally {
      dispatch({ type: 'SET_PROCESSING', payload: false });
    }
  };

  const handleTranslate = async () => {
    dispatch({ type: 'SET_PROCESSING', payload: true });
    dispatch({ type: 'SET_ACTION_TYPE', payload: 'translate' });
    try {
      const textToProcess = state.text.editable.trim() || state.text.selected;
      const finalTargetCode = state.language.target || (state.language.source === 'zh' ? 'en' : 'zh');
      const finalTargetLang = languagePromptNameByCode[finalTargetCode] || finalTargetCode;
      const sourceLangPrompt = languagePromptNameByCode[state.language.source] || state.language.source;
      const result = await agentAPIModule.translate({
        text: textToProcess,
        targetLang: finalTargetLang,
        sourceLang: sourceLangPrompt
      });
      dispatch({ type: 'SET_RESULT', payload: result });
    } catch (err: unknown) {
      handleError(err, 'error.translateFailed', 'handleTranslate');
    } finally {
      dispatch({ type: 'SET_PROCESSING', payload: false });
    }
  };

  const handleGenerateNote = async () => {
    dispatch({ type: 'SET_PROCESSING', payload: true });
    dispatch({ type: 'SET_ACTION_TYPE', payload: 'note' });
    try {
      const source = state.result.editable || state.text.editable || state.text.selected;
      const noteResult = await agentAPIModule.generateNote({
        selectedText: source,
        sourceUrl,
        context: []
      });

      const parsed = normalizeNoteResult(noteResult, source);
      const draft = { ...parsed, sourceUrl };
      setNoteDraft(draft);
      setLastSavedNoteId(null);
      dispatch({ type: 'SET_RESULT', payload: formatNotePreview(parsed) });
    } catch (err: unknown) {
      handleError(err, 'error.generateNoteFailed', 'handleGenerateNote');
    } finally {
      dispatch({ type: 'SET_PROCESSING', payload: false });
    }
  };

  const handleSaveNote = async () => {
    if (!noteDraft) return;
    dispatch({ type: 'SET_PROCESSING', payload: true });
    try {
      if (lastSavedNoteId) {
        await updateNote(lastSavedNoteId, {
          title: noteDraft.title,
          content: noteDraft.content,
          tags: noteDraft.tags,
          sourceUrl
        });
        success(t('common.success'), t('notes.updateSuccess'));
      } else {
        const created = await createNote({
          title: noteDraft.title,
          content: noteDraft.content,
          tags: noteDraft.tags,
          role: 'note',
          sourceUrl
        });
        setLastSavedNoteId(created.id);
        selectNote(created);
        success(t('common.success'), t('notes.generated'));
        if (chrome.storage?.local?.set) {
          await chrome.storage.local.set({ lastCreatedNoteId: created.id });
        }
        chrome.runtime?.sendMessage({ action: 'navigate', route: 'notes', openPanel: true });
      }
      onClose();
    } catch (err: unknown) {
      handleError(err, 'error.saveFailed', 'handleSaveNote');
    } finally {
      dispatch({ type: 'SET_PROCESSING', payload: false });
    }
  };

  const handleAsk = async () => {
    const prompt = (state.result.isEditing ? state.result.editable : state.text.editable)?.trim() || state.text.selected;
    if (!prompt) return;
    dispatch({ type: 'SET_PROCESSING', payload: true });
    dispatch({ type: 'SET_ACTION_TYPE', payload: 'ask' });
    try {
      const userMessage: ChatMessage = { role: 'user', content: prompt };
      const history = [...chatHistory, userMessage];
      setChatHistory(history);
      const conversationText = buildConversationPrompt(history);
      const response = await agentAPIModule.askWithContext({ text: conversationText, sourceUrl });
      const assistantMessage: ChatMessage = { role: 'assistant', content: response.response };
      const nextHistory = [...history, assistantMessage];
      setChatHistory(nextHistory);
      dispatch({ type: 'SET_RESULT', payload: formatChatPreview(nextHistory, t) });
    } catch (err: unknown) {
      handleError(err, 'error.chatFailed', 'handleAsk');
    } finally {
      dispatch({ type: 'SET_PROCESSING', payload: false });
    }
  };

  const handleSendToChatPanel = () => {
    const conversation = chatHistory.length ? formatChatPreview(chatHistory, t) : (state.text.editable || state.text.selected);
    chrome.runtime.sendMessage({
      action: 'openSidePanelWithContext',
      text: conversation,
      sourceUrl
    });
    onClose();
  };

  const handleToggleFixed = () => {
    const newFixed = !state.isFixed;
    dispatch({ type: 'SET_FIXED', payload: newFixed });
    onFixed?.(newFixed);
  };

  const handleReapply = () => {
    const textToUse = state.result.isEditing ? state.result.editable : state.text.editable || state.text.selected;
    dispatch({ type: 'SET_EDITABLE_TEXT', payload: textToUse });
    if (state.actionType === 'polish') handlePolish();
    else if (state.actionType === 'translate') handleTranslate();
  };

  const handlePopoverClick = () => {
    setUIInteracting(true);
  };

  if (isOCRLoading) {
    return (
      <div
        id="chroma-popover"
        data-fixed={state.isFixed ? 'true' : 'false'}
        ref={popoverRef}
        onClick={handlePopoverClick}
        className={cn(
          'flex flex-col overflow-hidden',
          'bg-white/85 backdrop-blur-xl dark:bg-zinc-900/85 dark:backdrop-blur-xl border border-white/20 dark:border-white/10',
          'rounded-2xl shadow-xl',
          'text-zinc-950 dark:text-zinc-50',
          'border-0 shadow-none'
        )}
        style={{ width: '380px', maxWidth: 'min(380px, calc(100vw - 24px))', minWidth: '320px' }}
      >
        <PopoverHeader
          isFixed={state.isFixed}
          title={t('common.brandName')}
          onToggleFixed={handleToggleFixed}
          onClose={onClose}
          pinTooltip={t('popover.pin')}
          unpinTooltip={t('popover.unpin')}
          closeTooltip={t('common.close')}
        />
        <div className="p-6 flex flex-col items-center justify-center text-zinc-500 dark:text-zinc-400">
          <Loading size="sm" />
          <span className="text-sm mt-3">{t('popover.ocrExtracting') || 'Extracting text from image...'}</span>
        </div>
      </div>
    );
  }

  if (ocrError) {
    return (
      <div
        id="chroma-popover"
        data-fixed={state.isFixed ? 'true' : 'false'}
        ref={popoverRef}
        onClick={handlePopoverClick}
        className={cn(
          'flex flex-col overflow-hidden',
          'bg-white/85 backdrop-blur-xl dark:bg-zinc-900/85 dark:backdrop-blur-xl border border-white/20 dark:border-white/10',
          'rounded-2xl shadow-xl',
          'text-zinc-950 dark:text-zinc-50',
          'border-0 shadow-none'
        )}
        style={{ width: '380px', maxWidth: 'min(380px, calc(100vw - 24px))', minWidth: '320px' }}
      >
        <PopoverHeader
          isFixed={state.isFixed}
          title={t('common.brandName')}
          onToggleFixed={handleToggleFixed}
          onClose={onClose}
          pinTooltip={t('popover.pin')}
          unpinTooltip={t('popover.unpin')}
          closeTooltip={t('common.close')}
        />
        <div className="p-4 flex flex-col gap-2">
          <div className="flex items-center gap-2 text-red-500 dark:text-red-400">
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" /></svg>
            <span className="text-sm font-medium">{t('popover.ocrError') || 'OCR Failed'}</span>
          </div>
          <p className="text-sm text-zinc-600 dark:text-zinc-400 break-words">{ocrError}</p>
        </div>
      </div>
    );
  }

  return (
    <div
      id="chroma-popover"
      data-fixed={state.isFixed ? 'true' : 'false'}
      ref={popoverRef}
      onClick={handlePopoverClick}
      className={cn(
        'flex flex-col overflow-hidden',
        'bg-white/85 backdrop-blur-xl dark:bg-zinc-900/85 dark:backdrop-blur-xl border border-white/20 dark:border-white/10',
        'rounded-2xl shadow-xl', // Using Tailwind shadow as fallback/base
        'text-zinc-950 dark:text-zinc-50',
        'transition-all duration-200 ease-out z-50',
        'shadow-[0_8px_30px_rgb(0,0,0,0.12)] dark:shadow-[0_8px_30px_rgb(0,0,0,0.4)]'
      )}
      style={{
        width: '380px',
        maxWidth: 'min(380px, calc(100vw - 24px))',
        minWidth: '320px'
      }}
    >
      <PopoverHeader
        isFixed={state.isFixed}
        title={t('common.brandName')}
        onToggleFixed={handleToggleFixed}
        onClose={onClose}
        pinTooltip={t('popover.pin')}
        unpinTooltip={t('popover.unpin')}
        closeTooltip={t('common.close')}
      />

      <div className="p-4 pt-2 space-y-4">
        <TextInput
          value={state.text.editable}
          onChange={(value) => dispatch({ type: 'SET_EDITABLE_TEXT', payload: value })}
          placeholder={t('popover.selectedText')}
        />


        <LanguageSelector
          sourceLang={state.language.source}
          targetLang={state.language.target}
          onTargetLangChange={(value) => {
            dispatch({ type: 'SET_TARGET_LANG', payload: value });
            dispatch({ type: 'SET_USER_PICKED_TARGET', payload: true });
          }}
          languageOptions={languageOptions}
          onInteractionStart={() => setUIInteracting(true)}
        />

        {
          !state.result.value && (
            <ActionButtons
              isProcessing={state.isProcessing}
              onPolish={handlePolish}
              onTranslate={handleTranslate}
              onGenerateNote={handleGenerateNote}
              onAsk={handleAsk}
              onInteractionStart={() => setUIInteracting(true)}
              labels={{
                polish: t('popover.polish'),
                translate: t('popover.translate'),
                note: t('popover.note'),
                ask: t('popover.ask')
              }}
            />
          )
        }

        {
          state.isProcessing && (
            <div className="py-6 flex flex-col items-center justify-center text-zinc-400">
              <Loading size="sm" />
              <span className="text-xs mt-2">{t('loading.loading')}</span>
            </div>
          )
        }

        {
          !state.isProcessing && (
            <ResultDisplay
              result={state.result.value}
              editableResult={state.result.editable}
              isEditing={state.result.isEditing}
              actionType={state.actionType}
              onEditableChange={(value) => dispatch({ type: 'SET_EDITABLE_RESULT', payload: value })}
              onToggleEdit={() => dispatch({ type: 'SET_IS_EDITING_RESULT', payload: !state.result.isEditing })}
              onReapply={handleReapply}
              onGenerateNote={handleGenerateNote}
              labels={{
                result: t('popover.result'),
                edit: t('common.edit'),
                reapply: t('popover.reapply'),
                generateNote: t('popover.generateNote')
              }}
              actions={getResultActions(state.actionType, {
                t,
                onRegenerate: handleGenerateNote,
                onSaveNote: handleSaveNote,
                onAskAgain: handleAsk,
                onOpenChat: handleSendToChatPanel,
                isProcessing: state.isProcessing,
                noteDraft,
                lastSavedNoteId
              })}
            />
          )
        }
      </div >
    </div >
  );
}

function normalizeNoteResult(noteResult: any, fallback: string): Omit<Note, 'id' | 'createdAt' | 'updatedAt'> {
  try {
    let jsonStr = typeof noteResult === 'string' ? noteResult : JSON.stringify(noteResult);
    const codeBlockMatch = jsonStr.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
    if (codeBlockMatch) {
      jsonStr = codeBlockMatch[1];
    } else {
      const firstBrace = jsonStr.indexOf('{');
      const lastBrace = jsonStr.lastIndexOf('}');
      if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
        jsonStr = jsonStr.substring(firstBrace, lastBrace + 1);
      }
    }
    const parsed = JSON.parse(jsonStr);
    return {
      title: parsed.title?.trim() || fallback.slice(0, 80) || 'Untitled Note',
      content: parsed.content?.trim() || fallback,
      tags: Array.isArray(parsed.tags) ? parsed.tags.filter((tag: string) => !!tag) : [],
      role: 'note',
      sourceUrl: undefined
    };
  } catch (error) {
    console.warn('Failed to parse note JSON, using fallback', error);
    return {
      title: fallback.slice(0, 80) || 'Generated Note',
      content: fallback,
      tags: [],
      role: 'note',
      sourceUrl: undefined
    };
  }
}

function formatNotePreview(note: Pick<Note, 'title' | 'content' | 'tags'>): string {
  const tags = Array.isArray(note.tags) ? note.tags : [];
  const tagsLine = tags.length > 0 ? `\n\n**Tags:** ${tags.map(tag => `#${tag}`).join(' ')}` : '';
  return `**${note.title}**\n\n${note.content}${tagsLine}`;
}

function buildConversationPrompt(history: ChatMessage[]): string {
  return history
    .map((msg) => `${msg.role === 'user' ? 'User' : 'Assistant'}: ${msg.content}`)
    .join('\n');
}

function formatChatPreview(history: ChatMessage[], t: (key: string) => string): string {
  if (!history.length) return '';
  return history
    .map((msg) => `**${msg.role === 'user' ? t('popover.chatUser') : t('popover.chatAssistant')}**：${msg.content}`)
    .join('\n\n');
}

function getResultActions(
  actionType: 'polish' | 'translate' | 'note' | 'ask' | null,
  opts: {
    t: (key: string) => string;
    onRegenerate: () => void;
    onSaveNote: () => void;
    onAskAgain: () => void;
    onOpenChat: () => void;
    isProcessing: boolean;
    noteDraft?: Omit<Note, 'id' | 'createdAt' | 'updatedAt'>;
    lastSavedNoteId: string | null;
  }
) {
  const { t, onRegenerate, onSaveNote, onAskAgain, onOpenChat, isProcessing, noteDraft, lastSavedNoteId } = opts;
  if (actionType === 'note' && noteDraft) {
    return [
      { label: t('popover.regenerate'), onClick: onRegenerate, variant: 'secondary' as const, disabled: isProcessing },
      {
        label: lastSavedNoteId ? t('popover.updateNote') : t('popover.saveNote'),
        onClick: onSaveNote,
        variant: 'default' as const,
        disabled: isProcessing
      }
    ];
  }
  if (actionType === 'ask') {
    return [
      { label: t('popover.askAgain'), onClick: onAskAgain, variant: 'secondary' as const, disabled: isProcessing },
      { label: t('popover.openSidepanel'), onClick: onOpenChat, variant: 'default' as const }
    ];
  }
  return undefined;
}
