import { useChatStore } from '@/shared/store/chat-store';
import { useSettingsStore } from '@/shared/store/settings-store';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useTranslation } from 'react-i18next';
import { useEffect } from 'react';

export function ModelTypeSelector() {
  const { selectedModel, setSelectedModel } = useChatStore();
  const { settings } = useSettingsStore();
  const { t } = useTranslation();

  // 获取当前 provider 的模型列表
  const activeProvider = settings.providers?.find(
    p => p.id === (settings.activeChatProviderId || settings.defaultProviderId)
  );

  const availableModels = activeProvider?.models || [];

  // 自动选择第一个模型
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
      <div className="text-sm text-muted-foreground">
        {t('chat.noModels')}
      </div>
    );
  }

  const currentModel = selectedModel && availableModels.includes(selectedModel) ? selectedModel : availableModels[0];

  return (
    <Select value={currentModel} onValueChange={setSelectedModel}>
      <SelectTrigger className="w-48">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {availableModels.map((model) => (
          <SelectItem key={model} value={model}>
            {model}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
