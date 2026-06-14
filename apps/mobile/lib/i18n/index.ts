import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import * as Localization from 'expo-localization';
import { I18nManager } from 'react-native';

import fr from './locales/fr.json';
import en from './locales/en.json';
import es from './locales/es.json';
import ar from './locales/ar.json';
import { getSavedLanguage, saveLanguage } from '../auth/secure-storage';

/** Supported app languages with their native label and text direction. */
export const LANGUAGES = [
  { code: 'fr', label: 'Français', rtl: false },
  { code: 'en', label: 'English', rtl: false },
  { code: 'es', label: 'Español', rtl: false },
  { code: 'ar', label: 'العربية', rtl: true },
] as const;

export type AppLanguage = (typeof LANGUAGES)[number]['code'];

const SUPPORTED: readonly string[] = LANGUAGES.map((l) => l.code);

/** True for right-to-left locales (Arabic). */
export function isRtlLocale(code: string): boolean {
  return LANGUAGES.find((l) => l.code === code)?.rtl ?? false;
}

function resolveDeviceLanguage(): AppLanguage {
  const deviceLang = Localization.getLocales()?.[0]?.languageCode ?? 'fr';
  return SUPPORTED.includes(deviceLang) ? (deviceLang as AppLanguage) : 'fr';
}

/**
 * Apply text direction for a language. Best-effort: the full layout flip only
 * takes effect after an app reload (a React Native constraint).
 */
function applyRtl(code: string): void {
  const shouldBeRTL = isRtlLocale(code);
  if (I18nManager.isRTL !== shouldBeRTL) {
    I18nManager.allowRTL(shouldBeRTL);
    I18nManager.forceRTL(shouldBeRTL);
  }
}

const initialLang = resolveDeviceLanguage();
applyRtl(initialLang);

void i18n.use(initReactI18next).init({
  compatibilityJSON: 'v3',
  lng: initialLang,
  fallbackLng: 'fr',
  resources: {
    fr: { translation: fr },
    en: { translation: en },
    es: { translation: es },
    ar: { translation: ar },
  },
  interpolation: {
    escapeValue: false,
  },
});

// Apply a persisted language override on top of the device default. Async and
// best-effort: a storage failure simply keeps the device language.
void (async () => {
  try {
    const saved = await getSavedLanguage();
    if (saved && SUPPORTED.includes(saved) && saved !== initialLang) {
      await i18n.changeLanguage(saved);
      applyRtl(saved);
    }
  } catch {
    /* keep device default */
  }
})();

/**
 * Change the app language: switch i18next (text updates live), persist the
 * choice and apply RTL. Returns `rtlChanged` — when true the caller should
 * prompt the user to restart the app so the RTL/LTR layout fully flips (there is
 * no expo-updates reload wired in V7-B; this is the standard RN limitation).
 */
export async function setAppLanguage(code: AppLanguage): Promise<{ rtlChanged: boolean }> {
  const wasRtl = I18nManager.isRTL;
  await i18n.changeLanguage(code);
  try {
    await saveLanguage(code);
  } catch {
    /* persistence best-effort */
  }
  applyRtl(code);
  return { rtlChanged: wasRtl !== isRtlLocale(code) };
}

export default i18n;
