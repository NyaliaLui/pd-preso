import '@testing-library/jest-dom';
import { render, screen, act } from '@testing-library/react';
import { expect, describe, it, beforeEach, afterEach } from '@jest/globals';
import { LevelAnnouncement } from '@/app/components/LevelAnnouncement';

describe('LevelAnnouncement', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('does NOT show announcement on initial render (level=1)', () => {
    render(<LevelAnnouncement level={1} />);
    expect(screen.queryByTestId('level-announcement')).not.toBeInTheDocument();
  });

  it('shows announcement when level prop increases from 1 to 2', () => {
    const { rerender } = render(<LevelAnnouncement level={1} />);
    rerender(<LevelAnnouncement level={2} />);
    expect(screen.getByTestId('level-announcement')).toBeInTheDocument();
  });

  it('announcement text shows correct level number', () => {
    const { rerender } = render(<LevelAnnouncement level={1} />);
    rerender(<LevelAnnouncement level={2} />);
    expect(screen.getByTestId('level-announcement-text')).toHaveTextContent(
      'Level 2',
    );
  });

  it('announcement is removed from DOM after 2000ms', () => {
    const { rerender } = render(<LevelAnnouncement level={1} />);
    rerender(<LevelAnnouncement level={2} />);
    expect(screen.getByTestId('level-announcement')).toBeInTheDocument();
    act(() => {
      jest.advanceTimersByTime(2000);
    });
    expect(screen.queryByTestId('level-announcement')).not.toBeInTheDocument();
  });
});
