import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';

interface TextInputProps {
    value: string;
    onChange: (value: string) => void;
    placeholder: string;
}

export function TextInput({ value, onChange, placeholder }: TextInputProps) {
    return (
        <div className="relative group">
            <Textarea
                value={value}
                onChange={(e) => onChange(e.target.value)}
                className={cn(
                    'w-full text-sm min-h-[110px] max-h-[260px] resize-none overflow-y-auto',
                    'bg-transparent border-0 p-0 focus-visible:ring-0 rounded-none',
                    'placeholder:text-zinc-400',
                    'leading-relaxed'
                )}
                placeholder={placeholder}
            />
            {/* Subtle indicator that text is editable */}
            <div className="absolute bottom-0 right-0 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                <span className="text-[10px] text-zinc-300 dark:text-zinc-600">Editable</span>
            </div>
        </div>
    );
}
