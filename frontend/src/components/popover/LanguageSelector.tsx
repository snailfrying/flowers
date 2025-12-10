import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@/lib/utils';

interface LanguageSelectorProps {
    sourceLang: 'zh' | 'en';
    targetLang: string;
    onTargetLangChange: (value: string) => void;
    languageOptions: Array<{ value: string; label: string }>;
    onInteractionStart?: () => void;
}

export function LanguageSelector({
    sourceLang,
    targetLang,
    onTargetLangChange,
    languageOptions,
    onInteractionStart
}: LanguageSelectorProps) {
    const handleChange = (value: string) => {
        onInteractionStart?.();
        onTargetLangChange(value);
    };

    return (
        <div className="flex items-center gap-2 pt-2 border-t border-zinc-100 dark:border-zinc-800">
            <div className="flex items-center gap-1.5 text-xs text-zinc-500">
                <span className={cn("px-1.5 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 font-medium")}>
                    {sourceLang === 'zh' ? '中文' : 'EN'}
                </span>
                <span className="text-zinc-300">→</span>
            </div>

            <Select value={targetLang} onValueChange={handleChange}>
                <SelectTrigger className="h-7 w-[110px] text-xs border-0 bg-zinc-100/50 hover:bg-zinc-100 dark:bg-zinc-800/50 dark:hover:bg-zinc-800 focus:ring-0 px-2 rounded-md">
                    <SelectValue placeholder="Target" />
                </SelectTrigger>
                <SelectContent>
                    {languageOptions.map(opt => (
                        <SelectItem key={opt.value} value={opt.value} className="text-xs">
                            {opt.label}
                        </SelectItem>
                    ))}
                </SelectContent>
            </Select>
        </div>
    );
}
