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
                "flex items-center justify-between px-4 py-2 select-none",
                !isFixed && "cursor-grab active:cursor-grabbing"
            )}
        >
            <div className="flex items-center">
                <span className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">{title}</span>
            </div>

            <div className="flex items-center gap-0.5">
                <Button
                    variant="ghost"
                    size="sm"
                    className={cn(
                        "h-7 w-7 p-0 rounded-full border-0 bg-transparent shadow-none",
                        "text-zinc-400 hover:text-blue-500 hover:bg-zinc-100/50 dark:hover:bg-zinc-800/50 transition-all",
                        isFixed && "text-blue-500"
                    )}
                    onClick={onToggleFixed}
                    title={isFixed ? unpinTooltip : pinTooltip}
                >
                    <Pin className={cn("h-3.5 w-3.5 transition-transform duration-300", !isFixed && "rotate-45")} />
                </Button>
                <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 w-7 p-0 rounded-full border-0 bg-transparent shadow-none text-zinc-400 hover:text-red-500 hover:bg-zinc-100/50 dark:hover:bg-zinc-800/50 transition-all"
                    onClick={onClose}
                    title={closeTooltip}
                >
                    <X className="h-4 w-4" />
                </Button>
            </div>
        </div>
    );
}
