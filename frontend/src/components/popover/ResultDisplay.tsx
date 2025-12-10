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
                <span className="text-xs font-medium text-zinc-500">{labels.result}</span>
                <div className="flex gap-1">
                    <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 w-6 p-0 text-zinc-400 hover:text-zinc-700"
                        onClick={onToggleEdit}
                        title={labels.edit}
                    >
                        <FileText className="h-3.5 w-3.5" />
                    </Button>
                </div>
            </div>

            <div className={cn(
                "w-full rounded-lg bg-zinc-50 dark:bg-zinc-800/50 p-3",
                "border border-zinc-100 dark:border-zinc-800",
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
                    <div className="prose prose-sm dark:prose-invert max-w-none space-y-2 pr-1">
                        <ReactMarkdown components={{
                            p: ({ children }) => <p className="mb-1.5 last:mb-0">{children}</p>,
                            ul: ({ children }) => <ul className="list-disc pl-4 mb-1.5">{children}</ul>,
                            ol: ({ children }) => <ol className="list-decimal pl-4 mb-1.5">{children}</ol>
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
