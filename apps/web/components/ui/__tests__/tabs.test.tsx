import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { Tabs } from '../tabs';

describe('Tabs', () => {
  it("rend les onglets avec aria-selected sur l'actif et notifie au clic", () => {
    const onChange = vi.fn();
    render(<Tabs tabs={[{ id: 'a', label: 'Infos' }, { id: 'b', label: 'Notes' }]} active="a" onChange={onChange} />);
    const tabs = screen.getAllByRole('tab');
    expect(tabs[0]).toHaveAttribute('aria-selected', 'true');
    expect(tabs[1]).toHaveAttribute('aria-selected', 'false');
    fireEvent.click(tabs[1]);
    expect(onChange).toHaveBeenCalledWith('b');
  });
});
