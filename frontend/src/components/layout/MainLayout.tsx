import { useRouter } from '@/shared/router';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useTranslation } from 'react-i18next';
import { FileText, MessageSquare, Settings, AlertTriangle, SlidersHorizontal, Network } from 'lucide-react';
import { useErrorStore } from '@/shared/store/error-store';
import { ErrorDrawer } from '@/components/common/ErrorDrawer';

declare const chrome: {
  windows: {
    WINDOW_ID_CURRENT: number;
  };
};

interface MainLayoutProps {
  children: React.ReactNode;
}

export function MainLayout({ children }: MainLayoutProps) {
  const { route, setRoute } = useRouter();
  const { t } = useTranslation();
  const { open } = useErrorStore();

  const navItems: Array<{
    key: ReturnType<typeof useRouter>['route'];
    label: string;
    icon: React.ComponentType<{ className?: string }>;
  }> = [
    { key: 'notes', label: t('notes.title'), icon: FileText },
    { key: 'chat', label: t('chat.title'), icon: MessageSquare },
    { key: 'modelConfig', label: t('settings.modelShort'), icon: SlidersHorizontal },
    { key: 'mcpConfig', label: t('settings.mcpShort'), icon: Network },
    { key: 'settings', label: t('settings.general'), icon: Settings }
  ];

  return (
    <div className="flex h-screen bg-background overflow-hidden">
      {/* Main Content - Left Side */}
      <main className="flex-1 overflow-auto bg-background relative">
        {children}
        <ErrorDrawer />
      </main>

      {/* Navigation Rail - Right Side */}
      <aside className="w-16 bg-secondary/30 flex flex-col items-center py-4 z-20">
        {/* Navigation */}
        <nav className="flex-1 flex flex-col gap-2 w-full px-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = route === item.key;
            return (
              <div key={item.key} className="flex justify-center w-full">
                <Button
                  variant="ghost"
                  className={cn(
                    'flex flex-col items-center justify-center w-full h-auto py-2 gap-1 rounded-lg transition-all duration-200',
                    isActive
                      ? 'bg-white dark:bg-accent shadow-sm text-primary'
                      : 'text-muted-foreground hover:bg-white/50 dark:hover:bg-accent/50 hover:text-foreground'
                  )}
                  onClick={() => setRoute(item.key)}
                >
                  <Icon className={cn('w-5 h-5', isActive && 'text-primary')} />
                  <span className="text-[10px] font-medium leading-none">{item.label}</span>
                </Button>
              </div>
            );
          })}
        </nav>

        {/* Footer / Error Status */}
        <div className="mt-auto pt-4">
          <Button
            variant="ghost"
            size="icon"
            className="w-10 h-10 text-muted-foreground hover:text-destructive"
            onClick={open}
            title={t('common.error')}
          >
            <AlertTriangle className="w-5 h-5" />
          </Button>
        </div>
      </aside>
    </div>
  );
}

