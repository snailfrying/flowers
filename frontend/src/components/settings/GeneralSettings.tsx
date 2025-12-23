import { useSettingsStore } from '@/shared/store/settings-store';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { useTranslation } from 'react-i18next';
import { Label } from '@/components/ui/label';
import { useToast } from '@/components/common/Toaster';
import { exportNotes } from '@/shared/api/notes';
import { importFAQs } from '@/shared/api/faqs';
import { useState } from 'react';
import { Switch } from '@/components/ui/switch';

export function GeneralSettings() {
  const {
    language,
    theme,
    fullPageEnabled,
    updateLanguage,
    updateTheme,
    updateFullPageEnabled
  } = useSettingsStore();
  const { t } = useTranslation();
  const { success, error: showError } = useToast();
  const [isExporting, setIsExporting] = useState(false);

  const handleLanguageChange = async (lang: 'zh' | 'en') => {
    await updateLanguage(lang);
    success(t('common.success'), t('settings.languageChanged'));
  };

  const handleThemeChange = (newTheme: 'light' | 'dark' | 'system') => {
    updateTheme(newTheme);
    success(t('common.success'), t('settings.themeChanged'));
  };

  const handleExport = async (format: 'json' | 'markdown') => {
    setIsExporting(true);
    try {
      const content = await exportNotes(format);
      const blob = new Blob([content], {
        type: format === 'json' ? 'application/json' : 'text/markdown'
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `notes.${format === 'json' ? 'json' : 'md'}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      success(t('common.success'), t('common.export') + ' ' + t('common.success').toLowerCase());
    } catch (err: any) {
      showError(t('error.title'), err.message || t('common.export') + ' ' + t('error.unknown'));
    } finally {
      setIsExporting(false);
    }
  };

  const handleFAQImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const text = await file.text();
      let faqs: Array<{ question: string; answer: string; tags?: string[] }>;

      if (file.name.endsWith('.json')) {
        faqs = JSON.parse(text);
      } else if (file.name.endsWith('.csv')) {
        const lines = text.split('\n').filter((line: string) => line.trim());
        const headers = lines[0].split(',').map((h: string) => h.trim());
        const qIndex = headers.indexOf('question');
        const aIndex = headers.indexOf('answer');
        const tIndex = headers.indexOf('tags');

        if (qIndex === -1 || aIndex === -1) {
          throw new Error('CSV must contain "question" and "answer" columns');
        }

        faqs = lines.slice(1).map((line: string) => {
          const values = line.split(',').map((v: string) => v.trim());
          return {
            question: values[qIndex] || '',
            answer: values[aIndex] || '',
            // Tags are comma-separated by design
            tags: tIndex !== -1 && values[tIndex] ? values[tIndex].split(',').map((s: string) => s.trim()).filter(Boolean) : []
          };
        }).filter((faq: { question: string; answer: string }) => faq.question && faq.answer);
      } else {
        throw new Error('Unsupported file format');
      }

      const result = await importFAQs(faqs);
      success(t('common.success'), t('settings.importSuccess', { success: result.success, failed: result.failed }));
      e.target.value = ''; // Reset input
    } catch (err: any) {
      showError(t('error.title'), err.message || t('error.importFailed'));
      e.target.value = ''; // Reset input
    }
  };

  return (
    <div className="space-y-8 max-w-3xl">
      {/* Language and Theme Section */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-3">
          <Label className="text-base font-semibold">{t('settings.language')}</Label>
          <Select value={language} onValueChange={handleLanguageChange}>
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="zh">简体中文</SelectItem>
              <SelectItem value="en">English</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-3">
          <Label className="text-base font-semibold">{t('settings.theme')}</Label>
          <Select value={theme} onValueChange={handleThemeChange}>
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="light">{t('settings.light')}</SelectItem>
              <SelectItem value="dark">{t('settings.dark')}</SelectItem>
              <SelectItem value="system">{t('settings.system')}</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Full-Page Translation Toggle */}
      <div className="flex items-center justify-between p-4 rounded-lg bg-muted/50 border border-border/50">
        <div className="space-y-0.5">
          <Label className="text-base font-semibold">{t('settings.fullPageTranslation')}</Label>
          <p className="text-sm text-muted-foreground">
            {t('settings.fullPageTranslationHint')}
          </p>
        </div>
        <Switch
          checked={fullPageEnabled}
          onCheckedChange={updateFullPageEnabled}
        />
      </div>

      {/* Data Management Section */}
      <div className="pt-6 border-t border-border">
        <h3 className="text-lg font-semibold mb-4">{t('settings.dataManagement')}</h3>
        <div className="space-y-6">
          {/* Export Section */}
          <div className="space-y-3 p-4 rounded-lg bg-muted/50">
            <div>
              <label className="text-sm font-medium block mb-1">{t('common.export')}</label>
              <p className="text-xs text-muted-foreground mb-3">{t('settings.exportHint')}</p>
            </div>
            <div className="flex gap-2 flex-wrap">
              <Button variant="outline" size="sm" onClick={() => handleExport('json')} disabled={isExporting}>
                {isExporting ? t('loading.loading') : `${t('common.export')} JSON`}
              </Button>
              <Button variant="outline" size="sm" onClick={() => handleExport('markdown')} disabled={isExporting}>
                {isExporting ? t('loading.loading') : `${t('common.export')} Markdown`}
              </Button>
            </div>
          </div>

          {/* Import FAQ Section */}
          <div className="space-y-3 p-4 rounded-lg bg-muted/50">
            <div>
              <label className="text-sm font-medium block mb-1">{t('settings.importFAQ')}</label>
              <p className="text-xs text-muted-foreground mb-3">{t('settings.importFAQHint')}</p>
            </div>
            <div className="flex items-center gap-3">
              <div className="relative">
                <Button variant="outline" size="sm" className="cursor-pointer">
                  {t('settings.chooseFile')}
                  <input
                    type="file"
                    accept=".json,.csv"
                    onChange={handleFAQImport}
                    className="absolute inset-0 opacity-0 cursor-pointer"
                  />
                </Button>
              </div>
              <span className="text-sm text-muted-foreground">{t('settings.noFileChosen')}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
