import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { AttendanceStatusBadge } from '../attendance-status-badge';

describe('AttendanceStatusBadge', () => {
  it('renders the French label', () => {
    render(<AttendanceStatusBadge status="ABSENT" />);
    expect(screen.getByText('Absent')).toBeTruthy();
  });

  it('applies a tone class per status', () => {
    render(<AttendanceStatusBadge status="PRESENT" />);
    expect(screen.getByText('Présent').className).toContain('green');
  });
});
