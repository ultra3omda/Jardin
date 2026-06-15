'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { cn } from '@/lib/utils';
import { filterCommands, type Command } from '@/lib/nav/commands';

interface Props {
  open: boolean;
  commands: Command[];
  onClose: () => void;
  /** Appelé pour un goto (le parent route via next-intl). */
  onNavigate: (href: string) => void;
}

/** Palette de commandes globale (Cmd+K). Overlay accessible, navigation clavier. */
export function CommandPalette({ open, commands, onClose, onNavigate }: Props) {
  const [query, setQuery] = useState('');
  const [active, setActive] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const results = useMemo(() => filterCommands(commands, query), [commands, query]);

  useEffect(() => {
    if (open) {
      setQuery('');
      setActive(0);
      inputRef.current?.focus();
    }
  }, [open]);

  useEffect(() => {
    setActive(0);
  }, [query]);

  if (!open) return null;

  function exec(cmd: Command) {
    onClose();
    if (cmd.kind === 'goto') onNavigate(cmd.href);
    else cmd.run();
  }

  function onKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Escape') return onClose();
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActive((i) => Math.min(i + 1, results.length - 1));
    }
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActive((i) => Math.max(i - 1, 0));
    }
    if (e.key === 'Enter' && results[active]) {
      e.preventDefault();
      exec(results[active]);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center bg-black/40 p-4 pt-[12vh]"
      role="presentation"
      onClick={onClose}
    >
      <div
        className="w-full max-w-xl overflow-hidden rounded-xl bg-white shadow-xl"
        role="dialog"
        aria-modal="true"
        aria-label="Recherche et commandes"
        onClick={(e) => e.stopPropagation()}
        onKeyDown={onKeyDown}
      >
        <input
          ref={inputRef}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          role="combobox"
          aria-expanded="true"
          aria-controls="cmdk-list"
          aria-autocomplete="list"
          placeholder="Rechercher une page, une action&#8230;"
          className="w-full border-b border-border px-4 py-3 text-sm outline-none"
        />
        <ul id="cmdk-list" role="listbox" className="max-h-80 overflow-y-auto py-2">
          {results.length === 0 ? (
            <li className="px-4 py-6 text-center text-sm text-ink-500">Aucun résultat.</li>
          ) : (
            results.map((cmd, i) => (
              <li key={cmd.id} role="option" aria-selected={i === active}>
                <button
                  type="button"
                  onMouseEnter={() => setActive(i)}
                  onClick={() => exec(cmd)}
                  className={cn(
                    'flex w-full items-center justify-between gap-3 px-4 py-2 text-left text-sm',
                    i === active ? 'bg-paper-100 text-navy-900' : 'text-ink-700',
                  )}
                >
                  <span>{cmd.label}</span>
                  <span className="text-xs text-ink-300">{cmd.group ?? (cmd.kind === 'action' ? 'Action' : '')}</span>
                </button>
              </li>
            ))
          )}
        </ul>
      </div>
    </div>
  );
}
