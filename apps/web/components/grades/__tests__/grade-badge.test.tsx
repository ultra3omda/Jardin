import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { GradeBadge } from '../grade-badge';

describe('GradeBadge', () => {
  it('renders value/outOf', () => {
    render(<GradeBadge value={15} outOf={20} />);
    expect(screen.getByText('15.00/20')).toBeTruthy();
  });

  it('renders an em dash for a null grade', () => {
    render(<GradeBadge value={null} />);
    expect(screen.getByText('—')).toBeTruthy();
  });

  it('applies the good tone for a high grade', () => {
    render(<GradeBadge value={18} outOf={20} />);
    expect(screen.getByText('18.00/20').className).toContain('green');
  });
});
