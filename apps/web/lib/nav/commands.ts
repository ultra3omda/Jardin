import type { NavSection } from '@/lib/nav/menu';

export type Command =
  | { id: string; kind: 'goto'; label: string; href: string; group: string }
  | { id: string; kind: 'action'; label: string; group?: string; run: () => void };

/** Aplatit les sections de nav en commandes "Aller à" (groupées par domaine). */
export function navToCommands(sections: NavSection[]): Command[] {
  return sections.flatMap((section) =>
    section.items.map((item) => ({
      id: `goto:${item.id}`,
      kind: 'goto' as const,
      label: item.label,
      href: item.href,
      group: section.label,
    })),
  );
}

/** Normalise : minuscules + suppression des diacritiques (accents). */
function normalize(value: string): string {
  return value.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
}

/** Filtre par sous-chaîne normalisée sur le label. Requête vide = tout. */
export function filterCommands(commands: Command[], query: string): Command[] {
  const q = normalize(query.trim());
  if (!q) return commands;
  return commands.filter((c) => normalize(c.label).includes(q));
}
