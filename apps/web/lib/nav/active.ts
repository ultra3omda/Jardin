/**
 * Vrai si `href` correspond au `pathname` courant. Compare au niveau du segment
 * (après le préfixe de locale) pour éviter le faux positif `/absence` ⊂ `/absences`.
 */
export function isItemActive(pathname: string, href: string): boolean {
  // retire le préfixe de locale: /fr/students -> /students
  const path = pathname.replace(/^\/[a-z]{2}(?=\/|$)/, '') || '/';
  if (path === href) return true;
  return path.startsWith(href + '/');
}
