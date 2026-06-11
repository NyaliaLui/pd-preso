import { useState, useRef } from 'react';

export type DragIconId =
  | 'telephone'
  | 'steakhouse'
  | 'buffet'
  | 'show-tickets'
  | 'hotel'
  | 'golf'
  | 'spa'
  | 'slot-machine'
  | 'cards';

export const ICON_TO_AMENITY: Record<DragIconId, string> = {
  telephone: 'telephone',
  steakhouse: 'steakhouse',
  buffet: 'buffet',
  'show-tickets': 'show tickets',
  hotel: 'hotel rooms',
  golf: 'golf',
  spa: 'spa',
  'slot-machine': 'slot machine',
  cards: 'cards',
};

export const AMENITY_TO_ICON: Partial<Record<string, DragIconId>> = {
  telephone: 'telephone',
  steakhouse: 'steakhouse',
  buffet: 'buffet',
  'show tickets': 'show-tickets',
  'hotel rooms': 'hotel',
  golf: 'golf',
  spa: 'spa',
  'slot machine': 'slot-machine',
  cards: 'cards',
};

const ICONS: { id: DragIconId; emoji: string; label: string }[] = [
  { id: 'telephone', emoji: '📞', label: 'Telephone' },
  { id: 'steakhouse', emoji: '🥩', label: 'Steakhouse' },
  { id: 'buffet', emoji: '🍽️', label: 'Buffet' },
  { id: 'show-tickets', emoji: '🎫', label: 'Show Tickets' },
  { id: 'hotel', emoji: '🏨', label: 'Hotel Rooms' },
  { id: 'golf', emoji: '⛳', label: 'Golf' },
  { id: 'spa', emoji: '💆', label: 'Spa' },
  { id: 'slot-machine', emoji: '🎰', label: 'Slot Machine' },
  { id: 'cards', emoji: '🃏', label: 'Cards' },
];

interface DraggableIconsProps {
  onAnyDragStart?: () => void;
  onDrop?: (iconId: DragIconId, clientX: number, clientY: number) => void;
  highlights?: Partial<Record<DragIconId, 'green' | 'purple'>>;
}

export function DraggableIcons({
  onAnyDragStart,
  onDrop,
  highlights,
}: DraggableIconsProps) {
  const [drag, setDrag] = useState<{
    id: DragIconId;
    x: number;
    y: number;
  } | null>(null);
  const dragRef = useRef<{ id: DragIconId; x: number; y: number } | null>(null);

  const handlePointerDown = (
    e: React.PointerEvent<HTMLDivElement>,
    id: DragIconId,
  ) => {
    e.preventDefault();
    e.currentTarget.setPointerCapture(e.pointerId);
    onAnyDragStart?.();
    const d = { id, x: e.clientX, y: e.clientY };
    dragRef.current = d;
    setDrag(d);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!dragRef.current) return;
    const d = { ...dragRef.current, x: e.clientX, y: e.clientY };
    dragRef.current = d;
    setDrag(d);
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!dragRef.current) return;
    onDrop?.(dragRef.current.id, e.clientX, e.clientY);
    dragRef.current = null;
    setDrag(null);
  };

  const draggedIcon = drag ? ICONS.find((i) => i.id === drag.id) : null;

  return (
    <>
      <div className="fixed bottom-6 left-6 flex flex-wrap gap-4 z-40">
        {ICONS.map(({ id, emoji, label }) => {
          const highlight = highlights?.[id];
          const highlightClass =
            highlight === 'green'
              ? 'bg-green-400/25 ring-1 ring-green-400/70 rounded-lg'
              : highlight === 'purple'
                ? 'bg-purple-400/25 ring-1 ring-purple-400/70 rounded-lg'
                : '';

          return (
            <div
              key={id}
              onPointerDown={(e) => handlePointerDown(e, id)}
              onPointerMove={handlePointerMove}
              onPointerUp={handlePointerUp}
              className="cursor-grab active:cursor-grabbing select-none touch-none"
              title={label}
            >
              <div
                className={`flex flex-col items-center gap-1 px-2 py-1 ${highlightClass}`}
              >
                <span
                  className={`text-5xl drop-shadow-lg transition-opacity duration-75 ${drag?.id === id ? 'opacity-25' : 'opacity-100'}`}
                >
                  {emoji}
                </span>
                <span className="text-white text-xs font-medium">{label}</span>
              </div>
            </div>
          );
        })}
      </div>

      {drag && draggedIcon && (
        <div
          className="fixed pointer-events-none z-9999 -translate-x-1/2 -translate-y-1/2"
          style={{ left: drag.x, top: drag.y }}
        >
          <span className="text-5xl drop-shadow-lg">{draggedIcon.emoji}</span>
        </div>
      )}
    </>
  );
}
