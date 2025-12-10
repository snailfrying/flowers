import { Button } from '@/components/ui/button';
import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Settings, FileText, MessageSquare, Sparkles } from 'lucide-react';

declare const chrome: {
  sidePanel?: {
    open: (options: { tabId?: number; windowId?: number }) => Promise<void>;
  };
  tabs?: {
    query: (queryInfo: { active?: boolean; currentWindow?: boolean }) => Promise<Array<{ id?: number }>>;
  };
  windows?: {
    WINDOW_ID_CURRENT: number;
  };
  runtime?: {
    sendMessage: (message: any) => Promise<any>;
  };
};

export default function App() {
  const openSidepanel = async (route?: 'notes' | 'chat' | 'settings') => {
    if (typeof chrome !== 'undefined' && chrome.sidePanel) {
      let tabId: number | undefined = undefined;
      try {
        if (chrome.tabs?.query) {
          const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
          tabId = tabs?.[0]?.id;
        }
      } catch {
        // ignore
      }
      await chrome.sidePanel.open(tabId ? { tabId } : {});
      
      // Navigate to specific route if provided
      if (route && chrome.runtime?.sendMessage) {
        try {
          await chrome.runtime.sendMessage({ action: 'navigate', route });
        } catch {
          // ignore navigation errors
        }
      }
    }
  };

  return (
    <div className="w-96 min-h-[400px] bg-gradient-to-br from-background to-muted/20">
      {/* Header */}
      <div className="p-6 pb-4 border-b border-border/50">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center">
            <Sparkles className="w-5 h-5 text-primary-foreground" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Chroma笔记</h1>
            <p className="text-sm text-muted-foreground">智能笔记管理插件</p>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="p-6 space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <Card 
            className="cursor-pointer hover:bg-accent transition-colors border-border/50 hover:border-primary/50"
            onClick={() => openSidepanel('notes')}
          >
            <CardHeader className="pb-3">
              <div className="w-8 h-8 rounded-md bg-blue-500/10 flex items-center justify-center mb-2">
                <FileText className="w-4 h-4 text-blue-600 dark:text-blue-400" />
              </div>
              <CardTitle className="text-base">笔记</CardTitle>
              <CardDescription className="text-xs">管理你的笔记</CardDescription>
            </CardHeader>
          </Card>

          <Card 
            className="cursor-pointer hover:bg-accent transition-colors border-border/50 hover:border-primary/50"
            onClick={() => openSidepanel('chat')}
          >
            <CardHeader className="pb-3">
              <div className="w-8 h-8 rounded-md bg-purple-500/10 flex items-center justify-center mb-2">
                <MessageSquare className="w-4 h-4 text-purple-600 dark:text-purple-400" />
              </div>
              <CardTitle className="text-base">聊天</CardTitle>
              <CardDescription className="text-xs">AI 对话助手</CardDescription>
            </CardHeader>
          </Card>
        </div>

        <Card 
          className="cursor-pointer hover:bg-accent transition-colors border-border/50 hover:border-primary/50"
          onClick={() => openSidepanel('settings')}
        >
          <CardHeader className="pb-3">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-md bg-gray-500/10 flex items-center justify-center">
                <Settings className="w-4 h-4 text-gray-600 dark:text-gray-400" />
              </div>
              <div className="flex-1">
                <CardTitle className="text-base">设置</CardTitle>
                <CardDescription className="text-xs">配置模型和 API</CardDescription>
              </div>
            </div>
          </CardHeader>
        </Card>

        {/* Primary Action */}
        <Button 
          onClick={() => openSidepanel()} 
          className="w-full h-12 text-base font-medium bg-gradient-to-r from-primary to-primary/90 hover:from-primary/90 hover:to-primary shadow-lg hover:shadow-xl transition-all"
          size="lg"
        >
          <Sparkles className="w-4 h-4 mr-2" />
          打开侧边栏
        </Button>
      </div>

      {/* Footer */}
      <div className="px-6 py-4 border-t border-border/50 bg-muted/30">
        <p className="text-xs text-muted-foreground text-center">
          选择文本后使用右键菜单快速操作
        </p>
      </div>
    </div>
  );
}
