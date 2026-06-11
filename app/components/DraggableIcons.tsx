export type DragIconId = 'speech' | 'push' | 'pickup';

const ICONS: { id: DragIconId; emoji: string; label: string }[] = [
  { id: 'speech', emoji: '💬', label: 'Speech' },
  { id: 'push', emoji: '🤚', label: 'Push' },
  { id: 'pickup', emoji: '🤲', label: 'Pick Up' },
];

interface DraggableIconsProps {
  onAnyDragStart?: () => void;
}

export function DraggableIcons({ onAnyDragStart }: DraggableIconsProps) {
  return (
    <div className="fixed bottom-6 left-6 flex gap-6 z-40">
      {ICONS.map(({ id, emoji, label }) => (
        <div
          key={id}
          draggable
          onDragStart={(e) => {
            e.dataTransfer.setData('iconId', id);
            onAnyDragStart?.();
          }}
          className="flex flex-col items-center gap-1 cursor-grab active:cursor-grabbing select-none"
          title={label}
        >
          <span className="text-5xl drop-shadow-lg">{emoji}</span>
          <span className="text-white text-xs font-medium">{label}</span>
        </div>
      ))}
    </div>
  );
}
