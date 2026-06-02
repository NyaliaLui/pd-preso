import '@testing-library/jest-dom';
import React from 'react';
import { render, screen, act } from '@testing-library/react';
import { expect, describe, it } from '@jest/globals';
import { OrientationGuard } from '@/app/components/OrientationGuard';

function mockMatchMedia(portrait: boolean) {
  const listeners: ((e: Partial<MediaQueryListEvent>) => void)[] = [];
  const mql = {
    matches: portrait,
    media: '(orientation: portrait)',
    onchange: null,
    addEventListener: jest.fn(
      (_: string, fn: (e: Partial<MediaQueryListEvent>) => void) => {
        listeners.push(fn);
      },
    ),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn(),
  };
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: jest.fn(() => mql),
  });
  return { mql, listeners };
}

describe('OrientationGuard', () => {
  it('renders nothing in landscape mode', () => {
    mockMatchMedia(false);
    render(<OrientationGuard />);
    expect(screen.queryByTestId('orientation-overlay')).not.toBeInTheDocument();
  });

  it('renders overlay in portrait mode', () => {
    mockMatchMedia(true);
    render(<OrientationGuard />);
    expect(screen.getByTestId('orientation-overlay')).toBeInTheDocument();
    expect(screen.getByTestId('orientation-message')).toHaveTextContent(
      'landscape',
    );
  });

  it('shows overlay when orientation changes to portrait', async () => {
    const { listeners } = mockMatchMedia(false);
    render(<OrientationGuard />);
    expect(screen.queryByTestId('orientation-overlay')).not.toBeInTheDocument();

    act(() => {
      listeners.forEach((fn) => fn({ matches: true }));
    });

    expect(screen.getByTestId('orientation-overlay')).toBeInTheDocument();
  });

  it('hides overlay when orientation changes back to landscape', async () => {
    const { listeners } = mockMatchMedia(true);
    render(<OrientationGuard />);
    expect(screen.getByTestId('orientation-overlay')).toBeInTheDocument();

    act(() => {
      listeners.forEach((fn) => fn({ matches: false }));
    });

    expect(screen.queryByTestId('orientation-overlay')).not.toBeInTheDocument();
  });
});
