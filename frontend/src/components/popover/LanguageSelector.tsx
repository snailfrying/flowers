import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

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
        <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5 text-xs text-zinc-400">
                <span className="font-medium">
                    {sourceLang === 'zh' ? '中文' : 'EN'}
                </span>
                <span className="text-zinc-200">→</span>
            </div>

            <Select value={targetLang} onValueChange={handleChange}>
                <SelectTrigger
                    onClick={onInteractionStart}
                    className="h-7 w-[110px] text-xs border-0 bg-zinc-50 hover:bg-zinc-100 dark:bg-zinc-800/50 dark:hover:bg-zinc-800 focus:ring-0 px-2 rounded-md transition-colors"
                >
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
