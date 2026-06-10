import type { LegalDoc } from '@/lib/legal/content';

/**
 * Renders a {@link LegalDoc} as a readable article. Paragraphs starting with
 * "- " inside a section become list items.
 */
export function LegalDocument({ doc }: { doc: LegalDoc }) {
  const formattedDate = new Date(doc.updatedAt).toLocaleDateString('fr-FR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  return (
    <article className="prose-legal mx-auto max-w-3xl">
      <h1 className="font-display text-3xl font-semibold tracking-tight text-ink sm:text-4xl">
        {doc.title}
      </h1>
      <p className="mt-2 text-sm text-ink-faded">Dernière mise à jour : {formattedDate}</p>

      <div className="mt-8 space-y-4">
        {doc.intro.map((p, i) => (
          <p key={i} className="text-ink-muted">
            {p}
          </p>
        ))}
      </div>

      <div className="mt-10 space-y-10">
        {doc.sections.map((section, si) => (
          <section key={si}>
            <h2 className="font-display text-xl font-semibold text-ink">{section.heading}</h2>
            <SectionBody body={section.body} />
          </section>
        ))}
      </div>
    </article>
  );
}

function SectionBody({ body }: { body: string[] }) {
  const blocks: Array<{ type: 'p'; text: string } | { type: 'ul'; items: string[] }> = [];
  for (const line of body) {
    if (line.startsWith('- ')) {
      const last = blocks[blocks.length - 1];
      if (last && last.type === 'ul') last.items.push(line.slice(2));
      else blocks.push({ type: 'ul', items: [line.slice(2)] });
    } else {
      blocks.push({ type: 'p', text: line });
    }
  }

  return (
    <div className="mt-3 space-y-3">
      {blocks.map((block, i) =>
        block.type === 'p' ? (
          <p key={i} className="text-ink-muted">
            {block.text}
          </p>
        ) : (
          <ul key={i} className="list-disc space-y-1 ps-6 text-ink-muted">
            {block.items.map((item, j) => (
              <li key={j}>{item}</li>
            ))}
          </ul>
        ),
      )}
    </div>
  );
}
