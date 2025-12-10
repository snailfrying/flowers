import { ChatInterface } from './ChatInterface.js';
import { ChatInput } from './ChatInput.js';
import { MCPPanel } from './MCPPanel.js';
import { useChatStore } from '@/shared/store/chat-store';
import { Separator } from '@/components/ui/separator';
import { Button } from '@/components/ui/button';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Trash2 } from 'lucide-react';
import { useToast } from '@/components/common/Toaster';

export default function ChatPage() {
  const { mcpTrace, enabledTools, pendingContext, clearInjectedContext, clearHistory, history } = useChatStore();
  const [expanded, setExpanded] = useState(false);
  const { t } = useTranslation();
  const { success } = useToast();

  const handleClear = () => {
    clearHistory();
    success(t('common.success'), t('chat.historyCleared'));
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-4 py-2 border-b">
        <h2 className="text-lg font-semibold">{t('chat.title')}</h2>
        {history.length > 0 && (
          <Button variant="ghost" size="sm" onClick={handleClear}>
            <Trash2 className="h-4 w-4 mr-2" />
            {t('chat.clear')}
          </Button>
        )}
      </div>
      <div className="flex-1 min-h-0">
        <ChatInterface />
      </div>
      <Separator />
      {pendingContext && (
        <div className="px-4 py-2 border-t border-border bg-muted/30">
          <div className="flex items-start justify-between gap-2">
            <div className="text-xs text-muted-foreground">
              <div className="font-medium mb-1">{t('chat.contextCard.title')}</div>
              {pendingContext.sourceUrl && (
                <a className="underline" href={pendingContext.sourceUrl} target="_blank" rel="noreferrer">
                  {t('chat.contextCard.source')}
                </a>
              )}
              <div className="mt-1 whitespace-pre-wrap break-words max-h-24 overflow-hidden" style={{ display: expanded ? 'block' : '-webkit-box', WebkitLineClamp: expanded ? 'unset' as any : 4, WebkitBoxOrient: 'vertical' as any }}>
                {pendingContext.text}
              </div>
            </div>
            <div className="shrink-0 flex gap-2">
              <Button variant="ghost" size="sm" onClick={() => setExpanded(v => !v)}>
                {expanded ? t('chat.contextCard.collapse') : t('chat.contextCard.expand')}
              </Button>
              <Button variant="outline" size="sm" onClick={clearInjectedContext}>{t('chat.contextCard.remove')}</Button>
            </div>
          </div>
        </div>
      )}
      <div className="p-4 border-t border-border">
        <ChatInput />
      </div>
      {enabledTools.mcp && mcpTrace && (
        <>
          <Separator />
          <div className="h-64 border-t border-border overflow-auto">
            <MCPPanel trace={mcpTrace} />
          </div>
        </>
      )}
    </div>
  );
}

