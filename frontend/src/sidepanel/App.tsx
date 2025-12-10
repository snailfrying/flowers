import { RouterProvider, useRouter } from '@/shared/router';
import { ErrorBoundary } from '@/components/common/ErrorBoundary';
import { ToastProvider } from '@/components/common/Toaster';
import { MainLayout } from '@/components/layout/MainLayout';
import NotesPage from '@/components/notes/NotesPage';
import ChatPage from '@/components/chat/ChatPage';
import SettingsPage from '@/components/settings/SettingsPage';
import { ModelConfigPage } from '@/components/settings/ModelConfigPage';
import { McpConfigPage } from '@/components/settings/McpConfigPage';
import '../styles/globals.css';
import i18n from '../shared/i18n/i18n';
import { useEffect } from 'react';
import { useChatStore } from '@/shared/store/chat-store';
import { useSettingsStore } from '@/shared/store/settings-store';

// Minimal Chrome typings for TS build in the sidepanel context
// @ts-ignore
declare const chrome: {
  storage?: { local: { get: (key: string) => Promise<any>; set: (items: Record<string, any>) => Promise<void> } };
};

function AppContent() {
  const { route, setRoute } = useRouter();
  const sendMessage = useChatStore((s) => s.sendMessage);
  const askWithContext = useChatStore((s) => (s as any).askWithContext);
  const language = useSettingsStore((s) => s.language);
  const loadSettings = useSettingsStore((s) => s.loadSettings);

  // On mount, check if SW left a pending chat context or navigation request
  useEffect(() => {
    // @ts-ignore
    if (typeof chrome !== 'undefined' && chrome.storage?.local) {
      // @ts-ignore - Chrome storage API accepts array of keys
      chrome.storage?.local?.get(['pendingChatContext', 'pendingNavigation', 'pendingAutoChat']).then((res: any) => {
        // Handle navigation request from popup
        if (res?.pendingNavigation?.route) {
          setRoute(res.pendingNavigation.route);
          chrome.storage?.local?.set({ pendingNavigation: null });
        }
        // Handle chat context
        const payload = res?.pendingChatContext;
        if (payload?.text) {
          setRoute('chat');
          // Prefer backend-composed ask
          ;(async () => { try { await askWithContext(payload.text, payload.sourceUrl); } catch {} })();
          chrome.storage?.local?.set({ pendingChatContext: null });
        }

        // Auto send a message if requested
        const autoChat = res?.pendingAutoChat;
        if (autoChat?.text) {
          setRoute('chat');
          // fire and forget
          try { sendMessage(autoChat.text); } catch {}
          chrome.storage?.local?.set({ pendingAutoChat: null });
        }
      }).catch(() => {});
    }
  }, [askWithContext, setRoute]);

  // Ensure settings (providers/models) are loaded as soon as the side panel mounts
  useEffect(() => {
    loadSettings().catch(() => {
      // Silently ignore – toast/hud will handle failures when settings pages load
    });
  }, [loadSettings]);

  // Sync frontend i18n with settings store language
  useEffect(() => {
    try { i18n.changeLanguage(language); } catch {}
  }, [language]);

  return (
    <MainLayout>
      <ErrorBoundary>
        {route === 'notes' && <NotesPage />}
        {route === 'chat' && <ChatPage />}
        {route === 'settings' && <SettingsPage />}
        {route === 'modelConfig' && <ModelConfigPage />}
        {route === 'mcpConfig' && <McpConfigPage />}
      </ErrorBoundary>
    </MainLayout>
  );
}

export default function App() {
  return (
    <ToastProvider>
      <RouterProvider>
        <AppContent />
      </RouterProvider>
    </ToastProvider>
  );
}
