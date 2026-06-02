import '@testing-library/jest-dom';
import { render, screen } from '@testing-library/react';
import { expect, describe, it } from '@jest/globals';
import { ScoreDisplay } from '@/app/components/ScoreDisplay';

describe('ScoreDisplay', () => {
  it('renders without crashing', () => {
    render(<ScoreDisplay score={0} level={1} />);
    expect(screen.getByTestId('score-display')).toBeInTheDocument();
  });

  it('shows score value', () => {
    render(<ScoreDisplay score={42} level={1} />);
    expect(screen.getByTestId('score-value')).toHaveTextContent('42');
  });

  it('shows level value', () => {
    render(<ScoreDisplay score={0} level={3} />);
    expect(screen.getByTestId('level-value')).toHaveTextContent('3');
  });

  it('updates when score changes', () => {
    const { rerender } = render(<ScoreDisplay score={0} level={1} />);
    expect(screen.getByTestId('score-value')).toHaveTextContent('0');
    rerender(<ScoreDisplay score={5} level={1} />);
    expect(screen.getByTestId('score-value')).toHaveTextContent('5');
  });

  it('updates when level changes', () => {
    const { rerender } = render(<ScoreDisplay score={0} level={1} />);
    expect(screen.getByTestId('level-value')).toHaveTextContent('1');
    rerender(<ScoreDisplay score={10} level={2} />);
    expect(screen.getByTestId('level-value')).toHaveTextContent('2');
  });
});
