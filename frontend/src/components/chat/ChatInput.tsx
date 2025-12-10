import { useState } from 'react';
import { useChatStore } from '@/shared/store/chat-store';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { ToolToggles } from './ToolToggles.js';
import { ModelTypeSelector } from './ModelTypeSelector.js';
import { MCPSelector } from './MCPSelector.js';
import { Send, Image as ImageIcon } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useToast } from '@/components/common/Toaster';

export function ChatInput() {
  const { sendStream, isLoading, modelType } = useChatStore();
  const { t } = useTranslation();
  const { error: showError } = useToast();
  const [input, setInput] = useState('');
  const [images, setImages] = useState<File[]>([]);

  const handleSend = async () => {
    if (!input.trim() && images.length === 0) return;

    const chatImages = await Promise.all(
      images.map(async (file) => {
        const data = await fileToBase64(file);
        return {
          mimeType: file.type,
          data: data.split(',')[1] // Remove data URI prefix
        };
      })
    );

    try {
      const stream = await sendStream(input, chatImages);
      // Handle stream (already handled in store)
      for await (const _chunk of stream) {
        // Stream is processed in store
      }
      setInput('');
      setImages([]);
    } catch (err: any) {
      showError(t('error.title'), err.message || '发送失败');
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (modelType === 'vlm') {
      setImages(files);
    }
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <ToolToggles />
        <MCPSelector />
        <ModelTypeSelector />
      </div>
      <div className="flex gap-2">
        <div className="flex-1 relative">
          <Textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={t('chat.input')}
            className="min-h-[80px] resize-none"
            disabled={isLoading}
            autoFocus
          />
          {modelType === 'vlm' && (
            <label className="absolute bottom-2 right-2 cursor-pointer">
              <ImageIcon className="h-4 w-4 text-muted-foreground" />
              <input
                type="file"
                accept="image/*"
                multiple
                onChange={handleImageSelect}
                className="hidden"
              />
            </label>
          )}
        </div>
        <Button onClick={handleSend} disabled={isLoading || (!input.trim() && images.length === 0)}>
          <Send className="h-4 w-4" />
        </Button>
      </div>
      {images.length > 0 && (
        <div className="flex gap-2 flex-wrap">
          {images.map((img, idx) => (
            <div key={idx} className="relative">
              <img src={URL.createObjectURL(img)} alt={`Preview ${idx}`} className="w-16 h-16 rounded object-cover" />
              <Button
                variant="ghost"
                size="sm"
                className="absolute -top-1 -right-1 h-5 w-5 p-0"
                onClick={() => setImages(images.filter((_, i) => i !== idx))}
              >
                ×
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

async function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

