import { describe, it, expect } from 'vitest';
import { parseScoreInput } from '../score-input';

describe('parseScoreInput', () => {
  it('returns null for empty input', () => {
    expect(parseScoreInput('', 20)).toBeNull();
    expect(parseScoreInput('   ', 20)).toBeNull();
  });
  it('parses a valid decimal score', () => {
    expect(parseScoreInput('15.5', 20)).toBe(15.5);
  });
  it('accepts a comma decimal separator (FR)', () => {
    expect(parseScoreInput('12,25', 20)).toBe(12.25);
  });
  it('rejects out-of-range scores', () => {
    expect(parseScoreInput('25', 20)).toBeNull();
    expect(parseScoreInput('-1', 20)).toBeNull();
  });
  it('rejects non-numeric input', () => {
    expect(parseScoreInput('abc', 20)).toBeNull();
  });
});
