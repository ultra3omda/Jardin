import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';

import { DropCap } from '../drop-cap';

describe('DropCap', () => {
  it('renders the first character separately as a drop cap span', () => {
    render(<DropCap>Plus de bouts de papier</DropCap>);
    const cap = screen.getByText('P');
    expect(cap.tagName).toBe('SPAN');
    expect(cap.className).toMatch(/drop-cap/);
    expect(screen.getByText(/lus de bouts de papier/)).toBeInTheDocument();
  });

  it('returns null gracefully on empty children', () => {
    const { container } = render(<DropCap>{''}</DropCap>);
    expect(container.firstChild).toBeNull();
  });

  it('forwards the className prop to the outer paragraph', () => {
    const { container } = render(<DropCap className="text-lg leading-relaxed">Hello world</DropCap>);
    const p = container.querySelector('p');
    expect(p).not.toBeNull();
    expect(p?.className).toContain('text-lg');
    expect(p?.className).toContain('leading-relaxed');
  });
});
