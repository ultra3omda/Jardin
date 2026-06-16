import { describe, it, expect } from 'vitest';
import { gradeTone } from '../grade-tone';

describe('gradeTone', () => {
  it('classes a high grade as good', () => {
    expect(gradeTone(16)).toBe('good');
  });
  it('classes a mid grade as ok', () => {
    expect(gradeTone(12)).toBe('ok');
  });
  it('classes a low grade as low', () => {
    expect(gradeTone(8)).toBe('low');
  });
  it('normalises against outOf (8/10 → good)', () => {
    expect(gradeTone(8, 10)).toBe('good');
  });
  it('returns low for outOf <= 0', () => {
    expect(gradeTone(5, 0)).toBe('low');
  });
});
