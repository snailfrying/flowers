import { useEffect, useState } from 'react';
import { useSettingsStore } from '@/shared/store/settings-store';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { ChevronDown } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { getAllPrompts, setPromptOverride, resetPromptOverride } from '@/shared/api/prompts';
import { useToast } from '@/components/common/Toaster';

export function PromptManagement() {
  const { language } = useSettingsStore();
  const { t } = useTranslation();
  const { success, error: showError } = useToast();
  const [prompts, setPrompts] = useState<Record<string, { default: string; override?: string }>>({});
  const [editing, setEditing] = useState<Record<string, string>>({});

  useEffect(() => {
    loadPrompts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [language]);

  const loadPrompts = async () => {
    try {
      const data = await getAllPrompts(language);
      setPrompts(data);
      setEditing({});
    } catch (err: any) {
      showError(t('error.title'), err.message || '加载失败');
    }
  };

  const handleSave = async (key: string) => {
    try {
      const value = editing[key] || '';
      if (value.trim()) {
        await setPromptOverride(key as any, language, value);
      } else {
        await resetPromptOverride(key as any, language);
      }
      await loadPrompts();
      success(t('common.success'), t('settings.promptSaved'));
    } catch (err: any) {
      showError(t('error.title'), err.message || t('error.saveFailed'));
    }
  };

  const handleReset = async (key: string) => {
    try {
      await resetPromptOverride(key as any, language);
      await loadPrompts();
      success(t('common.success'), t('settings.promptReset'));
    } catch (err: any) {
      showError(t('error.title'), err.message || t('settings.resetFailed'));
    }
  };

  const handleExportAll = () => {
    const blob = new Blob([JSON.stringify(prompts, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'prompts.json';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleImportAll = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const text = await file.text();
      const data = JSON.parse(text) as Record<string, { default: string; override?: string }>;
      for (const [key, val] of Object.entries(data)) {
        if (typeof val.override === 'string') {
          if (val.override.trim()) await setPromptOverride(key as any, language, val.override);
          else await resetPromptOverride(key as any, language);
        }
      }
      await loadPrompts();
      success(t('common.success'), t('settings.promptSaved'));
      e.target.value = '';
    } catch (err: any) {
      showError(t('error.title'), err.message || t('settings.importFailed'));
      e.target.value = '';
    }
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between mb-2">
        <div className="text-sm text-muted-foreground">{t('settings.promptTips')}</div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={handleExportAll}>{t('settings.export')}</Button>
          <div className="relative">
            <Button variant="outline" size="sm" className="cursor-pointer">
              {t('settings.import')}
              <input
                type="file"
                accept=".json"
                onChange={handleImportAll}
                className="absolute inset-0 opacity-0 cursor-pointer"
              />
            </Button>
          </div>
        </div>
      </div>
      {Object.entries(prompts).map(([key, prompt]) => (
        <Collapsible key={key}>
          <CollapsibleTrigger className="flex items-center justify-between w-full p-3 bg-muted rounded-lg hover:bg-accent">
            <span className="font-medium">{t(`settings.promptKeyLabel.${key}`, { defaultValue: key })}</span>
            <ChevronDown className="h-4 w-4" />
          </CollapsibleTrigger>
          <CollapsibleContent className="p-4 space-y-4">
            <div>
              <label className="text-sm font-medium mb-2 block">{t('settings.defaultPrompt')}</label>
              <Textarea value={prompt.default} readOnly className="font-mono text-sm" rows={5} />
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">{t('settings.customPrompt')}</label>
              <Textarea
                value={editing[key] ?? prompt.override ?? ''}
                onChange={(e) => setEditing({ ...editing, [key]: e.target.value })}
                className="font-mono text-sm"
                rows={5}
                placeholder="留空则使用默认提示词"
              />
              <div className="flex gap-2 mt-2">
                <Button size="sm" onClick={() => handleSave(key)}>
                  {t('common.save')}
                </Button>
                <Button size="sm" variant="outline" onClick={() => handleReset(key)}>
                  {t('settings.reset')}
                </Button>
              </div>
            </div>
          </CollapsibleContent>
        </Collapsible>
      ))}
    </div>
  );
}
