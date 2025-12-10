import { useState, useEffect } from 'react';
import { useSettingsStore } from '@/shared/store/settings-store';
import { useTranslation } from 'react-i18next';
import { useToast } from '@/components/common/Toaster';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import type { MCPServiceConfig } from 'backend/types.js';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { Loading } from '@/components/common/Loading';
import { Settings as SettingsIcon, Edit3, Trash2 } from 'lucide-react';

export function MCPConfig() {
  const {
    settings,
    loadSettings,
    addMcpService,
    updateMcpService,
    removeMcpService
  } = useSettingsStore();
  const { t } = useTranslation();
  const { success, error: showError } = useToast();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingService, setEditingService] = useState<Partial<MCPServiceConfig> | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isImportDialogOpen, setIsImportDialogOpen] = useState(false);
  const [importPayload, setImportPayload] = useState('');
  const [isImporting, setIsImporting] = useState(false);

  useEffect(() => {
    if (settings.mcpServices === undefined) {
      loadSettings().catch(() => { });
    }
  }, [loadSettings, settings.mcpServices]);

  const openAddDialog = () => {
    setEditingService({
      name: '',
      serverUrl: '',
      apiKey: '',
      enabled: true,
      description: ''
    });
    setIsDialogOpen(true);
  };

  const openEditDialog = (service: MCPServiceConfig) => {
    setEditingService({ ...service });
    setIsDialogOpen(true);
  };

  const handleSave = async () => {
    if (!editingService?.name || !editingService?.serverUrl) {
      showError(t('error.title'), t('settings.mcpMissingFields'));
      return;
    }
    setIsSaving(true);
    try {
      if (editingService.id) {
        await updateMcpService(editingService.id, {
          name: editingService.name,
          serverUrl: editingService.serverUrl,
          apiKey: editingService.apiKey,
          enabled: editingService.enabled ?? true,
          description: editingService.description
        });
        success(t('common.success'), t('settings.mcpUpdated'));
      } else {
        await addMcpService({
          name: editingService.name,
          serverUrl: editingService.serverUrl,
          apiKey: editingService.apiKey,
          enabled: editingService.enabled ?? true,
          description: editingService.description
        });
        success(t('common.success'), t('settings.mcpAdded'));
      }
      setIsDialogOpen(false);
      setEditingService(null);
    } catch (err: any) {
      showError(t('error.title'), err?.message || String(err));
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm(t('settings.mcpConfirmDelete'))) return;
    await removeMcpService(id);
    success(t('common.success'), t('settings.mcpDeleted'));
  };

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold flex items-center gap-2">
            <SettingsIcon className="w-5 h-5 text-primary" />
            {t('settings.mcpTitle')}
          </h2>
          <p className="text-sm text-muted-foreground mt-1">{t('settings.mcpDescription')}</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setIsImportDialogOpen(true)}>
            {t('settings.importMcp')}
          </Button>
          <Button onClick={openAddDialog}>{t('settings.addMcpService')}</Button>
        </div>
      </div>

      <div className="grid gap-4">
        {(settings.mcpServices || []).map((service) => (
          <Card key={service.id} className="group relative">
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>{service.name}</span>
                <div className="flex items-center gap-2 text-xs">
                  <span className={service.enabled ? 'text-green-600' : 'text-muted-foreground'}>
                    {service.enabled ? t('settings.mcpEnabledLabel') : t('settings.mcpDisabledLabel')}
                  </span>
                </div>
              </CardTitle>
              <CardDescription className="truncate">{service.serverUrl}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              {service.description && (
                <p className="text-sm text-muted-foreground">{service.description}</p>
              )}
              <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                <Button variant="outline" size="sm" onClick={() => openEditDialog(service)}>
                  <Edit3 className="w-4 h-4 mr-1" />
                  {t('common.edit')}
                </Button>
                <Button variant="outline" size="sm" className="text-destructive border-destructive" onClick={() => handleDelete(service.id)}>
                  <Trash2 className="w-4 h-4 mr-1" />
                  {t('common.delete')}
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}

        {(!settings.mcpServices || settings.mcpServices.length === 0) && (
          <div className="border border-dashed rounded-lg p-6 text-center text-muted-foreground">
            {t('settings.mcpEmpty')}
          </div>
        )}
      </div>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-[520px]">
          <DialogHeader>
            <DialogTitle>
              {editingService?.id ? t('settings.editMcpService') : t('settings.addMcpService')}
            </DialogTitle>
            <DialogDescription>{t('settings.mcpDialogDescription')}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="grid gap-2">
              <Label>{t('settings.mcpName')}</Label>
              <Input
                value={editingService?.name || ''}
                onChange={(e) => setEditingService((prev) => ({ ...prev!, name: e.target.value }))}
                placeholder="Cherry MCP"
              />
            </div>
            <div className="grid gap-2">
              <Label>{t('settings.mcpEndpoint')}</Label>
              <Input
                value={editingService?.serverUrl || ''}
                onChange={(e) => setEditingService((prev) => ({ ...prev!, serverUrl: e.target.value }))}
                placeholder="https://mcp.example.com"
              />
            </div>
            <div className="grid gap-2">
              <Label>{t('settings.mcpApiKey')}</Label>
              <Input
                type="password"
                value={editingService?.apiKey || ''}
                onChange={(e) => setEditingService((prev) => ({ ...prev!, apiKey: e.target.value }))}
                placeholder="sk-..."
              />
            </div>
            <div className="grid gap-2">
              <Label>{t('settings.mcpDescriptionLabel')}</Label>
              <Textarea
                value={editingService?.description || ''}
                onChange={(e) => setEditingService((prev) => ({ ...prev!, description: e.target.value }))}
                placeholder={t('settings.mcpDescriptionPlaceholder') || ''}
              />
            </div>
            <div className="flex items-center justify-between">
              <Label>{t('settings.mcpEnabledLabel')}</Label>
              <Switch
                checked={editingService?.enabled ?? true}
                onCheckedChange={(checked: boolean) => setEditingService((prev) => ({ ...prev!, enabled: checked }))}
              />
            </div>
            <div className="p-3 rounded-md bg-muted/30 text-xs text-muted-foreground">
              {t('settings.modelscopeHint')}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
              {t('common.cancel')}
            </Button>
            <Button onClick={handleSave} disabled={isSaving}>
              {isSaving ? <Loading size="sm" /> : t('common.save')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isImportDialogOpen} onOpenChange={setIsImportDialogOpen}>
        <DialogContent className="sm:max-w-[520px]">
          <DialogHeader>
            <DialogTitle>{t('settings.importMcp')}</DialogTitle>
            <DialogDescription>{t('settings.importMcpDesc')}</DialogDescription>
          </DialogHeader>
          <Textarea
            value={importPayload}
            onChange={(e) => setImportPayload(e.target.value)}
            placeholder={t('settings.importMcpPlaceholder') || ''}
            className="min-h-[200px]"
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsImportDialogOpen(false)}>
              {t('common.cancel')}
            </Button>
            <Button
              onClick={async () => {
                setIsImporting(true);
                try {
                  const services = normalizeModelScopeImport(importPayload);
                  if (!services.length) {
                    throw new Error(t('settings.importMcpEmpty'));
                  }
                  for (const svc of services) {
                    await addMcpService(svc);
                  }
                  success(t('common.success'), t('settings.importMcpSuccess', { count: services.length }));
                  setImportPayload('');
                  setIsImportDialogOpen(false);
                } catch (err: any) {
                  showError(t('error.title'), err?.message || t('settings.importMcpError'));
                } finally {
                  setIsImporting(false);
                }
              }}
              disabled={isImporting}
            >
              {isImporting ? <Loading size="sm" /> : t('settings.importMcp')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function normalizeModelScopeImport(payload: string): Array<Omit<MCPServiceConfig, 'id'>> {
  const text = payload.trim();
  if (!text) return [];
  let data: any;
  try {
    data = JSON.parse(text);
  } catch (err) {
    throw new Error('Invalid JSON format');
  }
  const servers = data?.mcpServers;
  if (!servers || typeof servers !== 'object') return [];
  const result: Array<Omit<MCPServiceConfig, 'id'>> = [];
  for (const [name, cfg] of Object.entries<any>(servers)) {
    const url = cfg?.url?.trim();
    if (!url) continue;
    result.push({
      name: name || 'ModelScope MCP',
      serverUrl: url,
      apiKey: '',
      description: cfg?.description || '',
      enabled: true,
      protocol: 'modelscope'
    } as Omit<MCPServiceConfig, 'id'>);
  }
  return result;
}


