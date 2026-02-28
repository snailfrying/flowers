import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { FileText } from 'lucide-react';
import { cn } from '@/lib/utils';
import ReactMarkdown from 'react-markdown';

interface ResultAction {
    label: string;
    onClick: () => void;
    variant?: 'default' | 'secondary' | 'outline' | 'ghost';
    disabled?: boolean;
}

interface ResultDisplayProps {
    result: string;
    editableResult: string;
    isEditing: boolean;
    actionType: 'polish' | 'translate' | 'note' | 'ask' | null;
    onEditableChange: (value: string) => void;
    onToggleEdit: () => void;
    onReapply: () => void;
    onGenerateNote: () => void;
    labels: {
        result: string;
        edit: string;
        reapply: string;
        generateNote: string;
    };
    actions?: ResultAction[];
}

export function ResultDisplay({
    result,
    editableResult,
    isEditing,
    onEditableChange,
    onToggleEdit,
    onReapply,
    onGenerateNote,
    labels,
    actions
}: ResultDisplayProps) {
    if (!result) return null;

    const defaultActions: ResultAction[] = [
        { label: labels.reapply, onClick: onReapply, variant: 'secondary' },
        { label: labels.generateNote, onClick: onGenerateNote, variant: 'default' }
    ];

    const actionList = actions ?? defaultActions;

    return (
        <div className="animate-in fade-in slide-in-from-bottom-2 duration-200">
            <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-zinc-400">{labels.result}</span>
                <div className="flex gap-1">
                    <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 w-6 p-0 text-zinc-300 hover:text-zinc-600 transition-colors"
                        onClick={onToggleEdit}
                        title={labels.edit}
                    >
                        <FileText className="h-3.5 w-3.5" />
                    </Button>
                </div>
            </div>

            <div className={cn(
                "w-full rounded-lg bg-gradient-to-br from-indigo-50/50 to-blue-50/50 dark:from-indigo-900/20 dark:to-blue-900/20 border border-indigo-100/50 dark:border-indigo-800/30 p-3",
                "text-sm leading-relaxed",
                "max-h-[320px] overflow-y-auto"
            )}>
                {isEditing ? (
                    <Textarea
                        value={editableResult}
                        onChange={(e) => onEditableChange(e.target.value)}
                        className="min-h-[160px] max-h-[320px] bg-transparent border-0 p-0 focus-visible:ring-0 resize-none"
                    />
                ) : (
                    <div className="prose prose-sm dark:prose-invert max-w-none pr-1 border-0">
                        <ReactMarkdown components={{
                            p: ({ children }) => <p className="mb-1.5 last:mb-0 text-[13px] text-zinc-600 dark:text-zinc-400 leading-normal">{children}</p>,
                            ul: ({ children }) => <ul className="list-disc pl-4 mb-1.5 space-y-0.5 text-[13px] text-zinc-600 dark:text-zinc-400 leading-normal">{children}</ul>,
                            ol: ({ children }) => <ol className="list-decimal pl-4 mb-1.5 space-y-0.5 text-[13px] text-zinc-600 dark:text-zinc-400 leading-normal">{children}</ol>,
                            li: ({ children }) => <li className="pl-0.5">{children}</li>,
                            h2: ({ children }) => <h2 className="text-xs font-bold mb-1 mt-2 text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">{children}</h2>,
                            h3: ({ children }) => <h3 className="text-[13px] font-bold mb-0.5 text-zinc-800 dark:text-zinc-200">{children}</h3>,
                            strong: ({ children }) => <strong className="font-bold text-zinc-800 dark:text-zinc-200">{children}</strong>
                        }}>
                            {editableResult}
                        </ReactMarkdown>
                    </div>
                )}
            </div>

            {actionList.length > 0 && (
                <div className="flex gap-2 mt-3">
                    {actionList.map((action) => (
                        <Button
                            key={action.label}
                            variant={action.variant || 'default'}
                            size="sm"
                            className="flex-1 h-8 text-xs"
                            onClick={action.onClick}
                            disabled={action.disabled}
                        >
                            {action.label}
                        </Button>
                    ))}
                </div>
            )}
        </div>
    );
}
