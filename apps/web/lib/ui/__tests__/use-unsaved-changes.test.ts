import { describe, it, expect, vi, afterEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useUnsavedChanges } from '@/lib/ui/use-unsaved-changes';

afterEach(() => vi.restoreAllMocks());

describe('useUnsavedChanges', () => {
  it('ajoute le listener beforeunload uniquement quand dirty', () => {
    const add = vi.spyOn(window, 'addEventListener');
    const { rerender, unmount } = renderHook(({ d }) => useUnsavedChanges(d), { initialProps: { d: false } });
    expect(add).not.toHaveBeenCalledWith('beforeunload', expect.any(Function));
    rerender({ d: true });
    expect(add).toHaveBeenCalledWith('beforeunload', expect.any(Function));
    unmount();
  });
});
