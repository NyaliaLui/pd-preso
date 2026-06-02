import '@testing-library/jest-dom';
import { render, screen } from '@testing-library/react';
import { expect, describe, it } from '@jest/globals';
import { HealthBar } from '@/app/components/Player/HealthBar';

describe('HealthBar Component', () => {
  describe('Rendering', () => {
    it('should render the health bar', () => {
      render(<HealthBar currentHP={100} maxHP={100} />);

      expect(screen.getByText('HP')).toBeInTheDocument();
    });

    it('should display current and max HP values', () => {
      render(<HealthBar currentHP={75} maxHP={100} />);

      expect(screen.getByText('75/100')).toBeInTheDocument();
    });

    it('should display correct HP when at full health', () => {
      render(<HealthBar currentHP={100} maxHP={100} />);

      expect(screen.getByText('100/100')).toBeInTheDocument();
    });

    it('should display correct HP when at zero health', () => {
      render(<HealthBar currentHP={0} maxHP={100} />);

      expect(screen.getByText('0/100')).toBeInTheDocument();
    });

    it('should handle different max HP values', () => {
      render(<HealthBar currentHP={25} maxHP={50} />);

      expect(screen.getByText('25/50')).toBeInTheDocument();
    });
  });

  describe('Progress Bar', () => {
    it('should render progress bar with correct percentage', () => {
      render(<HealthBar currentHP={50} maxHP={100} />);

      const progressBar = screen.getByRole('progressbar');
      expect(progressBar).toBeInTheDocument();
      expect(progressBar).toHaveAttribute('aria-valuenow', '50');
    });

    it('should clamp percentage to 0 when HP is negative', () => {
      render(<HealthBar currentHP={-10} maxHP={100} />);

      const progressBar = screen.getByRole('progressbar');
      expect(progressBar).toHaveAttribute('aria-valuenow', '0');
    });

    it('should clamp percentage to 100 when HP exceeds max', () => {
      render(<HealthBar currentHP={150} maxHP={100} />);

      const progressBar = screen.getByRole('progressbar');
      expect(progressBar).toHaveAttribute('aria-valuenow', '100');
    });

    it('should show 50% progress for half HP with different max', () => {
      render(<HealthBar currentHP={25} maxHP={50} />);

      const progressBar = screen.getByRole('progressbar');
      expect(progressBar).toHaveAttribute('aria-valuenow', '50');
    });

    it('should show 0% progress when HP is 0', () => {
      render(<HealthBar currentHP={0} maxHP={100} />);

      const progressBar = screen.getByRole('progressbar');
      expect(progressBar).toHaveAttribute('aria-valuenow', '0');
    });

    it('should show 100% progress when HP equals max', () => {
      render(<HealthBar currentHP={100} maxHP={100} />);

      const progressBar = screen.getByRole('progressbar');
      expect(progressBar).toHaveAttribute('aria-valuenow', '100');
    });
  });
});
