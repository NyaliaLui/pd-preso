import '@testing-library/jest-dom';
import { render, screen } from '@testing-library/react';
import { expect, describe, it } from '@jest/globals';
import { GameOver } from '@/app/components/GameOver';

describe('GameOver Component', () => {
  describe('Visibility', () => {
    it('should not render when show is false', () => {
      render(<GameOver show={false} />);

      expect(screen.queryByText('You died!')).not.toBeInTheDocument();
      expect(screen.queryByText('Game over!')).not.toBeInTheDocument();
    });

    it('should render when show is true', () => {
      render(<GameOver show={true} />);

      expect(screen.getByText('You died!')).toBeInTheDocument();
      expect(screen.getByText('Game over!')).toBeInTheDocument();
    });
  });

  describe('Content', () => {
    it('should display "You died!" heading', () => {
      render(<GameOver show={true} />);

      const heading = screen.getByText('You died!');
      expect(heading).toBeInTheDocument();
      expect(heading.tagName).toBe('H1');
    });

    it('should display "Game over!" message', () => {
      render(<GameOver show={true} />);

      const message = screen.getByText('Game over!');
      expect(message).toBeInTheDocument();
      expect(message.tagName).toBe('P');
    });

    it('should display restart button', () => {
      render(<GameOver show={true} />);

      const button = screen.getByRole('button', { name: 'Restart' });
      expect(button).toBeInTheDocument();
    });
  });
});
