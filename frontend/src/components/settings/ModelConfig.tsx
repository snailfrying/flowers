import { useEffect, useState } from 'react';
import { useSettingsStore } from '@/shared/store/settings-store';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Card, CardContent, CardHeader, CardTitle, CardDescription as CardDesc } from '@/components/ui/card';
import { useTranslation } from 'react-i18next';
import { useToast } from '@/components/common/Toaster';
import { Loading } from '@/components/common/Loading';
import { Plus, Trash2, Edit2, Server, Key, Box } from 'lucide-react';
import type { ModelProvider } from 'backend/types';

export function ModelConfig() {
  const { settings, loadSettings, addProvider, updateProvider, removeProvider, setDefaultProvider, setActiveChatProvider, setActiveEmbeddingProvider } = useSettingsStore();
  const { t } = useTranslation();
  const { success, error: showError } = useToast();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingProvider, setEditingProvider] = useState<Partial<ModelProvider> | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    loadSettings();
  }, []);

  const handleSaveProvider = async () => {
    if (!editingProvider?.name || !editingProvider?.baseUrl) {
      showError(t('error.title'), t('settings.missingFields'));
      return;
    }

    setIsLoading(true);
    try {
      const providerData = {
        name: editingProvider.name,
        type: editingProvider.type || 'openai_compatible',
        baseUrl: editingProvider.baseUrl,
        apiKey: editingProvider.apiKey || '',
        models: Array.isArray(editingProvider.models) ? editingProvider.models : (editingProvider.models as unknown as string || '').split(',').map(s => s.trim()).filter(Boolean),
        chatModel: editingProvider.chatModel,
        embeddingModel: editingProvider.embeddingModel,
        enabled: true
      };

      if (editingProvider.id) {
        await updateProvider(editingProvider.id, providerData);
        success(t('common.success'), t('settings.providerUpdated'));
      } else {
        await addProvider(providerData);
        success(t('common.success'), t('settings.providerAdded'));
      }
      setIsDialogOpen(false);
      setEditingProvider(null);
    } catch (err: any) {
      showError(t('error.title'), err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteProvider = async (id: string) => {
    if (confirm(t('settings.confirmDelete'))) {
      await removeProvider(id);
      success(t('common.success'), t('settings.providerDeleted'));
    }
  };

  const openAddDialog = () => {
    setEditingProvider({
      type: 'openai_compatible',
      name: '',
      baseUrl: '',
      apiKey: '',
      models: []
    });
    setIsDialogOpen(true);
  };

  const openEditDialog = (provider: ModelProvider) => {
    setEditingProvider({ ...provider });
    setIsDialogOpen(true);
  };

  const applyPreset = (type: string) => {
    if (type === 'ollama') {
      setEditingProvider(prev => ({
        ...prev,
        type: 'ollama',
        name: 'Ollama',
        baseUrl: 'http://localhost:11434',
        apiKey: '', // Ollama doesn't need API key
        models: ['llama3', 'mistral', 'qwen2.5:7b'],
        chatModel: 'qwen2.5:7b',
        embeddingModel: 'nomic-embed-text'
      }));
    } else if (type === 'openai') {
      setEditingProvider(prev => ({
        ...prev,
        type: 'openai_compatible',
        name: 'OpenAI',
        baseUrl: 'https://api.openai.com/v1',
        models: ['gpt-4o', 'gpt-3.5-turbo'],
        chatModel: 'gpt-4o',
        embeddingModel: 'text-embedding-3-small'
      }));
    } else if (type === 'deepseek') {
      setEditingProvider(prev => ({
        ...prev,
        type: 'deepseek',
        name: 'DeepSeek',
        baseUrl: 'https://api.deepseek.com',
        models: ['deepseek-chat', 'deepseek-coder'],
        chatModel: 'deepseek-chat'
      }));
    }
  };

  return (
    <div className="space-y-8">
      {/* Default Global Model Selection */}
      <div className="space-y-4">
        <h3 className="text-lg font-medium">{t('settings.globalModel')}</h3>
        <p className="text-sm text-muted-foreground">{t('settings.globalModelDesc')}</p>
        <Select
          value={settings.defaultProviderId || ''}
          onValueChange={(val) => setDefaultProvider(val)}
        >
          <SelectTrigger className="w-full">
            <SelectValue placeholder={t('settings.selectDefaultProvider')} />
          </SelectTrigger>
          <SelectContent>
            {settings.providers?.map(p => (
              <SelectItem key={p.id} value={p.id}>
                {p.name} ({p.type})
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Chat Provider Selection */}
      <div className="space-y-4">
        <h3 className="text-lg font-medium">{t('settings.chatProvider')}</h3>
        <p className="text-sm text-muted-foreground">{t('settings.chatProviderDesc')}</p>
        <Select
          value={settings.activeChatProviderId || ''}
          onValueChange={(val) => setActiveChatProvider(val)}
        >
          <SelectTrigger className="w-full">
            <SelectValue placeholder={t('settings.selectChatProvider')} />
          </SelectTrigger>
          <SelectContent>
            {settings.providers?.map(p => (
              <SelectItem key={p.id} value={p.id}>
                {p.name} ({p.type})
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Embedding Provider Selection */}
      <div className="space-y-4">
        <h3 className="text-lg font-medium">{t('settings.embeddingProvider')}</h3>
        <p className="text-sm text-muted-foreground">{t('settings.embeddingProviderDesc')}</p>
        <Select
          value={settings.activeEmbeddingProviderId || ''}
          onValueChange={(val) => setActiveEmbeddingProvider(val)}
        >
          <SelectTrigger className="w-full">
            <SelectValue placeholder={t('settings.selectEmbeddingProvider')} />
          </SelectTrigger>
          <SelectContent>
            {settings.providers?.map(p => (
              <SelectItem key={p.id} value={p.id}>
                {p.name} ({p.type})
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Provider List */}
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <h3 className="text-lg font-medium">{t('settings.providers')}</h3>
          <Button onClick={openAddDialog} size="sm" className="gap-2">
            <Plus className="w-4 h-4" /> {t('settings.addProvider')}
          </Button>
        </div>

        <div className="grid gap-4">
          {settings.providers?.map(provider => (
            <Card key={provider.id} className="relative group">
              <CardHeader className="pb-2">
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle className="text-base flex items-center gap-2">
                      {provider.name}
                      {settings.defaultProviderId === provider.id && (
                        <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full">Default</span>
                      )}
                    </CardTitle>
                    <CardDesc className="text-xs mt-1">{provider.baseUrl}</CardDesc>
                  </div>
                  <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button variant="ghost" size="icon" onClick={() => openEditDialog(provider)}>
                      <Edit2 className="w-4 h-4" />
                    </Button>
                    <Button variant="ghost" size="icon" className="text-destructive" onClick={() => handleDeleteProvider(provider.id)}>
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-1">
                  {provider.models.slice(0, 3).map(m => (
                    <span key={m} className="text-xs bg-muted px-2 py-1 rounded">{m}</span>
                  ))}
                  {provider.models.length > 3 && (
                    <span className="text-xs text-muted-foreground px-2 py-1">+{provider.models.length - 3} more</span>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}

          {(!settings.providers || settings.providers.length === 0) && (
            <div className="text-center py-8 text-muted-foreground border-2 border-dashed rounded-lg">
              {t('settings.noProviders')}
            </div>
          )}
        </div>
      </div>

      {/* Add/Edit Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>{editingProvider?.id ? t('settings.editProvider') : t('settings.addProvider')}</DialogTitle>
            <DialogDescription>{t('settings.providerDescription')}</DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* Preset Buttons */}
            {!editingProvider?.id && (
              <div className="flex gap-2 mb-4">
                <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => applyPreset('openai')}>OpenAI</Button>
                <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => applyPreset('ollama')}>Ollama</Button>
                <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => applyPreset('deepseek')}>DeepSeek</Button>
              </div>
            )}

            <div className="grid gap-2">
              <Label>{t('settings.providerName')}</Label>
              <Input
                value={editingProvider?.name || ''}
                onChange={e => setEditingProvider(prev => ({ ...prev!, name: e.target.value }))}
                placeholder="My LLM"
              />
            </div>

            <div className="grid gap-2">
              <Label>{t('settings.providerType')}</Label>
              <Select
                value={editingProvider?.type || 'openai_compatible'}
                onValueChange={val => setEditingProvider(prev => ({ ...prev!, type: val as any }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="openai_compatible">OpenAI Compatible</SelectItem>
                  <SelectItem value="ollama">Ollama</SelectItem>
                  <SelectItem value="deepseek">DeepSeek</SelectItem>
                  <SelectItem value="dashscope">DashScope</SelectItem>
                  <SelectItem value="anthropic">Anthropic</SelectItem>
                  <SelectItem value="google">Google</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-2">
              <Label>{t('settings.baseUrl')}</Label>
              <div className="relative">
                <Server className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  className="pl-8"
                  value={editingProvider?.baseUrl || ''}
                  onChange={e => setEditingProvider(prev => ({ ...prev!, baseUrl: e.target.value }))}
                  placeholder="https://api.example.com/v1"
                />
              </div>
            </div>

            <div className="grid gap-2">
              <Label>{t('settings.apiKey')}</Label>
              <div className="relative">
                <Key className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  className="pl-8"
                  type="password"
                  value={editingProvider?.apiKey || ''}
                  onChange={e => setEditingProvider(prev => ({ ...prev!, apiKey: e.target.value }))}
                  placeholder="sk-..."
                />
              </div>
            </div>

            <div className="grid gap-2">
              <Label>{t('settings.models')} <span className="text-xs text-muted-foreground">({t('settings.commaSeparated')})</span></Label>
              <div className="relative">
                <Box className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  className="pl-8"
                  value={Array.isArray(editingProvider?.models) ? editingProvider?.models.join(', ') : editingProvider?.models || ''}
                  onChange={e => setEditingProvider(prev => ({ ...prev!, models: e.target.value.split(',').map(s => s.trim()) }))}
                  placeholder="gpt-4, gpt-3.5-turbo"
                />
              </div>
            </div>

            <div className="grid gap-2">
              <Label>{t('settings.chatModel')}</Label>
              <Input
                value={editingProvider?.chatModel || ''}
                onChange={e => setEditingProvider(prev => ({ ...prev!, chatModel: e.target.value }))}
                placeholder="gpt-4o"
              />
            </div>

            <div className="grid gap-2">
              <Label>{t('settings.embeddingModel')}</Label>
              <Input
                value={editingProvider?.embeddingModel || ''}
                onChange={e => setEditingProvider(prev => ({ ...prev!, embeddingModel: e.target.value }))}
                placeholder="text-embedding-3-small"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>{t('common.cancel')}</Button>
            <Button onClick={handleSaveProvider} disabled={isLoading}>
              {isLoading ? <Loading size="sm" /> : t('common.save')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
