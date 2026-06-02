import { useEffect, useRef, useState } from 'react';

interface LevelAnnouncementProps {
  level: number;
}

export function LevelAnnouncement({ level }: LevelAnnouncementProps) {
  const [visible, setVisible] = useState(false);
  const [fading, setFading] = useState(false);
  const isFirstRender = useRef(true);
  const fadeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hideTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }

    // Clear any existing timers
    if (fadeTimerRef.current) clearTimeout(fadeTimerRef.current);
    if (hideTimerRef.current) clearTimeout(hideTimerRef.current);

    setVisible(true);
    setFading(false);

    fadeTimerRef.current = setTimeout(() => {
      setFading(true);
    }, 1000);

    hideTimerRef.current = setTimeout(() => {
      setVisible(false);
    }, 2000);

    return () => {
      if (fadeTimerRef.current) clearTimeout(fadeTimerRef.current);
      if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
    };
  }, [level]);

  if (!visible) return null;

  return (
    <div
      data-testid="level-announcement"
      className={`fixed inset-0 flex items-center justify-center z-50 pointer-events-none transition-opacity duration-1000 ${fading ? 'opacity-0' : 'opacity-100'}`}
    >
      <span
        data-testid="level-announcement-text"
        className="text-white text-7xl font-bold drop-shadow-lg"
      >
        Level {level}
      </span>
    </div>
  );
}
