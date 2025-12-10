import { useTranslation } from 'react-i18next';
import { MCPConfig } from './MCPConfig.js';

export function McpConfigPage() {
  const { t } = useTranslation();
  return (
    <div className="h-full overflow-auto p-6">
      <h1 className="text-2xl font-bold mb-6">{t('settings.mcpTitle')}</h1>
      <MCPConfig />
    </div>
  );
}


