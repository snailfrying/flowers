import type { Note } from 'backend/types.js';
import { Button } from '@/components/ui/button';
import { useState, useMemo } from 'react';

function renderBasicMarkdown(text: string): string {
  let s = (text || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  s = s.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
  s = s.replace(/\*([^*]+)\*/g, '<em>$1</em>');
  s = s.replace(/^[-*]\s+(.*)$/gm, '<div>• $1</div>');
  s = s.replace(/^\d+\.\s+(.*)$/gm, '<div>$1</div>');
  s = s.replace(/\n/g, '<br/>');
  return `<div style="line-height:1.7">${s}</div>`;
}

export function NoteViewer({ note, onEdit }: { note: Note; onEdit: () => void }) {
  const [showHtml] = useState(true);
  const html = useMemo(() => renderBasicMarkdown(note.content || ''), [note.content]);
  return (
    <div className="flex flex-col h-full">
      <div className="p-4 border-b border-border flex items-center justify-between">
        <h2 className="text-lg font-semibold truncate">{note.title || '未命名笔记'}</h2>
        <Button size="sm" onClick={onEdit}>编辑</Button>
      </div>
      <div className="p-4 overflow-auto text-sm">
        {showHtml ? (
          <div dangerouslySetInnerHTML={{ __html: html }} />
        ) : (
          <pre className="whitespace-pre-wrap">{note.content}</pre>
        )}
      </div>
    </div>
  );
}


