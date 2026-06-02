import { Progress } from 'flowbite-react';

interface HealthBarProps {
  currentHP: number;
  maxHP: number;
}

export function HealthBar({ currentHP, maxHP }: HealthBarProps) {
  const percentage = Math.max(0, Math.min(100, (currentHP / maxHP) * 100));

  return (
    <div className="fixed top-4 left-4 z-50 w-48">
      <div className="flex items-center gap-2 mb-1">
        <span className="text-white text-sm font-semibold">HP</span>
        <span className="text-white text-xs">
          {currentHP}/{maxHP}
        </span>
      </div>
      <Progress progress={percentage} color="red" size="lg" />
    </div>
  );
}
