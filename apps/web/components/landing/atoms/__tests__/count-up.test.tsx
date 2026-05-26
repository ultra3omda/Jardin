import { render, screen } from '@testing-library/react';
import { describe, it, expect, beforeAll, vi } from 'vitest';

import { CountUp } from '../count-up';

beforeAll(() => {
  class IO {
    observe = vi.fn();
    disconnect = vi.fn();
    unobserve = vi.fn();
    takeRecords = vi.fn(() => []);
    root = null;
    rootMargin = '';
    thresholds = [];
  }
  // @ts-expect-error — test-only stub
  globalThis.IntersectionObserver = IO;
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
});
