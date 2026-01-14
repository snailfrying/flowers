import { Button } from '@/components/ui/button';
import { Sparkles, Languages, FileText, MessageCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ActionButtonsProps {
    isProcessing: boolean;
    onPolish: () => void;
    onTranslate: () => void;
    onGenerateNote: () => void;
    onAsk: () => void;
    onInteractionStart?: () => void;
    labels: {
        polish: string;
        translate: string;
        note: string;
        ask: string;
    };
}

export function ActionButtons({
    isProcessing,
    onPolish,
    onTranslate,
    onGenerateNote,
    onAsk,
    onInteractionStart,
    labels
}: ActionButtonsProps) {
    const handleTranslate = () => {
        onInteractionStart?.();
        onTranslate();
    };

    // Unified button class for consistency and premium flat look
    const buttonClass = cn(
        "relative flex items-center justify-center h-9 px-3",
        "bg-transparent dark:bg-transparent",
        "border-0 shadow-none",
        "text-zinc-500 dark:text-zinc-400 text-xs font-normal",
        "hover:bg-zinc-50 dark:hover:bg-zinc-800/40",
        "transition-all duration-200",
        "disabled:opacity-50 disabled:cursor-not-allowed",
        "rounded-lg"
    );

    return (
        <div className="grid grid-cols-2 gap-2">
            <Button
                variant="subtle"
                onClick={onPolish}
                disabled={isProcessing}
                className={buttonClass}
            >
                <Sparkles className="absolute left-3 h-3.5 w-3.5 text-amber-500" />
                <span>{labels.polish}</span>
            </Button>
            <Button
                variant="subtle"
                onClick={handleTranslate}
                disabled={isProcessing}
                className={buttonClass}
            >
                <Languages className="absolute left-3 h-3.5 w-3.5 text-blue-500" />
                <span>{labels.translate}</span>
            </Button>
            <Button
                variant="subtle"
                onClick={onGenerateNote}
                disabled={isProcessing}
                className={buttonClass}
            >
                <FileText className="absolute left-3 h-3.5 w-3.5 text-emerald-500" />
                <span>{labels.note}</span>
            </Button>
            <Button
                variant="subtle"
                onClick={onAsk}
                disabled={isProcessing}
                className={buttonClass}
            >
                <MessageCircle className="absolute left-3 h-3.5 w-3.5 text-purple-500" />
                <span>{labels.ask}</span>
            </Button>
        </div>
    );
}
