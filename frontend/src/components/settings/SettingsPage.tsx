import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { GeneralSettings } from './GeneralSettings.js';
import { PromptManagement } from './PromptManagement.js';
import { useTranslation } from 'react-i18next';

export default function SettingsPage() {
  const { t } = useTranslation();

  return (
    <div className="h-full overflow-auto p-6">
      <h1 className="text-2xl font-bold mb-6">{t('settings.title')}</h1>
      <Tabs defaultValue="general" className="w-full">
        <TabsList>
          <TabsTrigger value="general">{t('settings.general')}</TabsTrigger>
          <TabsTrigger value="prompts">{t('settings.prompts')}</TabsTrigger>
        </TabsList>
        <TabsContent value="general" className="mt-4">
          <GeneralSettings />
        </TabsContent>
        <TabsContent value="prompts" className="mt-4">
          <PromptManagement />
        </TabsContent>
      </Tabs>
    </div>
  );
}

