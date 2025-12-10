import { useChatStore } from '@/shared/store/chat-store';
import { Button } from '@/components/ui/button';
import { useTranslation } from 'react-i18next';
import { cn } from '@/lib/utils';
import { Database, Eye } from 'lucide-react';

export function ToolToggles() {
  const { enabledTools, toggleTool } = useChatStore();
  const { t } = useTranslation();

  const tools: Array<{ key: 'rag' | 'mcp'; label: string; icon: React.ReactNode }> = [
    { key: 'rag', label: t('chat.rag'), icon: <Database className="h-4 w-4" /> },
    { key: 'mcp', label: t('chat.mcp'), icon: <Eye className="h-4 w-4" /> }
  ];

  return (
    <div className="flex gap-1">
      {tools.map((tool) => (
        <Button
          key={tool.key}
          variant={enabledTools[tool.key] ? 'default' : 'outline'}
          size="sm"
          onClick={() => toggleTool(tool.key)}
          className={cn('flex items-center gap-1', enabledTools[tool.key] && 'bg-primary')}
          title={tool.label}
        >
          {tool.icon}
        </Button>
      ))}
    </div>
  );
}

