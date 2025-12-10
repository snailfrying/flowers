import { useTranslation } from 'react-i18next';
import { ModelConfig } from './ModelConfig.js';

export function ModelConfigPage() {
  const { t } = useTranslation();
  return (
    <div className="h-full overflow-auto p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold mb-2">{t('settings.modelConfiguration')}</h1>
        <p className="text-sm text-muted-foreground">{t('settings.providerDescription')}</p>
      </div>
      <ModelConfig />
    </div>
  );
}


