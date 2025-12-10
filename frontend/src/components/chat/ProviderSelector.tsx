import { useSettingsStore } from '@/shared/store/settings-store';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useTranslation } from 'react-i18next';
import { Server } from 'lucide-react';
import { useEffect } from 'react';

export function ProviderSelector() {
    const { settings, setActiveChatProvider, loadSettings } = useSettingsStore();
    const { t } = useTranslation();

    useEffect(() => {
        loadSettings();
    }, []);

    const activeProvider = settings.providers?.find(
        p => p.id === settings.activeChatProviderId
    );

    // If no active provider but providers exist, set the first one or default
    useEffect(() => {
        if (!settings.activeChatProviderId && settings.providers && settings.providers.length > 0) {
            const defaultId = settings.defaultProviderId || settings.providers[0].id;
            setActiveChatProvider(defaultId);
        }
    }, [settings.providers, settings.activeChatProviderId, settings.defaultProviderId]);

    if (!settings.providers || settings.providers.length === 0) {
        return (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Server className="w-4 h-4" />
                <span>{t('chat.noProviders')}</span>
            </div>
        );
    }

    // 确保总是有默认值，避免 controlled/uncontrolled 警告
    const currentProviderId = settings.activeChatProviderId || settings.defaultProviderId || settings.providers[0]?.id || '';

    return (
        <Select
            value={currentProviderId}
            onValueChange={setActiveChatProvider}
        >
            <SelectTrigger className="w-[180px] h-9">
                <div className="flex items-center gap-2">
                    <Server className="w-4 h-4" />
                    <SelectValue placeholder={t('chat.selectProvider')}>
                        {activeProvider?.name || settings.providers[0]?.name || t('chat.noProviders')}
                    </SelectValue>
                </div>
            </SelectTrigger>
            <SelectContent>
                {settings.providers.map(p => (
                    <SelectItem key={p.id} value={p.id}>
                        <div className="flex flex-col items-start">
                            <span className="font-medium">{p.name}</span>
                            <span className="text-xs text-muted-foreground">{p.type}</span>
                        </div>
                    </SelectItem>
                ))}
            </SelectContent>
        </Select>
    );
}
