import { render, screen } from '@testing-library/react';
import { describe, it, expect, beforeAll, vi } from 'vitest';

import { CountUp } from '../count-up';

beforeAll(() => {
  // jsdom doesn't ship IntersectionObserver — provide a no-op stub.
  class IO {
    observe = vi.fn();
    disconnect = vi.fn();
    unobserve = vi.fn();
    takeRecords = vi.fn(() => []);
    root = null;
    rootMargin = '';
    thresholds = [];
  }
  vi.stubGlobal('IntersectionObserver', IO);
});

describe('CountUp', () => {
  it('renders initial value of 0 before entering viewport', () => {
    render(<CountUp to={247} />);
    expect(screen.getByText('0')).toBeInTheDocument();
  });

  it('renders suffix alongside value', () => {
    render(<CountUp to={100} suffix="%" />);
    expect(screen.getByText('0%')).toBeInTheDocument();
  });

  it('renders prefix alongside value', () => {
    render(<CountUp to={42} prefix="~" />);
    expect(screen.getByText('~0')).toBeInTheDocument();
  });

  it('forwards className to the rendered span', () => {
    render(<CountUp to={1} className="font-mono" />);
    const span = screen.getByText('0');
    expect(span.className).toContain('font-mono');
  });
});
