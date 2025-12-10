import { Button } from '@/components/ui/button';
import { Pin, X } from 'lucide-react';
import { cn } from '@/lib/utils';

interface PopoverHeaderProps {
    isFixed: boolean;
    title: string;
    onToggleFixed: () => void;
    onClose: () => void;
    pinTooltip: string;
    unpinTooltip: string;
    closeTooltip: string;
}

export function PopoverHeader({
    isFixed,
    title,
    onToggleFixed,
    onClose,
    pinTooltip,
    unpinTooltip,
    closeTooltip
}: PopoverHeaderProps) {
    return (
        <div
            data-draggable="true"
            className={cn(
                "flex items-center justify-between px-3 py-2 select-none",
                "bg-zinc-50/50 dark:bg-zinc-900/50",
                "border-b border-zinc-100 dark:border-zinc-800",
                !isFixed && "cursor-move"
            )}
        >
            <div className="flex items-center">
                <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">{title}</span>
            </div>

            <div className="flex items-center gap-0.5">
                <Button
                    variant="ghost"
                    size="icon"
                    className={cn(
                        'h-7 w-7 rounded-md',
                        'text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200',
                        'hover:bg-zinc-100 dark:hover:bg-zinc-800',
                        'transition-colors',
                        isFixed && 'text-blue-600 hover:text-blue-700 bg-blue-50/50 dark:text-blue-400 dark:bg-blue-900/20 dark:hover:text-blue-300'
                    )}
                    onClick={onToggleFixed}
                    onMouseDown={(e) => e.preventDefault()}
                    title={isFixed ? unpinTooltip : pinTooltip}
                >
                    <Pin className={cn("h-4 w-4 transition-transform", isFixed ? "rotate-0" : "rotate-45")} />
                </Button>
                <Button
                    variant="ghost"
                    size="icon"
                    className={cn(
                        'h-7 w-7 rounded-md',
                        'text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200',
                        'hover:bg-zinc-100 dark:hover:bg-zinc-800',
                        'transition-colors'
                    )}
                    onClick={onClose}
                    onMouseDown={(e) => e.preventDefault()}
                    title={closeTooltip}
                >
                    <X className="h-4 w-4" />
                </Button>
            </div>
        </div>
    );
}
