import '@testing-library/jest-dom';
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { expect, describe, it, jest } from '@jest/globals';
import { BoulderRewardPopup } from '@/app/components/BoulderRewardPopup';

describe('BoulderRewardPopup', () => {
  it('renders nothing when show is false', () => {
    render(<BoulderRewardPopup show={false} onClose={() => {}} />);
    expect(
      screen.queryByTestId('boulder-reward-overlay'),
    ).not.toBeInTheDocument();
  });

  it('renders overlay when show is true', () => {
    render(<BoulderRewardPopup show={true} onClose={() => {}} />);
    expect(screen.getByTestId('boulder-reward-overlay')).toBeInTheDocument();
    expect(screen.getByTestId('boulder-reward-message')).toHaveTextContent(
      '20% off',
    );
    expect(screen.getByTestId('boulder-reward-store-link')).toHaveAttribute(
      'href',
      'https://www.amazon.com',
    );
    expect(screen.getByTestId('boulder-reward-restart')).toHaveTextContent(
      'Restart',
    );
    expect(screen.getByTestId('boulder-reward-close')).toBeInTheDocument();
  });

  it('calls onClose when X button is clicked', () => {
    const onClose = jest.fn();
    render(<BoulderRewardPopup show={true} onClose={onClose} />);
    fireEvent.click(screen.getByTestId('boulder-reward-close'));
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
