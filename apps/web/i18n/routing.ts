import { createNavigation } from 'next-intl/navigation';
import { defineRouting } from 'next-intl/routing';

import { defaultLocale, locales } from '@/i18n';

/**
 * V0 Landing — next-intl v4 routing helpers.
 * Re-export from this module instead of next/link to get locale-aware navigation.
 *
 * Usage:
 *   import Link from '@/i18n/routing'  — locale-aware <Link>
 *   import { useRouter, usePathname } from '@/i18n/routing'  — locale-aware hooks
 */
export const routing = defineRouting({
  locales: [...locales],
  defaultLocale,
  localePrefix: 'always',
});

export const { Link, redirect, usePathname, useRouter, getPathname } =
  createNavigation(routing);
