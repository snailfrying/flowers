import { Button } from '@/components/ui/button';
import { Sparkles, Languages, FileText, MessageCircle } from 'lucide-react';

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

    return (
        <div className="grid grid-cols-2 gap-2">
            <Button
                variant="subtle"
                size="sm"
                onClick={onPolish}
                disabled={isProcessing}
                className="justify-start h-8 px-3 text-xs font-normal border-zinc-200 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-800"
            >
                <Sparkles className="h-3.5 w-3.5 mr-2 text-amber-500" />
                {labels.polish}
            </Button>
            <Button
                variant="subtle"
                size="sm"
                onClick={handleTranslate}
                disabled={isProcessing}
                className="justify-start h-8 px-3 text-xs font-normal border-zinc-200 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-800"
            >
                <Languages className="h-3.5 w-3.5 mr-2 text-blue-500" />
                {labels.translate}
            </Button>
            <Button
                variant="subtle"
                size="sm"
                onClick={onGenerateNote}
                disabled={isProcessing}
                className="justify-start h-8 px-3 text-xs font-normal border-zinc-200 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-800"
            >
                <FileText className="h-3.5 w-3.5 mr-2 text-emerald-500" />
                {labels.note}
            </Button>
            <Button
                variant="subtle"
                size="sm"
                onClick={onAsk}
                disabled={isProcessing}
                className="justify-start h-8 px-3 text-xs font-normal border-zinc-200 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-800"
            >
                <MessageCircle className="h-3.5 w-3.5 mr-2 text-purple-500" />
                {labels.ask}
            </Button>
        </div>
    );
}
