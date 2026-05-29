import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { useToastStore, AUTO_DISMISS_MS } from './use-toast';

describe('useToastStore', () => {
  beforeEach(() => {
    useToastStore.setState({ toasts: [] });
    vi.useFakeTimers();
  });
  afterEach(() => vi.useRealTimers());

  it('pushes a toast with message and variant', () => {
    useToastStore.getState().push('Saved', 'success');
    const { toasts } = useToastStore.getState();
    expect(toasts).toHaveLength(1);
    expect(toasts[0]).toMatchObject({ message: 'Saved', variant: 'success' });
  });

  it('auto-dismisses after AUTO_DISMISS_MS', () => {
    useToastStore.getState().push('Saved', 'success');
    vi.advanceTimersByTime(AUTO_DISMISS_MS);
    expect(useToastStore.getState().toasts).toHaveLength(0);
  });

  it('dismisses a toast by id', () => {
    useToastStore.getState().push('A', 'info');
    const id = useToastStore.getState().toasts[0].id;
    useToastStore.getState().dismiss(id);
    expect(useToastStore.getState().toasts).toHaveLength(0);
  });

  it('assigns unique ids to consecutive toasts', () => {
    useToastStore.getState().push('A', 'info');
    useToastStore.getState().push('B', 'info');
    const ids = useToastStore.getState().toasts.map((t) => t.id);
    expect(new Set(ids).size).toBe(2);
  });
});
