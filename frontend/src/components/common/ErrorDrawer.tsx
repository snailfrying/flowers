import { useErrorStore } from '@/shared/store/error-store';
import { Button } from '@/components/ui/button';
import { useTranslation } from 'react-i18next';

export function ErrorDrawer() {
  const { isOpen, close, errors, clear } = useErrorStore();
  const { t } = useTranslation();
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-50 pointer-events-none">
      <div className="absolute inset-0 bg-black/30" onClick={close} />
      <div className="absolute right-0 top-0 h-full w-[420px] bg-background border-l border-border shadow-xl pointer-events-auto flex flex-col">
        <div className="p-4 border-b border-border flex items-center justify-between">
          <div className="font-semibold">{t('errorDrawer.title')}</div>
          <div className="flex gap-2">
            <Button variant="ghost" size="sm" onClick={clear}>{t('errorDrawer.clear')}</Button>
            <Button variant="outline" size="sm" onClick={close}>{t('common.close')}</Button>
          </div>
        </div>
        <div className="flex-1 overflow-auto divide-y divide-border">
          {errors.length === 0 ? (
            <div className="p-4 text-sm text-muted-foreground">{t('errorDrawer.empty')}</div>
          ) : (
            errors.map((e) => (
              <div key={e.id} className="p-4 space-y-2">
                <div className="text-sm text-muted-foreground">{new Date(e.ts).toLocaleString()}</div>
                <div className="text-red-600 font-medium break-words">{e.message}</div>
                <div className="grid grid-cols-3 gap-2 text-xs">
                  <div><span className="text-muted-foreground">{t('errorDrawer.code')}</span>: {e.code || '-'}</div>
                  <div><span className="text-muted-foreground">{t('errorDrawer.status')}</span>: {e.status ?? '-'}</div>
                  <div><span className="text-muted-foreground">{t('errorDrawer.model')}</span>: {e.model || '-'}</div>
                  <div className="col-span-3 break-all"><span className="text-muted-foreground">{t('errorDrawer.request')}</span>: {e.url || '-'}</div>
                  <div className="col-span-3 break-all"><span className="text-muted-foreground">{t('errorDrawer.response')}</span>: {e.responsePreview || '-'}</div>
                </div>
                <div className="text-xs text-muted-foreground break-all">{e.context || ''}</div>
              </div>
            ))
          )}
        </div>
        <div className="p-4 border-t border-border">
          <a href="#/settings" className="text-sm underline">{t('errorDrawer.goSettings')}</a>
        </div>
      </div>
    </div>
  );
}


