import { useChatStore } from '@/shared/store/chat-store';
import { ChatMessage } from './ChatMessage.js';
import { Loading } from '@/components/common/Loading';
import { EmptyState } from '@/components/common/EmptyState';
import { useTranslation } from 'react-i18next';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useEffect, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism';

export function ChatInterface() {
  const { history, isLoading, currentStream } = useChatStore();
  const { t } = useTranslation();
  const viewportRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when new messages arrive or stream updates
  useEffect(() => {
    // Use setTimeout to ensure DOM is updated before scrolling
    const timer = setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, 100);
    return () => clearTimeout(timer);
  }, [history.length, currentStream, isLoading]);

  return (
    <ScrollArea className="flex-1 h-full">
      <div className="p-4 space-y-4" ref={viewportRef}>
        {history.length === 0 && !isLoading ? (
          <EmptyState
            title={t('chat.noHistory')}
            description="开始您的第一次对话"
          />
        ) : (
          <>
            {history.map((message, index) => (
              <ChatMessage key={index} message={message} />
            ))}
            {isLoading && !currentStream && (
              <div className="flex justify-start">
                <div className="bg-muted rounded-lg p-3 max-w-[80%]">
                  <Loading size="sm" />
                </div>
              </div>
            )}
            {currentStream && (
              <div className="flex justify-start">
                <div className="bg-muted rounded-lg p-3 max-w-[80%]">
                  <div className="prose prose-sm dark:prose-invert max-w-none">
                    <ReactMarkdown
                      components={{
                        code({ node, inline, className, children, ...props }: any) {
                          const match = /language-(\w+)/.exec(className || '');
                          return !inline && match ? (
                            <SyntaxHighlighter
                              style={oneDark}
                              language={match[1]}
                              PreTag="div"
                              {...props}
                            >
                              {String(children).replace(/\n$/, '')}
                            </SyntaxHighlighter>
                          ) : (
                            <code className={className} {...props}>
                              {children}
                            </code>
                          );
                        }
                      }}
                    >
                      {currentStream}
                    </ReactMarkdown>
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </>
        )}
      </div>
    </ScrollArea>
  );
}

