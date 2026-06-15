import { describe, it, expect } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useCommandPalette } from '@/lib/ui/use-command-palette';

describe('useCommandPalette', () => {
  it('démarre fermé puis ouvre/ferme', () => {
    const { result } = renderHook(() => useCommandPalette());
    expect(result.current.open).toBe(false);
    act(() => result.current.setOpen(true));
    expect(result.current.open).toBe(true);
  });

  it('ouvre sur Cmd/Ctrl+K', () => {
    const { result } = renderHook(() => useCommandPalette());
    act(() => {
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', metaKey: true }));
    });
    expect(result.current.open).toBe(true);
  });
});
