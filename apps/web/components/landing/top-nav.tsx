'use client';

import { BookOpenText, Menu, X } from 'lucide-react';
import { Link } from '@/i18n/routing';
import { useEffect, useState } from 'react';

import { LanguageSwitcher } from '@/components/landing/language-switcher';

const ANCHOR_LINKS = [
  { href: '#features', label: 'Fonctionnalités' },
  { href: '#segments', label: 'Pour qui ?' },
  { href: '#pricing',  label: 'Tarifs' },
  { href: '#faq',      label: 'FAQ' },
];

export function TopNav() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    function onScroll() {
      setScrolled(window.scrollY > 80);
    }
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <header
      className={`sticky top-0 z-50 transition ${
        scrolled
          ? 'bg-navy-900/95 backdrop-blur-md text-white border-b border-white/5'
          : 'bg-transparent text-ink-900'
      }`}
    >
      <div className="container mx-auto flex h-16 items-center gap-6 px-4">
        <Link href="/" className="flex items-center gap-2">
          <span className="flex h-8 w-8 items-center justify-center rounded-md bg-gradient-to-br from-ambre-500 to-ambre-600 text-white">
            <BookOpenText className="h-4 w-4" aria-hidden="true" />
          </span>
          <span className="font-serif text-xl font-bold">Klasso</span>
        </Link>

        <nav className="ml-auto hidden md:flex items-center gap-6 text-sm">
          {ANCHOR_LINKS.map((l) => (
            <a key={l.href} href={l.href} className="opacity-90 hover:opacity-100">
              {l.label}
            </a>
          ))}
        </nav>

        <div className="ml-auto md:ml-0 flex items-center gap-3">
          <LanguageSwitcher />
          <Link href="/login" className="hidden md:inline text-sm opacity-90 hover:opacity-100">
            Connexion
          </Link>
          <a
            href="#demo-form"
            className="rounded-full bg-ambre-500 px-4 py-1.5 text-sm font-semibold text-white shadow-md hover:bg-ambre-600"
          >
            Démo gratuite →
          </a>
          <button
            type="button"
            aria-label="Ouvrir le menu"
            onClick={() => setMobileOpen((v) => !v)}
            className="md:hidden p-2"
          >
            {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {mobileOpen && (
        <div className="md:hidden bg-navy-900 text-white px-4 pb-4 space-y-3">
          {ANCHOR_LINKS.map((l) => (
            <a key={l.href} href={l.href} onClick={() => setMobileOpen(false)} className="block py-2">
              {l.label}
            </a>
          ))}
          <Link href="/login" onClick={() => setMobileOpen(false)} className="block py-2">
            Connexion
          </Link>
        </div>
      )}
    </header>
  );
}
