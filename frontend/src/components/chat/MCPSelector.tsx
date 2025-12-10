import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { useChatStore } from '@/shared/store/chat-store';
import { useSettingsStore } from '@/shared/store/settings-store';
import { useRouter } from '@/shared/router';
import { useTranslation } from 'react-i18next';
import { Badge } from '@/components/ui/badge';

export function MCPSelector() {
  const services = useSettingsStore((s) => s.settings.mcpServices || []);
  const { activeMcpServices, setActiveMcpServices } = useChatStore();
  const { t } = useTranslation();
  const { setRoute } = useRouter();

  const toggleService = (id: string) => {
    if (activeMcpServices.includes(id)) {
      setActiveMcpServices(activeMcpServices.filter((svcId) => svcId !== id));
    } else {
      setActiveMcpServices([...activeMcpServices, id]);
    }
  };

  const selectedCount = activeMcpServices.length;

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm">
          {t('chat.mcpSelector')}
          {selectedCount > 0 && (
            <Badge variant="secondary" className="ml-2">
              {selectedCount}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-72">
        {services.length === 0 ? (
          <div className="text-sm text-muted-foreground space-y-2">
            <p>{t('chat.noMcpServices')}</p>
            <Button variant="link" className="px-0" onClick={() => setRoute('mcpConfig')}>
              {t('chat.goMcpSettings')}
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="text-xs text-muted-foreground">
              {t('chat.mcpSelected', { count: selectedCount })}
            </div>
            <div className="space-y-2 max-h-64 overflow-auto pr-1">
              {services.map((service) => (
                <label key={service.id} className="flex items-start gap-2 text-sm">
                  <Checkbox
                    checked={activeMcpServices.includes(service.id)}
                    onChange={() => toggleService(service.id)}
                  />
                  <div className="flex-1">
                    <div className="font-medium">{service.name}</div>
                    <div className="text-xs text-muted-foreground truncate">{service.serverUrl}</div>
                  </div>
                </label>
              ))}
            </div>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}


