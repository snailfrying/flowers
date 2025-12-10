import { useMemo, useState } from 'react';
import { NoteCard } from './NoteCard';
import type { Note } from 'backend/types.js';

interface VirtualizedNotesListProps {
  notes: Note[];
  containerHeight: number;
  itemHeight?: number;
}

export function VirtualizedNotesList({
  notes,
  containerHeight,
  itemHeight = 120
}: VirtualizedNotesListProps) {
  const visibleCount = Math.ceil(containerHeight / itemHeight) + 2;
  const [startIndex, setStartIndex] = useState(0);

  const visibleNotes = useMemo(() => {
    return notes.slice(startIndex, startIndex + visibleCount);
  }, [notes, startIndex, visibleCount]);

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const scrollTop = e.currentTarget.scrollTop;
    const newStartIndex = Math.floor(scrollTop / itemHeight);
    setStartIndex(Math.max(0, newStartIndex));
  };

  const totalHeight = notes.length * itemHeight;
  const offsetY = startIndex * itemHeight;

  return (
    <div
      className="overflow-auto"
      style={{ height: `${containerHeight}px` }}
      onScroll={handleScroll}
    >
      <div style={{ height: `${totalHeight}px`, position: 'relative' }}>
        <div
          style={{
            transform: `translateY(${offsetY}px)`,
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0
          }}
        >
          {visibleNotes.map((note: Note) => (
            <div key={note.id} style={{ height: `${itemHeight}px` }}>
              <NoteCard note={note} />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

