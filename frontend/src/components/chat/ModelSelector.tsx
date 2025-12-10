import { useSettingsStore } from '@/shared/store/settings-store';
import { useChatStore } from '@/shared/store/chat-store';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useTranslation } from 'react-i18next';
import { Box } from 'lucide-react';
import { useEffect } from 'react';

export function ModelSelector() {
    const { settings } = useSettingsStore();
    const { selectedModel, setSelectedModel } = useChatStore();
    const { t } = useTranslation();

    const activeProvider = settings.providers?.find(
        p => p.id === settings.activeChatProviderId
    );

    const availableModels = activeProvider?.models || [];

    // Auto-select first model if none selected or if provider changed
    useEffect(() => {
        if (availableModels.length === 0) {
            if (selectedModel) {
                setSelectedModel('');
            }
            return;
        }
        if (!selectedModel || !availableModels.includes(selectedModel)) {
            setSelectedModel(availableModels[0]);
        }
    }, [availableModels, selectedModel, setSelectedModel]);

    if (availableModels.length === 0) {
        return (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Box className="w-4 h-4" />
                <span>{t('chat.noModels')}</span>
            </div>
        );
    }

    // 确保总是有默认值
    const currentModel = selectedModel && availableModels.includes(selectedModel) ? selectedModel : availableModels[0];

    return (
        <Select
            value={currentModel}
            onValueChange={setSelectedModel}
        >
            <SelectTrigger className="w-[200px] h-9">
                <div className="flex items-center gap-2">
                    <Box className="w-4 h-4" />
                    <SelectValue placeholder={t('chat.selectModel')}>
                        {currentModel}
                    </SelectValue>
                </div>
            </SelectTrigger>
            <SelectContent>
                {availableModels.map(model => (
                    <SelectItem key={model} value={model}>
                        {model}
                    </SelectItem>
                ))}
            </SelectContent>
        </Select>
    );
}
